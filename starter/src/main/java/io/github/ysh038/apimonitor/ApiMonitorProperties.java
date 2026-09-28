package io.github.ysh038.apimonitor;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * api-monitor.* 설정. endpoint 외에는 모두 기본값이 있다.
 * 환경변수로도 덮어쓸 수 있다 (예: API_MONITOR_ENDPOINT, API_MONITOR_SERVICE_NAME).
 */
@ConfigurationProperties(prefix = "api-monitor")
public class ApiMonitorProperties {

    /** false면 스타터 전체 비활성화. */
    private boolean enabled = true;

    /**
     * 기록 저장 폴더. 상대경로면 앱 실행 폴더 기준 (도커 이미지는 보통 WORKDIR 아래).
     * 재배포 후에도 남기려면 이 폴더를 볼륨으로 연결한다. 비우면 파일 없이 메모리에만 보관한다.
     */
    private String storageDir = "api-monitor-data";

    /** 저장 파일 보관 일수. */
    private int retentionDays = 30;

    /** 대시보드에서 조회할 수 있도록 메모리에 두는 최근 기록 수. */
    private int maxEventsInMemory = 5000;

    private final Dashboard dashboard = new Dashboard();

    /**
     * (선택) 별도 대시보드 서버 수신 주소. 예: http://192.168.0.10:8090/ingest.
     * 지정하면 내장 대시보드와 함께 이 서버로도 보낸다. 여러 서버의 기록을 한곳에 모을 때 사용.
     */
    private String endpoint;

    /** (선택) endpoint 없이 같은 서버의 별도 대시보드(8090)를 자동으로 찾아 보낸다. */
    private boolean discoveryEnabled = false;

    /** 자동 탐색 시 찾을 별도 대시보드 포트 (호스트에 공개된 포트). */
    private int discoveryPort = 8090;

    /** 별도 대시보드를 못 찾았을 때 다시 찾는 주기. */
    private Duration discoveryInterval = Duration.ofSeconds(10);

    public static class Dashboard {
        /** 앱 안의 대시보드 화면을 연다. */
        private boolean enabled = true;
        /** 대시보드 경로 (context-path 아래). */
        private String path = "/_api-monitor";

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public String getPath() { return path; }
        public void setPath(String path) { this.path = path; }
    }

    /** 대시보드에 표시될 서비스 이름. 비어 있으면 spring.application.name을 쓴다. */
    private String serviceName;

    /** 같은 서비스의 인스턴스 구분값. 비어 있으면 HOSTNAME(컨테이너 ID)을 쓴다. */
    private String instanceId;

    /** 요청/응답 바디 저장 최대 크기(byte). 넘으면 앞부분만 저장한다. */
    private int maxBodyBytes = 10_000;

    /** 기록하지 않을 경로 (Ant 패턴, context-path 제외). */
    private List<String> excludePaths = new ArrayList<>(List.of("/actuator/**", "/health", "/favicon.ico"));

    /** 값을 가릴 헤더 이름 (대소문자 무시, 정확히 일치). */
    private List<String> maskHeaders = new ArrayList<>(List.of(
            "authorization", "proxy-authorization", "cookie", "set-cookie", "x-api-key", "x-auth-token"));

    /** 이 단어가 이름에 포함된 JSON 필드·폼 파라미터·쿼리 파라미터·헤더 값을 가린다 (대소문자 무시). */
    private List<String> maskFields = new ArrayList<>(List.of(
            "password", "passwd", "secret", "token", "apikey", "api-key", "api_key", "credential"));

    /** requestId를 주고받는 헤더. 들어온 요청에 있으면 재사용하고, 외부 호출에 전파한다. */
    private String requestIdHeader = "X-Request-Id";

    /** requestId를 찾을 MDC 키. 앱이 이미 MDC에 넣고 있으면 그 값을 그대로 쓴다. */
    private String mdcKey = "requestId";

    /** 별도 대시보드 서버에 보낼 X-Api-Key (서버에 INGEST_API_KEY를 설정한 경우에만 필요). */
    private String apiKey;

