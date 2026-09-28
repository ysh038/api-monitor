package io.github.ysh038.apimonitor.support;

import java.util.LinkedHashMap;
import java.util.Map;

import io.github.ysh038.apimonitor.ApiMonitorProperties;

/** 인바운드/아웃바운드 캡처가 공유하는 설정·전송기·마스킹. */
public final class MonitorContext {

    private final ApiMonitorProperties props;
    private final MonitorSender sender;
    private final Sanitizer sanitizer;
    private final String serviceName;
    private final String instanceId;

    public MonitorContext(ApiMonitorProperties props, MonitorSender sender, String serviceName, String instanceId) {
        this.props = props;
        this.sender = sender;
        this.sanitizer = new Sanitizer(props);
        this.serviceName = serviceName;
        this.instanceId = instanceId;
    }

    public ApiMonitorProperties props() {
        return props;
    }

    public MonitorSender sender() {
        return sender;
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
