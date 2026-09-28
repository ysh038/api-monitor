package io.github.ysh038.apimonitor.dashboard;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

import io.github.ysh038.apimonitor.store.LocalStore;
import io.github.ysh038.apimonitor.support.Json;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * 앱 안의 대시보드(/_api-monitor). 스타터 필터가 Spring Security 보다 먼저 이 요청을 받아 직접 응답하므로
 * 앱의 보안 설정·컨트롤러와 무관하게 동작하고, 대시보드 요청 자체는 기록하지 않는다.
 * 화면 파일은 jar 안 META-INF/api-monitor/dashboard/ (별도 대시보드 서버와 같은 index.html/app.js/app.css).
 */
public class DashboardEndpoint {

    private static final String RESOURCE_BASE = "META-INF/api-monitor/dashboard/";
    private static final Map<String, String> STATIC = Map.of(
            "", "index.html",
            "index.html", "index.html",
            "app.js", "app.js",
            "app.css", "app.css");

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
        if (STATIC.containsKey(sub)) {
            serveStatic(res, STATIC.get(sub));
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
            String type = file.endsWith(".js") ? "text/javascript;charset=UTF-8"
                    : file.endsWith(".css") ? "text/css;charset=UTF-8" : "text/html;charset=UTF-8";
            res.setContentType(type);
            res.setContentLength(bytes.length);
            try (OutputStream out = res.getOutputStream()) {
                out.write(bytes);
            }
        }
    }
}