    /** 전송 타임아웃. 넘으면 버린다. */
    private Duration timeout = Duration.ofSeconds(2);

    /** 전송 전용 스레드 수. */
    private int senderThreads = 2;

    /** 처리·전송 대기열 크기. 가득 차면 새 기록을 버린다. */
    private int queueCapacity = 1000;

    private final Outbound outbound = new Outbound();

    public static class Outbound {
        /** RestClient/RestTemplate 빈으로 나가는 외부 호출도 기록한다. */
        private boolean enabled = true;
        /** 외부 호출에 requestId 헤더를 붙인다 (상대 서버 로그와 연결용). */
        private boolean propagateRequestId = true;
        /** 기록하지 않을 대상 호스트 (host 또는 host:port). */
        private List<String> excludeHosts = new ArrayList<>();

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public boolean isPropagateRequestId() { return propagateRequestId; }
        public void setPropagateRequestId(boolean propagateRequestId) { this.propagateRequestId = propagateRequestId; }
        public List<String> getExcludeHosts() { return excludeHosts; }
        public void setExcludeHosts(List<String> excludeHosts) { this.excludeHosts = excludeHosts; }
    }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
    public String getStorageDir() { return storageDir; }
    public void setStorageDir(String storageDir) { this.storageDir = storageDir; }
    public int getRetentionDays() { return retentionDays; }
    public void setRetentionDays(int retentionDays) { this.retentionDays = retentionDays; }
    public int getMaxEventsInMemory() { return maxEventsInMemory; }
    public void setMaxEventsInMemory(int maxEventsInMemory) { this.maxEventsInMemory = maxEventsInMemory; }
    public Dashboard getDashboard() { return dashboard; }
    public boolean isDiscoveryEnabled() { return discoveryEnabled; }
    public void setDiscoveryEnabled(boolean discoveryEnabled) { this.discoveryEnabled = discoveryEnabled; }
    public int getDiscoveryPort() { return discoveryPort; }
    public void setDiscoveryPort(int discoveryPort) { this.discoveryPort = discoveryPort; }
    public Duration getDiscoveryInterval() { return discoveryInterval; }
    public void setDiscoveryInterval(Duration discoveryInterval) { this.discoveryInterval = discoveryInterval; }
    public String getServiceName() { return serviceName; }
    public void setServiceName(String serviceName) { this.serviceName = serviceName; }
    public String getInstanceId() { return instanceId; }
    public void setInstanceId(String instanceId) { this.instanceId = instanceId; }
    public int getMaxBodyBytes() { return maxBodyBytes; }
    public void setMaxBodyBytes(int maxBodyBytes) { this.maxBodyBytes = maxBodyBytes; }
    public List<String> getExcludePaths() { return excludePaths; }
    public void setExcludePaths(List<String> excludePaths) { this.excludePaths = excludePaths; }
    public List<String> getMaskHeaders() { return maskHeaders; }
    public void setMaskHeaders(List<String> maskHeaders) { this.maskHeaders = maskHeaders; }
    public List<String> getMaskFields() { return maskFields; }
    public void setMaskFields(List<String> maskFields) { this.maskFields = maskFields; }
    public String getRequestIdHeader() { return requestIdHeader; }
    public void setRequestIdHeader(String requestIdHeader) { this.requestIdHeader = requestIdHeader; }
    public String getMdcKey() { return mdcKey; }
    public void setMdcKey(String mdcKey) { this.mdcKey = mdcKey; }
    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }
    public Duration getTimeout() { return timeout; }
    public void setTimeout(Duration timeout) { this.timeout = timeout; }
    public int getSenderThreads() { return senderThreads; }
    public void setSenderThreads(int senderThreads) { this.senderThreads = senderThreads; }
    public int getQueueCapacity() { return queueCapacity; }
    public void setQueueCapacity(int queueCapacity) { this.queueCapacity = queueCapacity; }
    public Outbound getOutbound() { return outbound; }
}
