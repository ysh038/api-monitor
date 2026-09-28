package io.github.ysh038.apimonitor.support;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Supplier;

import io.github.ysh038.apimonitor.ApiMonitorProperties;

/** 인바운드/아웃바운드 캡처가 공유하는 설정·이벤트 처리기·마스킹. */
public final class MonitorContext {

    private final ApiMonitorProperties props;
    private final EventPipeline pipeline;
    private final Sanitizer sanitizer;
    private final String serviceName;
    private final String instanceId;

    public MonitorContext(ApiMonitorProperties props, EventPipeline pipeline, String serviceName, String instanceId) {
        this.props = props;
        this.pipeline = pipeline;
        this.sanitizer = new Sanitizer(props);
        this.serviceName = serviceName;
        this.instanceId = instanceId;
    }

    public ApiMonitorProperties props() {
        return props;
    }

    /** 기록할 곳이 있는지. false 면 캡처를 건너뛴다. */
    public boolean isActive() {
        return pipeline.isActive();
    }

    /** 이벤트 생성(마스킹·직렬화 포함)은 처리 스레드에서 수행된다. */
    public void submit(Supplier<Map<String, Object>> eventSupplier) {
        pipeline.submit(eventSupplier);
    }

    public String serviceName() {
        return serviceName;
    }

    public Sanitizer sanitizer() {
        return sanitizer;
    }

    public Map<String, Object> newEvent(String kind) {
        Map<String, Object> e = new LinkedHashMap<>();
        e.put("schemaVersion", 1);
        e.put("kind", kind);
        e.put("serviceName", serviceName);
        e.put("instanceId", instanceId);
        return e;
    }
}
