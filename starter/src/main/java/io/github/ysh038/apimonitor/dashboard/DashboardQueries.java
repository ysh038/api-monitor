package io.github.ysh038.apimonitor.dashboard;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

import io.github.ysh038.apimonitor.store.LocalStore;
import io.github.ysh038.apimonitor.store.LocalStore.Entry;

/**
 * 내장 대시보드 조회. 응답 모양은 별도 대시보드 서버(server/src/query.js)와 같아서 같은 화면(app.js)을 쓴다.
 */
final class DashboardQueries {

    private final LocalStore store;

    DashboardQueries(LocalStore store) {
        this.store = store;
    }

    // ---------- 목록 ----------

    Map<String, Object> list(Map<String, String> q) {
        int limit = clamp(parseInt(q.get("limit"), 100), 1, 500);
        Long afterId = parseLong(q.get("afterId"));
        Long beforeId = parseLong(q.get("beforeId"));
        return store.read(view -> {
            List<Map<String, Object>> items = new ArrayList<>();
            Iterator<Entry> it = view.newestFirst();
            while (it.hasNext() && items.size() < limit) {
                Entry e = it.next();
                if (afterId != null && e.id() <= afterId) {
                    break; // 최신 → 오래된 순이므로 이후는 모두 afterId 이하
                }
                if (beforeId != null && e.id() >= beforeId) {
                    continue;
                }
                if (!matches(e.event(), q)) {
                    continue;
                }
                Map<String, Object> row = summary(e);
                row.put("child_count", "INBOUND".equals(kind(e.event())) ? view.childCount(str(e.event().get("requestId"))) : 0);
                items.add(row);
            }
            Map<String, Object> res = new LinkedHashMap<>();
            res.put("items", items);
            res.put("limit", limit);
            return res;
        });
    }

    private static boolean matches(Map<String, Object> ev, Map<String, String> q) {
        String service = q.get("service");
        if (notBlank(service) && !service.equals(str(ev.get("serviceName")))) {
            return false;
        }
        String kind = q.get("kind");
        if (("INBOUND".equals(kind) || "OUTBOUND".equals(kind)) && !kind.equals(kind(ev))) {
            return false;
        }
        String host = q.get("host");
        if (notBlank(host) && !host.equals(str(ev.get("targetHost")))) {
            return false;
        }
        if ("1".equals(q.get("exception")) || "true".equals(q.get("exception"))) {
            if (exception(ev) == null) {
                return false;
            }
        }
        String status = q.get("status");
        if (notBlank(status)) {
            Long code = num(ev.get("statusCode"));
            boolean any = false;
            for (String c : status.split(",")) {
                switch (c) {
                    case "2xx" -> any |= code != null && code >= 200 && code <= 299;
                    case "3xx" -> any |= code != null && code >= 300 && code <= 399;
                    case "4xx" -> any |= code != null && code >= 400 && code <= 499;
                    case "5xx" -> any |= code != null && code >= 500 && code <= 599;
                    case "none" -> any |= code == null;
                    default -> {
                    }
                }
            }
            if (!any) {
                return false;
            }
        }
        String text = q.get("q");
        if (notBlank(text)) {
            String t = text.trim();
            String lower = t.toLowerCase(Locale.ROOT);
            Map<String, Object> ex = exception(ev);
            boolean hit = t.equals(str(ev.get("requestId"))) || t.equals(str(ev.get("parentRequestId")))
                    || containsIgnoreCase(ev.get("path"), lower)
                    || containsIgnoreCase(ev.get("requestBody"), lower)
                    || containsIgnoreCase(ev.get("responseBody"), lower)
                    || (ex != null && (containsIgnoreCase(ex.get("exceptionClass"), lower)
                    || containsIgnoreCase(ex.get("message"), lower)));
            if (!hit) {
                return false;
            }
        }
        return true;
    }

    // ---------- 상세 ----------

    Map<String, Object> detail(long id) {
        return store.read(view -> {
            Entry target = null;
            for (Entry e : view.entries()) {
                if (e.id() == id) {
                    target = e;
                    break;
                }
            }
            if (target == null) {
                return null;
            }
            Map<String, Object> ev = target.event();
            Map<String, Object> row = summary(target);
            row.put("request_headers", ev.get("requestHeaders"));
            row.put("request_body", ev.get("requestBody"));
            row.put("request_body_truncated", bool(ev.get("requestBodyTruncated")));
            row.put("response_headers", ev.get("responseHeaders"));
            row.put("response_body", ev.get("responseBody"));
            row.put("response_body_truncated", bool(ev.get("responseBodyTruncated")));
            Map<String, Object> ex = exception(ev);
            row.put("exception_stacktrace", ex == null ? null : ex.get("stackTrace"));
            Object causes = ex == null ? null : ex.get("causes");
            row.put("exception_causes", causes);
            if (causes instanceof List<?> list && !list.isEmpty() && list.get(0) instanceof Map<?, ?> first) {
                row.put("exception_cause_class", first.get("exceptionClass"));
                row.put("exception_cause_message", first.get("message"));
            }

            String requestId = str(ev.get("requestId"));
            String parentId = str(ev.get("parentRequestId"));
            boolean inbound = "INBOUND".equals(kind(ev));
            List<Map<String, Object>> children = new ArrayList<>();
            List<Map<String, Object>> same = new ArrayList<>();
            Map<String, Object> parent = null;
            for (Entry e : view.entries()) {
                Map<String, Object> o = e.event();
                if (inbound && requestId != null && requestId.equals(str(o.get("parentRequestId")))) {
                    children.add(summary(e));
                }
                if (parentId != null && parent == null && "INBOUND".equals(kind(o)) && parentId.equals(str(o.get("requestId")))) {
                    parent = summary(e);
                }
                if (inbound && requestId != null && e.id() != id && "INBOUND".equals(kind(o)) && requestId.equals(str(o.get("requestId")))) {
                    same.add(summary(e));
                }
            }
            Map<String, Object> related = new LinkedHashMap<>();
            related.put("children", children);
            related.put("parent", parent);
            related.put("sameRequestId", same);
            row.put("related", related);
            return row;
        });
    }

