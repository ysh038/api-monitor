package io.github.ysh038.apimonitor.support;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import io.github.ysh038.apimonitor.ApiMonitorProperties;

/**
 * 모니터링 서버로 이벤트를 fire-and-forget 전송한다.
 * - 요청 스레드는 큐에 넣기만 하고 바로 돌아간다 (직렬화·마스킹도 전송 스레드에서).
 * - 큐가 가득 차거나, 서버가 꺼져 있거나, 타임아웃이면 재시도 없이 버린다.
 * - 실패는 DEBUG 로그만 남기고 예외를 던지지 않는다.
 * - endpoint를 설정하지 않았으면 같은 서버의 대시보드를 자동으로 찾고, 찾기 전까지는 캡처 자체를 건너뛴다.
 */
public class MonitorSender implements AutoCloseable {

    private static final Logger log = LoggerFactory.getLogger(MonitorSender.class);
    /** 자동 탐색으로 찾은 대시보드에 연속 이만큼 실패하면 다시 찾는다. */
    private static final int REDISCOVER_AFTER_FAILURES = 10;

    private final boolean explicitEndpoint;
    private final String apiKey;
    private final Duration timeout;
    private final HttpClient client;
    private final ThreadPoolExecutor executor;
    private final ScheduledExecutorService discovery;
    private final DashboardLocator locator;
    private final AtomicLong dropped = new AtomicLong();
    private final AtomicLong failed = new AtomicLong();
    private final AtomicInteger consecutiveFailures = new AtomicInteger();
    private volatile URI endpoint;
    private volatile boolean notFoundLogged;

    public MonitorSender(ApiMonitorProperties props) {
        String configured = props.getEndpoint() == null ? "" : props.getEndpoint().trim();
        this.explicitEndpoint = !configured.isEmpty();
        this.endpoint = explicitEndpoint ? URI.create(configured) : null;
        this.apiKey = props.getApiKey();
        this.timeout = props.getTimeout();
        int threads = Math.max(1, props.getSenderThreads());
        AtomicInteger seq = new AtomicInteger();
        this.executor = new ThreadPoolExecutor(threads, threads, 0L, TimeUnit.MILLISECONDS,
                new ArrayBlockingQueue<>(Math.max(1, props.getQueueCapacity())),
                r -> daemon(r, "api-monitor-sender-" + seq.incrementAndGet()),
                (r, ex) -> dropped.incrementAndGet());
        this.client = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(timeout)
                .build();

        if (explicitEndpoint) {
            this.locator = null;
            this.discovery = null;
            log.info("[api-monitor] 대시보드 주소(설정값): {}", endpoint);
        } else {
            this.locator = new DashboardLocator(props.getDiscoveryPort());
            this.discovery = Executors.newSingleThreadScheduledExecutor(r -> daemon(r, "api-monitor-discovery"));
            long interval = Math.max(5, props.getDiscoveryInterval().toSeconds());
            this.discovery.scheduleWithFixedDelay(this::discoverIfNeeded, 0, interval, TimeUnit.SECONDS);
        }
    }

    private static Thread daemon(Runnable r, String name) {
        Thread t = new Thread(r, name);
        t.setDaemon(true);
        return t;
    }

    private void discoverIfNeeded() {
        if (endpoint != null) {
            return;
        }
        try {
            URI found = locator.locate();
            if (found != null) {
                consecutiveFailures.set(0);
                endpoint = found;
                notFoundLogged = false;
                log.info("[api-monitor] 대시보드 연결: {}", found);
            } else if (!notFoundLogged) {
                notFoundLogged = true;
                log.info("[api-monitor] 대시보드를 찾지 못했습니다. 주기적으로 다시 찾습니다. (후보: {})", locator.candidates());
            }
        } catch (Throwable t) {
            log.debug("[api-monitor] 대시보드 탐색 실패: {}", t.toString());
        }
    }

    /** 보낼 곳이 정해져 있는지. false면 필터·인터셉터가 캡처를 건너뛴다. */
    public boolean isActive() {
        return endpoint != null;
    }

    /** 이벤트 생성(직렬화 포함)까지 전송 스레드에서 수행한다. */
    public void send(Supplier<Map<String, Object>> eventSupplier) {
        if (endpoint == null) {
            return;
        }
        try {
            executor.execute(() -> doSend(eventSupplier));
        } catch (RejectedExecutionException e) {
            dropped.incrementAndGet();
        }
    }

    private void doSend(Supplier<Map<String, Object>> eventSupplier) {
        URI target = endpoint;
        if (target == null) {
            return;
        }
        try {
            String body = Json.write(eventSupplier.get());
            HttpRequest.Builder req = HttpRequest.newBuilder(target)
                    .timeout(timeout)
                    .header("Content-Type", "application/json; charset=utf-8")
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8));
            if (apiKey != null && !apiKey.isBlank()) {
                req.header("X-Api-Key", apiKey);
            }
            HttpResponse<Void> res = client.send(req.build(), HttpResponse.BodyHandlers.discarding());
            if (res.statusCode() >= 300) {
                onFailure(target, "HTTP " + res.statusCode());
            } else {
                consecutiveFailures.set(0);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Throwable e) {
            onFailure(target, e.toString());
        }
    }

    private void onFailure(URI target, String reason) {
        failed.incrementAndGet();
        log.debug("[api-monitor] 전송 실패 (버림): {}", reason);
        if (!explicitEndpoint && consecutiveFailures.incrementAndGet() >= REDISCOVER_AFTER_FAILURES && endpoint == target) {
            endpoint = null;
            consecutiveFailures.set(0);
            log.info("[api-monitor] 대시보드 연결이 끊겼습니다. 다시 찾습니다: {}", target);
        }
    }

    public long droppedCount() {
        return dropped.get();
    }

    public long failedCount() {
        return failed.get();
    }

    @Override
    public void close() {
        if (discovery != null) {
            discovery.shutdownNow();
        }
        executor.shutdown();
        try {
            executor.awaitTermination(timeout.toMillis() + 500, TimeUnit.MILLISECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        executor.shutdownNow();
    }
}
