package io.github.ysh038.apimonitor.inbound;

import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;

import io.github.ysh038.apimonitor.dashboard.DashboardEndpoint;
import io.github.ysh038.apimonitor.support.BodyCapture;
import io.github.ysh038.apimonitor.support.ExceptionInfo;
import io.github.ysh038.apimonitor.support.MonitorContext;
import io.github.ysh038.apimonitor.support.RequestIdContext;
import io.github.ysh038.apimonitor.support.Sanitizer;

import jakarta.servlet.AsyncEvent;
import jakarta.servlet.AsyncListener;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * 들어온 요청 하나를 감싸 요청/응답/예외를 캡처한다.
 * Spring Security 필터 체인보다 앞에 등록되므로 인증 실패(401/403)도 기록된다.
 * 캡처·전송에서 나는 어떤 오류도 원래 요청 처리에 전파하지 않는다.
 */
public class ApiMonitorFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(ApiMonitorFilter.class);

    private final MonitorContext ctx;
    private final DashboardEndpoint dashboard;
    private final List<String> excludePaths;
    private final AntPathMatcher matcher = new AntPathMatcher();

    /** @param dashboard 내장 대시보드 (끄면 null) */
    public ApiMonitorFilter(MonitorContext ctx, DashboardEndpoint dashboard) {
        this.ctx = ctx;
        this.dashboard = dashboard;
        this.excludePaths = ctx.props().getExcludePaths() == null ? List.of() : ctx.props().getExcludePaths();
    }

    private static String pathWithinApp(HttpServletRequest request) {
        String path = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isEmpty() && path.startsWith(contextPath)) {
            path = path.substring(contextPath.length());
        }
        return path.isEmpty() ? "/" : path;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = pathWithinApp(request);
        if (dashboard != null && dashboard.matches(path)) {
            return false; // 대시보드 요청은 doFilterInternal 에서 직접 응답
        }
        for (String pattern : excludePaths) {
            if (matcher.match(pattern, path)) {
                return true;
            }
        }
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (dashboard != null) {
            String path = pathWithinApp(request);
            if (dashboard.matches(path)) {
                // Spring Security·컨트롤러보다 먼저 직접 응답한다 (대시보드 요청은 기록하지 않음)
                dashboard.handle(request, response, path);
                return;
            }
        }
        if (!ctx.isActive()) {
            // 대시보드를 아직 못 찾았으면 아무것도 하지 않는다
            chain.doFilter(request, response);
            return;
        }
        final long timestamp = System.currentTimeMillis();
        final long startNanos = System.nanoTime();
        final String mdcKey = ctx.props().getMdcKey();
        final String requestId = resolveRequestId(request, mdcKey);
        final boolean putMdc = mdcKey != null && MDC.get(mdcKey) == null;
        if (putMdc) {
            MDC.put(mdcKey, requestId);
        }
        RequestIdContext.set(requestId);

        final int limit = Math.max(0, ctx.props().getMaxBodyBytes());
        final boolean multipart = Sanitizer.isMultipart(request.getContentType());
        HttpServletRequest req = multipart ? request : new ContentCachingRequestWrapper(request, limit);
        CapturingResponseWrapper res = new CapturingResponseWrapper(response, limit);

        Throwable thrown = null;
        try {
            chain.doFilter(req, res);
        } catch (IOException | ServletException | RuntimeException | Error e) {
            thrown = e;
            throw e;
        } finally {
            RequestIdContext.clear();
            if (putMdc) {
                MDC.remove(mdcKey);
            }
            try {
                Exchange ex = new Exchange(requestId, timestamp, startNanos, req, res, multipart, limit);
                if (thrown == null && req.isAsyncStarted()) {
                    // SSE·DeferredResult 등: 비동기 처리가 끝날 때 기록한다.
                    req.getAsyncContext().addListener(new CompletionListener(ex));
                } else {
                    ex.finish(thrown, false);
                }
            } catch (Throwable t) {
                log.debug("[api-monitor] 캡처 실패 (무시): {}", t.toString());
            }
        }
    }

    private String resolveRequestId(HttpServletRequest request, String mdcKey) {
        String id = mdcKey == null ? null : MDC.get(mdcKey);
        if (id == null || id.isBlank()) {
            String header = ctx.props().getRequestIdHeader();
            id = header == null ? null : request.getHeader(header);
        }
        return (id == null || id.isBlank()) ? UUID.randomUUID().toString() : id;
    }

    /** 요청 하나의 캡처 상태. 요청 객체는 완료 후 재활용되므로 finish에서 필요한 값을 모두 복사한다. */
    private final class Exchange {
        private final String requestId;
        private final long timestamp;
        private final long startNanos;
        private final HttpServletRequest req;
        private final CapturingResponseWrapper res;
        private final boolean multipart;
        private final int limit;
        private final AtomicBoolean done = new AtomicBoolean();

        Exchange(String requestId, long timestamp, long startNanos, HttpServletRequest req,
                 CapturingResponseWrapper res, boolean multipart, int limit) {
            this.requestId = requestId;
            this.timestamp = timestamp;
            this.startNanos = startNanos;
            this.req = req;
            this.res = res;
            this.multipart = multipart;
            this.limit = limit;
        }

        void finish(Throwable thrown, boolean async) {
            if (!done.compareAndSet(false, true)) {
                return;
            }
            final long durationMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);
            final Sanitizer s = ctx.sanitizer();

            // 예외: 리졸버가 기록한 것(앱이 처리함) 우선, 없으면 필터 밖으로 던져진 것
            Throwable resolved = (Throwable) req.getAttribute(ApiMonitorExceptionResolver.EXCEPTION_ATTRIBUTE);
            Throwable ex0 = resolved != null ? resolved : thrown;
            // Spring은 핸들러에서 난 Error를 ServletException("Handler dispatch failed")으로 감싼다 → 원래 Error를 보여준다
            if (ex0 instanceof ServletException && ex0.getCause() instanceof Error) {
                ex0 = ex0.getCause();
            }
            final Throwable exception = ex0;
            // 리졸버를 거쳤어도 처리할 핸들러가 없어 다시 던져졌다면 미처리 예외다
            final boolean handled = resolved != null && thrown == null;

            int status = res.getStatus();
            if (thrown != null && !res.isCommitted()) {
                status = 500; // 컨테이너가 500으로 응답한다
            }

            final String method = req.getMethod();
            final String path = s.pathWithQuery(req.getRequestURI(), req.getQueryString());
            final String clientIp = clientIp(req);
            final Map<String, Object> reqHeaders = s.newHeaderMap();
            for (String name : Collections.list(req.getHeaderNames())) {
                s.putHeader(reqHeaders, name, Collections.list(req.getHeaders(name)));
            }
            final Map<String, Object> resHeaders = s.newHeaderMap();
            if (res.getContentType() != null) {
                s.putHeader(resHeaders, "Content-Type", List.of(res.getContentType()));
            }
            for (String name : res.getHeaderNames()) {
                if (!"content-type".equalsIgnoreCase(name)) {
                    s.putHeader(resHeaders, name, res.getHeaders(name));
                }
            }
            final String reqContentType = req.getContentType();
            final String reqEncoding = req.getCharacterEncoding();
            final String resContentType = res.getContentType();
            // 응답의 getCharacterEncoding()은 지정이 없으면 ISO-8859-1을 돌려주므로 쓰지 않는다 (Content-Type의 charset 또는 UTF-8)
            final String resEncoding = null;
            final long reqContentLength = req.getContentLengthLong();
            final BodyCapture.Snapshot reqBody = multipart ? null : requestBody();
            final BodyCapture.Snapshot resBody = res.capture().snapshot();
            final int statusCode = status;

            ctx.submit(() -> {
                Map<String, Object> e = ctx.newEvent("INBOUND");
                e.put("requestId", requestId);
                e.put("method", method);
                e.put("path", path);
                e.put("requestHeaders", reqHeaders);
                if (multipart) {
                    e.put("requestBody", Sanitizer.multipartSummary(reqContentType, reqContentLength));
                } else {
                    e.put("requestBody", s.body(reqBody, reqContentType, reqEncoding));
                    e.put("requestBodyTruncated", reqBody != null && reqBody.truncated());
                }
                e.put("statusCode", statusCode);
                e.put("responseHeaders", resHeaders);
                e.put("responseBody", s.body(resBody, resContentType, resEncoding));
                e.put("responseBodyTruncated", resBody.truncated());
                e.put("durationMs", durationMs);
                e.put("clientIp", clientIp);
                e.put("timestamp", timestamp);
                e.put("async", async);
                if (exception != null) {
                    e.put("exception", ExceptionInfo.describe(exception, handled));
                }
                return e;
            });
        }

        /** 앱이 읽은 만큼 캐시된 바디. 앱이 읽지 않았으면(예: 인증 실패로 거부) 남은 부분을 limit까지 읽어 둔다. */
        private BodyCapture.Snapshot requestBody() {
            if (!(req instanceof ContentCachingRequestWrapper wrapper)) {
                return null;
            }
            byte[] cached = wrapper.getContentAsByteArray();
            long declared = req.getContentLengthLong();
            if (cached.length < limit && declared != 0 && Sanitizer.isTextual(req.getContentType())
                    && !req.isAsyncStarted()) {
                try {
                    InputStream in = wrapper.getInputStream();
                    byte[] buf = new byte[Math.min(8192, limit)];
                    int remaining = limit - cached.length;
                    int n;
                    while (remaining > 0 && (n = in.read(buf, 0, Math.min(buf.length, remaining))) > 0) {
                        remaining -= n;
                    }
                    cached = wrapper.getContentAsByteArray();
                } catch (Exception ignored) {
                    // 이미 getReader로 읽었거나 스트림이 닫힌 경우
                }
            }
            long total = Math.max(declared, cached.length);
            BodyCapture capture = new BodyCapture(limit);
            capture.write(cached, 0, cached.length);
            BodyCapture.Snapshot snap = capture.snapshot();
            return new BodyCapture.Snapshot(snap.bytes(), snap.chars(), total, total > cached.length);
        }
    }

    private final class CompletionListener implements AsyncListener {
        private final Exchange exchange;
        private volatile Throwable error;

        CompletionListener(Exchange exchange) {
            this.exchange = exchange;
        }

        @Override
        public void onComplete(AsyncEvent event) {
            safeFinish();
        }

        @Override
        public void onTimeout(AsyncEvent event) {
            // 타임아웃 뒤에도 onComplete가 호출된다
        }

        @Override
        public void onError(AsyncEvent event) {
            error = event.getThrowable();
        }

        @Override
        public void onStartAsync(AsyncEvent event) {
            event.getAsyncContext().addListener(this);
        }

        private void safeFinish() {
            try {
                exchange.finish(error, true);
            } catch (Throwable t) {
                log.debug("[api-monitor] 비동기 캡처 실패 (무시): {}", t.toString());
            }
        }
    }

    private static String clientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            int comma = xff.indexOf(',');
            return (comma < 0 ? xff : xff.substring(0, comma)).trim();
        }
        String real = req.getHeader("X-Real-IP");
        return (real != null && !real.isBlank()) ? real.trim() : req.getRemoteAddr();
    }
}
