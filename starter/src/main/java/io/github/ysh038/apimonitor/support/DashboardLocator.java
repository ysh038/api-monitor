package io.github.ysh038.apimonitor.support;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * endpoint를 따로 설정하지 않았을 때 같은 서버에 떠 있는 대시보드를 찾는다.
 * 후보 주소의 /api/health 응답에 X-Api-Monitor 헤더가 있으면 대시보드로 판단한다.
 */
public final class DashboardLocator {

    private static final Logger log = LoggerFactory.getLogger(DashboardLocator.class);
    private static final String MARKER_HEADER = "X-Api-Monitor";

    private final HttpClient client;
    private final int port;

    public DashboardLocator(int port) {
        this.port = port;
        this.client = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofMillis(800))
                .build();
    }

    /** 찾으면 ingest URI, 못 찾으면 null. */
    public URI locate() {
        for (String base : candidates()) {
            if (isDashboard(base)) {
                return URI.create(base + "/ingest");
            }
        }
        return null;
    }

    List<String> candidates() {
        Set<String> list = new LinkedHashSet<>();
        list.add("http://api-monitor:8081");                      // 같은 compose 네트워크의 서비스명
        list.add("http://host.docker.internal:" + port);          // extra_hosts 설정이 있거나 Docker Desktop
        String gateway = defaultGateway();
        if (gateway != null) {
            list.add("http://" + gateway + ":" + port);          // 리눅스 컨테이너에서 본 호스트 (설정 불필요)
        }
        list.add("http://localhost:" + port);                    // 도커 없이 java -jar로 실행한 경우
        return new ArrayList<>(list);
    }

    private boolean isDashboard(String base) {
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(base + "/api/health"))
                    .timeout(Duration.ofSeconds(1))
                    .GET()
                    .build();
            HttpResponse<Void> res = client.send(req, HttpResponse.BodyHandlers.discarding());
            return res.statusCode() == 200 && res.headers().firstValue(MARKER_HEADER).isPresent();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } catch (Exception e) {
            log.trace("[api-monitor] 후보 {} 응답 없음: {}", base, e.toString());
            return false;
        }
    }

    /** /proc/net/route의 기본 경로 게이트웨이(리눅스 전용). 없으면 null. */
    static String defaultGateway() {
        Path route = Path.of("/proc/net/route");
        if (!Files.isReadable(route)) {
            return null;
        }
        try {
            for (String line : Files.readAllLines(route)) {
                String[] f = line.trim().split("\\s+");
                if (f.length > 2 && "00000000".equals(f[1]) && !"00000000".equals(f[2])) {
                    long hex = Long.parseLong(f[2], 16);
                    return (hex & 0xff) + "." + ((hex >> 8) & 0xff) + "." + ((hex >> 16) & 0xff) + "." + ((hex >> 24) & 0xff);
                }
            }
        } catch (IOException | RuntimeException ignored) {
            // 게이트웨이 후보 없이 진행
        }
        return null;
    }
}
