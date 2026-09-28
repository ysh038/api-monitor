package io.github.ysh038.apimonitor.support;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Throwable을 전송 포맷(exception 필드)으로 변환한다. */
public final class ExceptionInfo {

    private static final int MAX_STACK_CHARS = 60_000;
    private static final int MAX_CAUSES = 10;

    private ExceptionInfo() {
    }

    /**
     * @param handled true면 앱의 예외 처리기(@ExceptionHandler 등)가 응답으로 바꾼 예외,
     *                false면 필터 밖(서블릿 컨테이너)까지 전파된 예외
     */
    public static Map<String, Object> describe(Throwable t, boolean handled) {
        Map<String, Object> ex = new LinkedHashMap<>();
        ex.put("exceptionClass", t.getClass().getName());
        ex.put("message", t.getMessage());
        ex.put("handled", handled);
        ex.put("stackTrace", stackTrace(t));

        List<Map<String, Object>> causes = new ArrayList<>();
        Set<Throwable> seen = Collections.newSetFromMap(new IdentityHashMap<>());
        seen.add(t);
        for (Throwable c = t.getCause(); c != null && !seen.contains(c) && causes.size() < MAX_CAUSES; c = c.getCause()) {
            seen.add(c);
            Map<String, Object> cm = new LinkedHashMap<>();
            cm.put("exceptionClass", c.getClass().getName());
            cm.put("message", c.getMessage());
            causes.add(cm);
        }
        if (!causes.isEmpty()) {
            // 스펙의 단일 cause 필드 + 전체 체인
            Map<String, Object> first = new LinkedHashMap<>(causes.get(0));
            Map<String, Object> cur = first;
            for (int i = 1; i < causes.size(); i++) {
                Map<String, Object> next = new LinkedHashMap<>(causes.get(i));
                cur.put("cause", next);
                cur = next;
            }
            ex.put("cause", first);
            ex.put("causes", causes);
        }
        return ex;
    }

    private static String stackTrace(Throwable t) {
        StringWriter sw = new StringWriter();
        try (PrintWriter pw = new PrintWriter(sw)) {
            t.printStackTrace(pw);
        }
        String s = sw.toString();
        return s.length() > MAX_STACK_CHARS ? s.substring(0, MAX_STACK_CHARS) + "\n\t... (truncated)" : s;
    }
}
