package io.github.ysh038.apimonitor;

import java.nio.file.Path;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.env.Environment;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.servlet.DispatcherServlet;

import io.github.ysh038.apimonitor.dashboard.DashboardEndpoint;
import io.github.ysh038.apimonitor.inbound.ApiMonitorExceptionResolver;
import io.github.ysh038.apimonitor.inbound.ApiMonitorFilter;
import io.github.ysh038.apimonitor.outbound.ApiMonitorClientInterceptor;
import io.github.ysh038.apimonitor.outbound.HttpClientInstrumentingPostProcessor;
import io.github.ysh038.apimonitor.store.LocalStore;
import io.github.ysh038.apimonitor.support.EventPipeline;
import io.github.ysh038.apimonitor.support.MonitorContext;
import io.github.ysh038.apimonitor.support.MonitorSender;

import jakarta.servlet.DispatcherType;

/**
 * 의존성만 추가하면 동작하는 자동 설정 (모든 프로젝트에서 같은 동작).
 * - 앱 안에 대시보드(/_api-monitor)를 열고, 기록은 api-monitor-data/ 에 날짜별 파일로 쌓는다.
 * - api-monitor.endpoint 를 지정하면 별도 대시보드 서버로도 보낸다.
 * - api-monitor.enabled=false 면 아무 빈도 등록하지 않는다.
 */
@AutoConfiguration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnClass(DispatcherServlet.class)
@ConditionalOnProperty(prefix = "api-monitor", name = "enabled", havingValue = "true", matchIfMissing = true)
@EnableConfigurationProperties(ApiMonitorProperties.class)
public class ApiMonitorAutoConfiguration {

    private static final Logger log = LoggerFactory.getLogger(ApiMonitorAutoConfiguration.class);

    /** 들어온 요청 필터 순서: 앱의 최우선 필터(requestId를 MDC에 넣는 필터 등) 바로 뒤, Spring Security(-100)보다 앞. */
    public static final int FILTER_ORDER = Ordered.HIGHEST_PRECEDENCE + 10;

    @Bean(destroyMethod = "close")
    public EventPipeline apiMonitorPipeline(ApiMonitorProperties props) {
        LocalStore store = null;
        if (props.getDashboard().isEnabled()) {
            Path dir = StringUtils.hasText(props.getStorageDir()) ? Path.of(props.getStorageDir().trim()) : null;
            store = new LocalStore(dir, props.getMaxEventsInMemory(), props.getRetentionDays());
        }
        MonitorSender remote = (StringUtils.hasText(props.getEndpoint()) || props.isDiscoveryEnabled())
                ? new MonitorSender(props) : null;
        return new EventPipeline(store, remote, props.getQueueCapacity());
    }

    /** 캡처 쪽(필터·인터셉터)이 공유하는 서비스 정보와 이벤트 처리기. */
    @Bean
    public MonitorContext apiMonitorContext(ApiMonitorProperties props, EventPipeline pipeline, Environment env) {
        String serviceName = firstText(props.getServiceName(), env.getProperty("spring.application.name"), "unknown-service");
        String instanceId = firstText(props.getInstanceId(), System.getenv("HOSTNAME"), null);
        return new MonitorContext(props, pipeline, serviceName, instanceId);
    }

    @Bean
    public FilterRegistrationBean<ApiMonitorFilter> apiMonitorFilterRegistration(
            ApiMonitorProperties props, MonitorContext ctx, EventPipeline pipeline, Environment env) {
        DashboardEndpoint dashboard = pipeline.store() == null ? null
                : new DashboardEndpoint(props.getDashboard().getPath(), pipeline.store());

        String contextPath = env.getProperty("server.servlet.context-path", "");
        String storage = pipeline.store() == null ? "끔"
                : pipeline.store().directory() == null ? "메모리 (파일 저장 불가)" : pipeline.store().directory().toString();
        log.info("[api-monitor] 활성화: service={}, 대시보드: {}, 저장 위치: {}, 외부 전송: {}",
                ctx.serviceName(),
                dashboard == null ? "끔" : contextPath + dashboard.basePath(),
                storage,
                StringUtils.hasText(props.getEndpoint()) ? props.getEndpoint()
                        : props.isDiscoveryEnabled() ? "자동 탐색" : "없음");

        FilterRegistrationBean<ApiMonitorFilter> reg = new FilterRegistrationBean<>(new ApiMonitorFilter(ctx, dashboard));
        reg.setName("apiMonitorFilter");
        reg.setOrder(FILTER_ORDER);
        reg.setDispatcherTypes(DispatcherType.REQUEST);
        reg.addUrlPatterns("/*");
        return reg;
    }

    @Bean
    public ApiMonitorExceptionResolver apiMonitorExceptionResolver() {
        return new ApiMonitorExceptionResolver();
    }

    @Configuration(proxyBeanMethods = false)
    @ConditionalOnClass(RestClient.class)
    @ConditionalOnProperty(prefix = "api-monitor.outbound", name = "enabled", havingValue = "true", matchIfMissing = true)
    static class OutboundConfiguration {

        @Bean
        ApiMonitorClientInterceptor apiMonitorClientInterceptor(MonitorContext ctx) {
            return new ApiMonitorClientInterceptor(ctx);
        }

        @Bean
        static HttpClientInstrumentingPostProcessor apiMonitorHttpClientPostProcessor(
                ObjectProvider<ApiMonitorClientInterceptor> interceptor) {
            return new HttpClientInstrumentingPostProcessor(interceptor);
        }
    }

    private static String firstText(String... values) {
        for (String v : values) {
            if (StringUtils.hasText(v)) {
                return v.trim();
            }
        }
        return null;
    }
}
