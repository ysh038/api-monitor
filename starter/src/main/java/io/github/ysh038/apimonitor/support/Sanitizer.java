package io.github.ysh038.apimonitor.support;

import java.net.URLDecoder;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import io.github.ysh038.apimonitor.ApiMonitorProperties;

/**
 * 헤더·바디·쿼리의 민감값을 가리고, 바디를 저장 가능한 문자열로 바꾼다.
 */
public final class Sanitizer {

    public static final String MASK = "****";

    // "key" : "string" | number | true/false/null
    private static final Pattern JSON_PAIR = Pattern.compile(
            "\"((?:[^\"\\\\]|\\\\.)*)\"(\\s*:\\s*)(\"(?:[^\"\\\\]|\\\\.)*\"?|-?\\d[\\d.eE+-]*|true|false|null)");

    private final List<String> maskHeaders;
    private final List<String> maskFields;

    public Sanitizer(ApiMonitorProperties props) {
        this.maskHeaders = lower(props.getMaskHeaders());
        this.maskFields = lower(props.getMaskFields());
    }

    private static List<String> lower(List<String> values) {
        return values == null ? List.of() : values.stream().map(v -> v.toLowerCase(Locale.ROOT)).toList();
    }

    public boolean isSensitiveName(String name) {
        String n = name.toLowerCase(Locale.ROOT);
        for (String f : maskFields) {
            if (n.contains(f)) {
                return true;
            }
        }
        return false;
    }

    private boolean isSensitiveHeader(String name) {
        return maskHeaders.contains(name.toLowerCase(Locale.ROOT)) || isSensitiveName(name);
    }

    public void putHeader(Map<String, Object> target, String name, Collection<String> values) {
        if (name == null || values == null) {
            return;
        }
        String key = name.toLowerCase(Locale.ROOT);
        String value = isSensitiveHeader(name) ? MASK : String.join(", ", values);
        target.merge(key, value, (a, b) -> a + ", " + b);
    }

    public Map<String, Object> newHeaderMap() {
        return new LinkedHashMap<>();
    }

    /** path?query 에서 민감한 쿼리 파라미터 값을 가린다. */
    public String pathWithQuery(String path, String query) {
        if (query == null || query.isEmpty()) {
            return path;
        }
        return path + "?" + maskForm(query);
    }

    private String maskForm(String form) {
        StringBuilder sb = new StringBuilder(form.length());
        for (String pair : form.split("&", -1)) {
            if (!sb.isEmpty()) {
                sb.append('&');
            }
            int eq = pair.indexOf('=');
            String rawName = eq < 0 ? pair : pair.substring(0, eq);
            String name;
            try {
                name = URLDecoder.decode(rawName, StandardCharsets.UTF_8);
            } catch (IllegalArgumentException e) {
                name = rawName;
            }
            if (eq >= 0 && isSensitiveName(name)) {
                sb.append(rawName).append('=').append(MASK);
            } else {
                sb.append(pair);
            }
        }
        return sb.toString();
    }

    private String maskJson(String json) {
        Matcher m = JSON_PAIR.matcher(json);
        StringBuilder sb = new StringBuilder(json.length());
        while (m.find()) {
            if (isSensitiveName(m.group(1))) {
                m.appendReplacement(sb, Matcher.quoteReplacement("\"" + m.group(1) + "\"" + m.group(2) + "\"" + MASK + "\""));
            } else {
                m.appendReplacement(sb, Matcher.quoteReplacement(m.group()));
            }
        }
        m.appendTail(sb);
        return sb.toString();
    }

    public static boolean isMultipart(String contentType) {
        return contentType != null && contentType.toLowerCase(Locale.ROOT).startsWith("multipart/");
    }

    public static boolean isTextual(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return true; // 타입이 없으면 일단 텍스트로 보고, 디코딩은 관대하게
        }
        String ct = contentType.toLowerCase(Locale.ROOT);
        return ct.startsWith("text/") || ct.contains("json") || ct.contains("xml")
                || ct.contains("x-www-form-urlencoded") || ct.contains("javascript")
                || ct.contains("graphql") || ct.contains("yaml");
    }

    public static Charset charsetOf(String contentType, String fallbackEncoding) {
        if (contentType != null) {
            for (String part : contentType.split(";")) {
                String p = part.trim();
                if (p.regionMatches(true, 0, "charset=", 0, 8)) {
                    try {
                        return Charset.forName(p.substring(8).replace("\"", "").trim());
                    } catch (Exception ignored) {
                        // 아래 fallback
                    }
                }
            }
        }
        if (fallbackEncoding != null) {
            try {
                return Charset.forName(fallbackEncoding);
            } catch (Exception ignored) {
                // UTF-8
            }
        }
        return StandardCharsets.UTF_8;
    }

    /** 캡처된 바디를 저장용 문자열로. 바디가 없으면 null. */
    public String body(BodyCapture.Snapshot snap, String contentType, String encoding) {
        if (snap == null || snap.total() == 0) {
            return null;
        }
        if (isMultipart(contentType)) {
            return "[" + baseType(contentType) + ", " + humanSize(snap.total()) + "]";
        }
        if (!isTextual(contentType)) {
            return "[binary " + baseType(contentType) + ", " + humanSize(snap.total()) + "]";
        }
        return maskText(snap.asString(charsetOf(contentType, encoding)), contentType);
    }

    public String maskText(String text, String contentType) {
        if (text == null || text.isEmpty()) {
            return text;
        }
        String ct = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT);
        if (ct.contains("x-www-form-urlencoded")) {
            return maskForm(text);
        }
        String t = text.stripLeading();
        if (ct.contains("json") || t.startsWith("{") || t.startsWith("[") || ct.startsWith("text/event-stream")) {
            return maskJson(text);
        }
        return text;
    }

    public static String multipartSummary(String contentType, long contentLength) {
        return "[" + baseType(contentType) + (contentLength >= 0 ? ", " + humanSize(contentLength) : "") + "]";
    }

    private static String baseType(String contentType) {
        if (contentType == null) {
            return "unknown";
        }
        int semi = contentType.indexOf(';');
        return (semi < 0 ? contentType : contentType.substring(0, semi)).trim();
    }

    public static String humanSize(long bytes) {
        if (bytes < 1024) {
            return bytes + "B";
        }
        if (bytes < 1024 * 1024) {
            return String.format(Locale.ROOT, "%.1fKB", bytes / 1024.0);
        }
        return String.format(Locale.ROOT, "%.1fMB", bytes / (1024.0 * 1024));
    }
}
