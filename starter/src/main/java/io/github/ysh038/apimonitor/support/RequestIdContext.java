package io.github.ysh038.apimonitor.support;

import org.slf4j.MDC;

/**
 * 현재 스레드에서 처리 중인 들어온 요청의 requestId.
 * 앱이 MDC에 넣어둔 값을 우선 쓰고, 없으면 스타터 필터가 넣은 값을 쓴다.
 */
public final class RequestIdContext {

    private static final ThreadLocal<String> CURRENT = new ThreadLocal<>();

    private RequestIdContext() {
    }

    public static void set(String requestId) {
        CURRENT.set(requestId);
    }

    public static void clear() {
        CURRENT.remove();
    }

    public static String current(String mdcKey) {
        String fromMdc = mdcKey == null ? null : MDC.get(mdcKey);
        if (fromMdc != null && !fromMdc.isBlank()) {
            return fromMdc;
        }
        return CURRENT.get();
    }
}
