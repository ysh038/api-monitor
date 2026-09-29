package io.github.ysh038.apimonitor.dashboard;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

import io.github.ysh038.apimonitor.store.LocalStore;
import io.github.ysh038.apimonitor.support.Json;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * 앱 안의 대시보드(/_api-monitor). 스타터 필터가 Spring Security 보다 먼저 이 요청을 받아 직접 응답하므로
 * 앱의 보안 설정·컨트롤러와 무관하게 동작하고, 대시보드 요청 자체는 기록하지 않는다.
 * 화면 파일은 jar 안 META-INF/api-monitor/dashboard/ (dashboard-ui 빌드 결과: index.html, favicon.svg, assets/*).
 */
public class DashboardEndpoint {

    private static final String RESOURCE_BASE = "META-INF/api-monitor/dashboard/";
    /** assets/ 바로 아래의 파일 이름만 허용한다 (하위 폴더·.. 불가 → jar 안 다른 리소스를 읽지 못하게). */
    private static final Pattern ASSET = Pattern.compile("assets/[A-Za-z0-9_-][A-Za-z0-9._-]*");
    private static final Map<String, String> CONTENT_TYPES = Map.of(
            "html", "text/html;charset=UTF-8",
            "js", "text/javascript;charset=UTF-8",
            "css", "text/css;charset=UTF-8",
            "svg", "image/svg+xml",
            "png", "image/png",
            "ico", "image/x-icon",
            "woff2", "font/woff2",
            "json", "application/json;charset=UTF-8",
            "map", "application/json;charset=UTF-8");

    private final String basePath;
    private final DashboardQueries queries;

    public DashboardEndpoint(String basePath, LocalStore store) {
        this.basePath = normalize(basePath);
        this.queries = new DashboardQueries(store);
    }

    public String basePath() {
        return basePath;
    }

    private static String normalize(String p) {
        String s = (p == null || p.isBlank()) ? "/_api-monitor" : p.trim();
        if (!s.startsWith("/")) {
            s = "/" + s;
        }
        while (s.length() > 1 && s.endsWith("/")) {
            s = s.substring(0, s.length() - 1);
        }
        return s;
    }

    /** context-path 를 뺀 경로가 대시보드 경로인지. */
    public boolean matches(String pathWithinApp) {
        return pathWithinApp.equals(basePath) || pathWithinApp.startsWith(basePath + "/");
    }

    public void handle(HttpServletRequest req, HttpServletResponse res, String pathWithinApp) throws IOException {
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");
        if (pathWithinApp.equals(basePath)) {
            // 상대경로(app.js, api/...)가 맞게 풀리도록 끝에 / 를 붙인다
            String q = req.getQueryString();
            res.sendRedirect(req.getContextPath() + basePath + "/" + (q == null ? "" : "?" + q));
            return;
        }
        String sub = pathWithinApp.substring(basePath.length() + 1);
        if (!"GET".equals(req.getMethod())) {
            res.sendError(HttpServletResponse.SC_METHOD_NOT_ALLOWED);
            return;
        }
        if (!sub.startsWith("api/")) {
            String file = staticFile(sub);
            if (file == null) {
                res.sendError(HttpServletResponse.SC_NOT_FOUND);
            } else {
                serveStatic(res, file);
            }
            return;
        }
        switch (sub) {
            case "api/logs" -> json(res, queries.list(params(req)));
            case "api/services" -> json(res, queries.services());
            case "api/health" -> json(res, queries.health());
            default -> {
                if (sub.startsWith("api/logs/")) {
                    Long id = parseId(sub.substring("api/logs/".length()));
                    Map<String, Object> detail = id == null ? null : queries.detail(id);
                    if (detail == null) {
                        res.setStatus(HttpServletResponse.SC_NOT_FOUND);
                        json(res, Map.of("error", "not found"));
                    } else {
                        json(res, detail);
                    }
                } else {
                    res.sendError(HttpServletResponse.SC_NOT_FOUND);
                }
            }
        }
    }

    /** 서빙할 수 있는 화면 파일이면 jar 안 이름, 아니면 null. */
    static String staticFile(String sub) {
        if (sub.isEmpty() || sub.equals("index.html")) {
            return "index.html";
        }
        if (sub.equals("favicon.svg")) {
            return sub;
        }
        if (ASSET.matcher(sub).matches() && !sub.contains("..")) {
            return sub;
        }
        return null;
    }

    private static Long parseId(String s) {
        try {
            return Long.parseLong(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static Map<String, String> params(HttpServletRequest req) {
        Map<String, String> m = new HashMap<>();
        req.getParameterMap().forEach((k, v) -> {
            if (v != null && v.length > 0) {
                m.put(k, v[0]);
            }
        });
        return m;
    }

    private static void json(HttpServletResponse res, Object body) throws IOException {
        byte[] bytes = Json.writeWithNulls(body).getBytes(StandardCharsets.UTF_8);
        res.setContentType("application/json;charset=UTF-8");
        res.setContentLength(bytes.length);
        try (OutputStream out = res.getOutputStream()) {
            out.write(bytes);
        }
    }

    private void serveStatic(HttpServletResponse res, String file) throws IOException {
        try (InputStream in = DashboardEndpoint.class.getClassLoader().getResourceAsStream(RESOURCE_BASE + file)) {
            if (in == null) {
                res.sendError(HttpServletResponse.SC_NOT_FOUND);
                return;
            }
            byte[] bytes = in.readAllBytes();
            String ext = file.substring(file.lastIndexOf('.') + 1);
            res.setContentType(CONTENT_TYPES.getOrDefault(ext, "application/octet-stream"));
            if (file.startsWith("assets/")) {
                // 파일 이름에 내용 해시가 붙어 있어서 오래 캐시해도 된다 (index.html 은 no-store 유지)
                res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            }
            res.setContentLength(bytes.length);
            try (OutputStream out = res.getOutputStream()) {
                out.write(bytes);
            }
        }
    }
}
