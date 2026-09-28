package io.github.ysh038.apimonitor.outbound;

import java.util.List;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestTemplate;

/**
 * 앱 코드 수정 없이 외부 호출을 기록하기 위해, 컨테이너에 등록되는
 * RestClient / RestClient.Builder / RestTemplate 빈에 인터셉터를 붙인다.
 * - RestClient는 불변이라 mutate()로 인터셉터만 추가한 복사본을 빈으로 돌려준다
 *   (baseUrl, requestFactory, 기본 헤더, 에러 핸들러 등 나머지 설정은 그대로 복사된다).
 * - 메서드 안에서 RestClient.create()/builder()로 즉석 생성한 클라이언트는 빈이 아니므로 대상이 아니다.
 */
public class HttpClientInstrumentingPostProcessor implements BeanPostProcessor {

    private final ObjectProvider<ApiMonitorClientInterceptor> interceptorProvider;

    public HttpClientInstrumentingPostProcessor(ObjectProvider<ApiMonitorClientInterceptor> interceptorProvider) {
        this.interceptorProvider = interceptorProvider;
    }

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) {
        if (bean instanceof RestClient client) {
            ApiMonitorClientInterceptor interceptor = interceptorProvider.getIfAvailable();
            return interceptor == null ? bean : client.mutate().requestInterceptors(list -> addOnce(list, interceptor)).build();
        }
        if (bean instanceof RestClient.Builder builder) {
            ApiMonitorClientInterceptor interceptor = interceptorProvider.getIfAvailable();
            if (interceptor != null) {
                builder.requestInterceptors(list -> addOnce(list, interceptor));
            }
            return bean;
        }
        if (bean instanceof RestTemplate template) {
            ApiMonitorClientInterceptor interceptor = interceptorProvider.getIfAvailable();
            if (interceptor != null) {
                addOnce(template.getInterceptors(), interceptor);
            }
        }
        return bean;
    }

    private static void addOnce(List<ClientHttpRequestInterceptor> list, ApiMonitorClientInterceptor interceptor) {
        for (ClientHttpRequestInterceptor existing : list) {
            if (existing instanceof ApiMonitorClientInterceptor) {
                return;
            }
        }
        list.add(interceptor);
    }
}