    // ---------- 서비스 / 외부 호출 대상 ----------

    Map<String, Object> services() {
        return store.read(view -> {
            Map<String, long[]> svc = new TreeMap<>(); // total, errors, exceptions, lastSeen
            Map<String, Long> hosts = new LinkedHashMap<>();
            for (Entry e : view.entries()) {
                Map<String, Object> ev = e.event();
                String name = str(ev.get("serviceName"));
                long[] a = svc.computeIfAbsent(name == null ? "unknown" : name, k -> new long[4]);
                Long code = num(ev.get("statusCode"));
                a[0]++;
                if (code == null || code >= 500) {
                    a[1]++;
                }
                if (exception(ev) != null) {
                    a[2]++;
                }
                Long ts = num(ev.get("timestamp"));
                if (ts != null && ts > a[3]) {
                    a[3] = ts;
                }
                String host = str(ev.get("targetHost"));
                if ("OUTBOUND".equals(kind(ev)) && host != null) {
                    hosts.merge(host, 1L, Long::sum);
                }
            }
            List<Map<String, Object>> services = new ArrayList<>();
            svc.forEach((name, a) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("name", name);
                m.put("total", a[0]);
                m.put("errors", a[1]);
                m.put("exceptions", a[2]);
                m.put("lastSeen", a[3]);
                services.add(m);
            });
            List<Map<String, Object>> hostList = new ArrayList<>();
            hosts.entrySet().stream().sorted((x, y) -> Long.compare(y.getValue(), x.getValue())).limit(100)
                    .forEach(h -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("host", h.getKey());
                        m.put("total", h.getValue());
                        hostList.add(m);
                    });
            Map<String, Object> res = new LinkedHashMap<>();
            res.put("services", services);
            res.put("hosts", hostList);
            return res;
        });
    }

    Map<String, Object> health() {
        int stored = store.read(view -> view.entries().size());
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("status", "ok");
        res.put("service", "api-monitor");
        res.put("mode", "embedded");
        res.put("stored", stored);
        res.put("storageDir", store.directory() == null ? null : store.directory().toString());
        return res;
    }

    // ---------- 변환 ----------

    /** 목록 한 줄 (server/src/query.js LIST_COLUMNS 와 같은 필드). */
    private static Map<String, Object> summary(Entry e) {
        Map<String, Object> ev = e.event();
        Map<String, Object> ex = exception(ev);
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("id", e.id());
        r.put("kind", kind(ev));
        r.put("request_id", ev.get("requestId"));
        r.put("parent_request_id", ev.get("parentRequestId"));
        r.put("service_name", ev.get("serviceName"));
        r.put("instance_id", ev.get("instanceId"));
        r.put("method", ev.get("method"));
        r.put("path", ev.get("path"));
        r.put("target_host", ev.get("targetHost"));
        r.put("status_code", ev.get("statusCode"));
        r.put("duration_ms", ev.get("durationMs"));
        r.put("client_ip", ev.get("clientIp"));
        r.put("async", bool(ev.get("async")));
        r.put("created_at", ev.get("timestamp"));
        r.put("exception_class", ex == null ? null : ex.get("exceptionClass"));
        r.put("exception_message", ex == null ? null : ex.get("message"));
        r.put("exception_handled", ex == null || ex.get("handled") == null ? null : bool(ex.get("handled")));
        return r;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> exception(Map<String, Object> ev) {
        Object ex = ev.get("exception");
        return ex instanceof Map<?, ?> m ? (Map<String, Object>) m : null;
    }

    private static String kind(Map<String, Object> ev) {
        return "OUTBOUND".equals(ev.get("kind")) ? "OUTBOUND" : "INBOUND";
    }

    private static int bool(Object v) {
        return Boolean.TRUE.equals(v) ? 1 : 0;
    }

    private static String str(Object v) {
        return v == null ? null : v.toString();
    }

    private static Long num(Object v) {
        if (v instanceof Number n) {
            return n.longValue();
        }
        return null;
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    private static boolean containsIgnoreCase(Object v, String lowerNeedle) {
        return v != null && v.toString().toLowerCase(Locale.ROOT).contains(lowerNeedle);
    }

    private static int parseInt(String s, int def) {
        try {
            return s == null ? def : Integer.parseInt(s.trim());
        } catch (NumberFormatException e) {
            return def;
        }
    }

    private static Long parseLong(String s) {
        try {
            return s == null || s.isBlank() ? null : Long.parseLong(s.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static int clamp(int v, int min, int max) {
        return Math.max(min, Math.min(max, v));
    }
}
