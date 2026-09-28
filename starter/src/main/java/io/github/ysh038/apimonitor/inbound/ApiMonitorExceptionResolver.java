package io.github.ysh038.apimonitor.inbound;

import org.springframework.core.Ordered;
import org.springframework.web.servlet.HandlerExceptionResolver;
import org.springframework.web.servlet.ModelAndView;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * 가장 먼저 호출되는 예외 리졸버. 예외를 요청 속성에 기록만 하고 null을 돌려준다.
 * null이면 DispatcherServlet이 다음 리졸버(@RestControllerAdvice 등)로 넘기므로
 * 앱의 원래 에러 응답은 전혀 바뀌지 않는다.
 */
public class ApiMonitorExceptionResolver implements HandlerExceptionResolver, Ordered {

    public static final String EXCEPTION_ATTRIBUTE = ApiMonitorExceptionResolver.class.getName() + ".EXCEPTION";

    @Override
    public ModelAndView resolveException(HttpServletRequest request, HttpServletResponse response,
                                         Object handler, Exception ex) {
        if (request.getAttribute(EXCEPTION_ATTRIBUTE) == null) {
            request.setAttribute(EXCEPTION_ATTRIBUTE, ex);
        }
        return null;
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
