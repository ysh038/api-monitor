package io.github.ysh038.apimonitor;

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

import io.github.ysh038.apimonitor.inbound.ApiMonitorExceptionResolver;
import io.github.ysh038.apimonitor.inbound.ApiMonitorFilter;
import io.github.ysh038.apimonitor.outbound.ApiMonitorClientInterceptor;
import io.github.ysh038.apimonitor.outbound.HttpClientInstrumentingPostProcessor;
import io.github.ysh038.apimonitor.support.MonitorContext;
import io.github.ysh038.apimonitor.support.MonitorSender;

import jakarta.servlet.DispatcherType;

/**
 * 의존성만 추가하면 동작하는 자동 설정.
 * api-monitor.endpoint가 없으면 같은 서버의 대시보드를 자동으로 찾고, 찾기 전까지는 캡처를 건너뛴다.
 * api-monitor.enabled=false면 아무 빈도 등록하지 않는다.
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
    public MonitorSender apiMonitorSender(ApiMonitorProperties props) {
        return new MonitorSender(props);
    }

    @Bean
    public MonitorContext apiMonitorContext(ApiMonitorProperties props, MonitorSender sender, Environment env) {
        String serviceName = firstText(props.getServiceName(), env.getProperty("spring.application.name"), "unknown-service");
        String instanceId = firstText(props.getInstanceId(), System.getenv("HOSTNAME"), null);
        log.info("[api-monitor] 활성화: service={}, outbound={}", serviceName, props.getOutbound().isEnabled());
        return new MonitorContext(props, sender, serviceName, instanceId);
    }

    @Bean
    public FilterRegistrationBean<ApiMonitorFilter> apiMonitorFilterRegistration(MonitorContext ctx) {
        FilterRegistrationBean<ApiMonitorFilter> reg = new FilterRegistrationBean<>(new ApiMonitorFilter(ctx));
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
