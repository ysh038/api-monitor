package io.github.ysh038.apimonitor.outbound;

import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRequest;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;

import io.github.ysh038.apimonitor.support.BodyCapture;
import io.github.ysh038.apimonitor.support.ExceptionInfo;
import io.github.ysh038.apimonitor.support.MonitorContext;
import io.github.ysh038.apimonitor.support.RequestIdContext;
import io.github.ysh038.apimonitor.support.Sanitizer;

/**
 * RestClient/RestTemplate으로 나가는 호출을 기록한다.
 * 응답 바디는 버퍼링하지 않고 앱이 읽는 대로 흘려보내면서 앞부분만 복사하고,
 * 응답이 닫히는 시점(스트리밍이면 스트림 종료 시점)에 전송한다.
 */
public class ApiMonitorClientInterceptor implements ClientHttpRequestInterceptor {

    private static final Logger log = LoggerFactory.getLogger(ApiMonitorClientInterceptor.class);

    private final MonitorContext ctx;
    private final List<String> excludeHosts;

    public ApiMonitorClientInterceptor(MonitorContext ctx) {
        this.ctx = ctx;
        this.excludeHosts = ctx.props().getOutbound().getExcludeHosts().stream()
                .map(h -> h.toLowerCase(Locale.ROOT)).toList();
    }

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution)
            throws IOException {
        Call call;
        try {
            call = !ctx.isActive() || excluded(request.getURI()) ? null : begin(request, body);
        } catch (Throwable t) {
            log.debug("[api-monitor] 외부 호출 캡처 준비 실패 (무시): {}", t.toString());
            call = null;
        }
        if (call == null) {
            return execution.execute(request, body);
        }
        ClientHttpResponse response;
        try {
            response = execution.execute(request, body);
        } catch (IOException | RuntimeException e) {
            call.finish(null, null, null, e);
            throw e;
        }
        return new MonitoredResponse(response, call);
    }

    private boolean excluded(URI uri) {
        if (excludeHosts.isEmpty() || uri.getHost() == null) {
            return false;
        }
        String host = uri.getHost().toLowerCase(Locale.ROOT);
        String hostPort = uri.getPort() < 0 ? host : host + ":" + uri.getPort();
        return excludeHosts.contains(host) || excludeHosts.contains(hostPort);
    }

    private Call begin(HttpRequest request, byte[] body) {
        String parentId = RequestIdContext.current(ctx.props().getMdcKey());
        String header = ctx.props().getRequestIdHeader();
        if (ctx.props().getOutbound().isPropagateRequestId() && parentId != null && header != null
                && request.getHeaders().getFirst(header) == null) {
            request.getHeaders().set(header, parentId);
        }
        Sanitizer s = ctx.sanitizer();
        Map<String, Object> headers = s.newHeaderMap();
        request.getHeaders().forEach((name, values) -> s.putHeader(headers, name, values));
        String contentType = request.getHeaders().getFirst(HttpHeaders.CONTENT_TYPE);
        BodyCapture reqCapture = new BodyCapture(ctx.props().getMaxBodyBytes());
        if (body != null && body.length > 0) {
            reqCapture.write(body, 0, body.length);
        }
        return new Call(parentId, request.getMethod().name(), request.getURI(), headers, contentType, reqCapture.snapshot());
    }

    private final class Call {
        private final long timestamp = System.currentTimeMillis();
        private final long startNanos = System.nanoTime();
        private final String requestId = UUID.randomUUID().toString();
        private final String parentId;
        private final String method;
        private final URI uri;
        private final Map<String, Object> requestHeaders;
        private final String requestContentType;
        private final BodyCapture.Snapshot requestBody;
        private final AtomicBoolean done = new AtomicBoolean();

        Call(String parentId, String method, URI uri, Map<String, Object> requestHeaders,
             String requestContentType, BodyCapture.Snapshot requestBody) {
            this.parentId = parentId;
            this.method = method;
            this.uri = uri;
            this.requestHeaders = requestHeaders;
            this.requestContentType = requestContentType;
            this.requestBody = requestBody;
        }

        void finish(Integer status, HttpHeaders responseHeaders, BodyCapture responseBody, Throwable error) {
            if (!done.compareAndSet(false, true)) {
                return;
            }
            try {
                long durationMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);
                Sanitizer s = ctx.sanitizer();
                Map<String, Object> resHeaders = s.newHeaderMap();
                String resContentType = null;
                if (responseHeaders != null) {
                    responseHeaders.forEach((name, values) -> s.putHeader(resHeaders, name, values));
                    resContentType = responseHeaders.getFirst(HttpHeaders.CONTENT_TYPE);
                }
                final String resCt = resContentType;
                final BodyCapture.Snapshot resBody = responseBody == null ? null : responseBody.snapshot();
                ctx.submit(() -> {
                    Map<String, Object> e = ctx.newEvent("OUTBOUND");
                    e.put("requestId", requestId);
                    e.put("parentRequestId", parentId);
                    e.put("method", method);
                    e.put("targetHost", uri.getPort() < 0 ? uri.getHost() : uri.getHost() + ":" + uri.getPort());
                    e.put("path", s.pathWithQuery(uri.getRawPath() == null || uri.getRawPath().isEmpty() ? "/" : uri.getRawPath(),
                            uri.getRawQuery()));
                    e.put("requestHeaders", requestHeaders);
                    e.put("requestBody", s.body(requestBody, requestContentType, null));
                    e.put("requestBodyTruncated", requestBody.truncated());
                    e.put("statusCode", status);
                    e.put("responseHeaders", resHeaders);
                    e.put("responseBody", s.body(resBody, resCt, null));
                    e.put("responseBodyTruncated", resBody != null && resBody.truncated());
                    e.put("durationMs", durationMs);
                    e.put("timestamp", timestamp);
                    if (error != null) {
                        e.put("exception", ExceptionInfo.describe(error, false));
                    }
                    return e;
                });
            } catch (Throwable t) {
                log.debug("[api-monitor] 외부 호출 기록 실패 (무시): {}", t.toString());
            }
        }
    }

    /** 원래 응답을 감싸 바디를 흘려보내며 복사하고, close 시점에 기록한다. */
    private final class MonitoredResponse implements ClientHttpResponse {
        private final ClientHttpResponse delegate;
        private final Call call;
        private final BodyCapture capture = new BodyCapture(ctx.props().getMaxBodyBytes());
        private InputStream body;
        private volatile Throwable readError;

        MonitoredResponse(ClientHttpResponse delegate, Call call) {
            this.delegate = delegate;
            this.call = call;
        }

        @Override
        public HttpStatusCode getStatusCode() throws IOException {
            return delegate.getStatusCode();
        }

        @Override
        public String getStatusText() throws IOException {
            return delegate.getStatusText();
        }

        @Override
        public HttpHeaders getHeaders() {
            return delegate.getHeaders();
        }

        @Override
        public InputStream getBody() throws IOException {
            if (body == null) {
                body = new TeeInputStream(delegate.getBody());
            }
            return body;
        }

        @Override
        public void close() {
            try {
                delegate.close();
            } finally {
                Integer status = null;
                try {
                    status = delegate.getStatusCode().value();
                } catch (Throwable ignored) {
                    // 상태를 못 읽으면 null
                }
                HttpHeaders headers;
                try {
                    headers = delegate.getHeaders();
                } catch (Throwable t) {
                    headers = null;
                }
                call.finish(status, headers, capture, readError);
            }
        }

        private final class TeeInputStream extends FilterInputStream {
            TeeInputStream(InputStream in) {
                super(in);
            }

            @Override
            public int read() throws IOException {
                try {
                    int b = super.read();
                    if (b >= 0) {
                        capture.write(b);
                    }
                    return b;
                } catch (IOException e) {
                    readError = e;
                    throw e;
                }
            }

            @Override
            public int read(byte[] b, int off, int len) throws IOException {
                try {
                    int n = super.read(b, off, len);
                    if (n > 0) {
                        capture.write(b, off, n);
                    }
                    return n;
                } catch (IOException e) {
                    readError = e;
                    throw e;
                }
            }

            @Override
            public long skip(long n) throws IOException {
                return super.skip(n);
            }
        }
    }
}
