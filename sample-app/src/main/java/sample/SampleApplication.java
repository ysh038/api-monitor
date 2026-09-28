package sample;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** JWT 인증 + 전역 예외 처리 + SSE + RestClient 구성의 검증용 앱. api-monitor 관련 코드는 한 줄도 없다. */
@SpringBootApplication
public class SampleApplication {

    public static void main(String[] args) {
        SpringApplication.run(SampleApplication.class, args);
    }

    /** 흔한 requestId 필터: X-Request-Id를 MDC와 응답 헤더에 넣는다. */
    @Component
    @Order(Ordered.HIGHEST_PRECEDENCE)
    static class RequestLoggingFilter extends OncePerRequestFilter {
        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
                throws ServletException, IOException {
            String id = request.getHeader("X-Request-Id");
            if (id == null || id.isBlank()) {
                id = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
            }
            MDC.put("requestId", id);
            response.setHeader("X-Request-Id", id);
            try {
                chain.doFilter(request, response);
            } finally {
                MDC.remove("requestId");
            }
        }
    }

    /** JWT 필터 흉내: Bearer test-token 이면 인증. */
    static class FakeJwtFilter extends OncePerRequestFilter {
        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
                throws ServletException, IOException {
            if ("Bearer test-token".equals(request.getHeader("Authorization"))) {
                SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                        "tester", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
            }
            chain.doFilter(request, response);
        }
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        .dispatcherTypeMatchers(DispatcherType.ASYNC, DispatcherType.ERROR).permitAll()
                        .requestMatchers("/api/v1/auth/**", "/actuator/health").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(e -> e.authenticationEntryPoint((req, res, ex) -> {
                    // 흔한 JWT EntryPoint처럼 getWriter로 직접 401 JSON 작성
                    res.setStatus(HttpStatus.UNAUTHORIZED.value());
                    res.setContentType("application/json");
                    res.setCharacterEncoding("UTF-8");
                    res.getWriter().write("{\"success\":false,\"status\":401,\"message\":\"인증이 필요합니다.\"}");
                }))
                .addFilterBefore(new FakeJwtFilter(), UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    /** RestClient.builder()를 직접 호출해 만든 빈. */
    @Bean
    RestClient aiRestClient(@Value("${ai.base-url}") String baseUrl) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(2));
        factory.setReadTimeout(Duration.ofSeconds(1));
        return RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .defaultHeader("X-Api-Key", "ai-secret-key")
                .build();
    }

    static Map<String, Object> ok(Object data) {
        return Map.of("success", true, "data", data);
    }
}
