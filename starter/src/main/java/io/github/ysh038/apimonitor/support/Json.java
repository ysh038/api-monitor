package io.github.ysh038.apimonitor.support;

import java.util.Collection;
import java.util.Map;

/**
 * 전송 이벤트 직렬화용 최소 JSON 작성기.
 * Jackson 2/3 중 무엇을 쓰는 앱이든 충돌하지 않도록 외부 라이브러리를 쓰지 않는다.
 */
public final class Json {

    private Json() {
    }

    /** null 값인 필드는 생략한다 (전송·저장 크기 절약). */
    public static String write(Object value) {
        StringBuilder sb = new StringBuilder(1024);
        append(sb, value, false);
        return sb.toString();
    }

    /** null 값인 필드도 "key":null 로 쓴다 (대시보드 API 응답용). */
    public static String writeWithNulls(Object value) {
        StringBuilder sb = new StringBuilder(1024);
        append(sb, value, true);
        return sb.toString();
    }

    private static void append(StringBuilder sb, Object value, boolean nulls) {
        if (value == null) {
            sb.append("null");
        } else if (value instanceof CharSequence s) {
            string(sb, s);
        } else if (value instanceof Boolean || value instanceof Integer || value instanceof Long
                || value instanceof Short || value instanceof Byte) {
            sb.append(value);
        } else if (value instanceof Number n) {
            double d = n.doubleValue();
            sb.append(Double.isFinite(d) ? n.toString() : "null");
        } else if (value instanceof Map<?, ?> map) {
            sb.append('{');
            boolean first = true;
            for (Map.Entry<?, ?> e : map.entrySet()) {
                if (e.getValue() == null && !nulls) {
                    continue;
                }
                if (!first) {
                    sb.append(',');
                }
                first = false;
                string(sb, String.valueOf(e.getKey()));
                sb.append(':');
                append(sb, e.getValue(), nulls);
            }
            sb.append('}');
        } else if (value instanceof Collection<?> list) {
            sb.append('[');
            boolean first = true;
            for (Object item : list) {
                if (!first) {
                    sb.append(',');
                }
                first = false;
                append(sb, item, nulls);
            }
            sb.append(']');
        } else {
            string(sb, value.toString());
        }
    }

    private static void string(StringBuilder sb, CharSequence s) {
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                case '\b' -> sb.append("\\b");
                case '\f' -> sb.append("\\f");
                default -> {
                    if (c < 0x20 || c == ' ' || c == ' ') {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        sb.append('"');
    }
}
