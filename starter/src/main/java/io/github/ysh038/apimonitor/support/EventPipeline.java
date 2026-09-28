package io.github.ysh038.apimonitor.support;

import java.util.Map;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import io.github.ysh038.apimonitor.store.LocalStore;

/**
 * 캡처한 이벤트를 요청 스레드 밖에서 처리한다.
 * 전용 스레드 1개가 이벤트 생성(마스킹·직렬화) → 내장 저장소 기록 → (설정된 경우) 별도 대시보드 전송 순으로 처리한다.
 * 대기열이 가득 차면 새 이벤트는 버린다 (요청 처리에 영향 없음).
 */
public class EventPipeline implements AutoCloseable {

    private static final Logger log = LoggerFactory.getLogger(EventPipeline.class);

    private final LocalStore store;
    private final MonitorSender remote;
    private final ThreadPoolExecutor worker;
    private final AtomicLong dropped = new AtomicLong();

    /**
     * @param store  내장 대시보드 저장소 (끄면 null)
     * @param remote 별도 대시보드 전송기 (설정하지 않으면 null)
     */
    public EventPipeline(LocalStore store, MonitorSender remote, int queueCapacity) {
        this.store = store;
        this.remote = remote;
        this.worker = new ThreadPoolExecutor(1, 1, 0L, TimeUnit.MILLISECONDS,
                new ArrayBlockingQueue<>(Math.max(1, queueCapacity)),
                r -> {
                    Thread t = new Thread(r, "api-monitor-worker");
                    t.setDaemon(true);
                    return t;
                },
                (r, ex) -> dropped.incrementAndGet());
    }

    /** 내장 대시보드 저장소 (끄면 null). */
    public LocalStore store() {
        return store;
    }

    /** 기록할 곳이 있는지. false 면 필터·인터셉터가 캡처를 건너뛴다. */
    public boolean isActive() {
        return store != null || (remote != null && remote.isActive());
    }

    public void submit(Supplier<Map<String, Object>> eventSupplier) {
        if (!isActive()) {
            return;
        }
        try {
            worker.execute(() -> process(eventSupplier));
        } catch (RejectedExecutionException e) {
            dropped.incrementAndGet();
        }
    }

    private void process(Supplier<Map<String, Object>> eventSupplier) {
        try {
            Map<String, Object> event = eventSupplier.get();
            String json = Json.write(event);
            if (store != null) {
                store.add(event, json);
            }
            if (remote != null && remote.isActive()) {
                remote.sendJson(json);
            }
        } catch (Throwable t) {
            log.debug("[api-monitor] 이벤트 처리 실패 (버림): {}", t.toString());
        }
    }

    public long droppedCount() {
        return dropped.get();
    }

    @Override
    public void close() {
        worker.shutdown();
        try {
            worker.awaitTermination(2, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        worker.shutdownNow();
        if (store != null) {
            store.close();
        }
        if (remote != null) {
            remote.close();
        }
    }
}
