package sample;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.sql.SQLIntegrityConstraintViolationException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1")
public class SampleController {

    private final RestClient ai;
    private final ExecutorService sseExecutor = Executors.newCachedThreadPool();

    public SampleController(RestClient ai) {
        this.ai = ai;
    }

    public record LoginRequest(String loginId, String password) {
    }

    @PostMapping("/auth/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest req) {
        if (!"pass1234".equals(req.password())) {
            throw new InvalidPasswordException("비밀번호가 일치하지 않습니다.");
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, "refreshToken=rt-abc; HttpOnly; Path=/")
                .body(SampleApplication.ok(Map.of("accessToken", "test-token", "loginId", req.loginId())));
    }

    @GetMapping("/reports")
    public Map<String, Object> reports(@RequestParam(defaultValue = "0") int page) {
        return SampleApplication.ok(List.of(Map.of("id", 1, "title", "8월 월간 보고서"), Map.of("id", 2, "title", "9월 월간 보고서")));
    }

    /** 비즈니스 로직 중 DB 예외 → GlobalExceptionHandler가 500으로 변환 */
    @PostMapping("/reports")
    public Map<String, Object> createReport(@RequestBody Map<String, Object> body) {
        throw new IllegalStateException("could not execute statement",
                new SQLIntegrityConstraintViolationException("Cannot add or update a child row: a foreign key constraint fails (`app`.`report`, CONSTRAINT `fk_agent`)"));
    }

    /** @ExceptionHandler(Exception.class)로도 못 잡는 Error → 필터 밖(컨테이너)까지 전파 */
    @GetMapping("/test/unhandled")
    public Map<String, Object> unhandled() {
        throw new AssertionError("예상하지 못한 상태: 월별 스케줄이 비어 있음");
    }

    /** 같은 스레드에서 외부 호출 (부모 requestId와 연결됨) */
    @GetMapping("/ai/risk-scores")
    public Map<String, Object> riskScores() {
        Map<?, ?> res = ai.get().uri("/risk?month=2026-08").retrieve().body(Map.class);
        return SampleApplication.ok(res);
    }

    /** 외부 서버가 500 → RestClient 예외 → GlobalExceptionHandler 500 */
    @GetMapping("/ai/fail")
    public Map<String, Object> aiFail() {
        return SampleApplication.ok(ai.post().uri("/fail").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("agentId", "A-100", "apiToken", "should-be-masked")).retrieve().body(Map.class));
    }

    /** 외부 서버 응답 지연 → read timeout */
    @GetMapping("/ai/slow")
    public Map<String, Object> aiSlow() {
        return SampleApplication.ok(ai.get().uri("/slow").retrieve().body(Map.class));
    }

    /** AI 채팅 중계: SSE로 응답하면서 백그라운드 스레드에서 AI 서버 SSE를 exchange()로 스트리밍 중계 */
    @PostMapping(value = "/chat-sessions", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chat(@RequestBody Map<String, Object> body) {
        SseEmitter emitter = new SseEmitter(30_000L);
        sseExecutor.submit(() -> {
            try {
                ai.post().uri("/query").contentType(MediaType.APPLICATION_JSON).accept(MediaType.TEXT_EVENT_STREAM)
                        .body(body)
                        .exchange((request, response) -> {
                            try (BufferedReader reader = new BufferedReader(
                                    new InputStreamReader(response.getBody(), StandardCharsets.UTF_8))) {
                                String line;
                                while ((line = reader.readLine()) != null) {
                                    if (line.startsWith("data:")) {
                                        emitter.send(SseEmitter.event().name("token").data(line.substring(5).trim()));
                                    }
                                }
                            }
                            return null;
                        });
                emitter.send(SseEmitter.event().name("done").data("{}"));
                emitter.complete();
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
        });
        return emitter;
    }

    @PostMapping("/files")
    public Map<String, Object> upload(@RequestParam("file") MultipartFile file) {
        return SampleApplication.ok(Map.of("name", file.getOriginalFilename(), "size", file.getSize()));
    }

    @GetMapping("/files/download")
    public ResponseEntity<byte[]> download() {
        byte[] data = new byte[200_000];
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=report.xlsx").body(data);
    }

    static class InvalidPasswordException extends RuntimeException {
        InvalidPasswordException(String message) {
            super(message);
        }
    }

    /** 흔한 GlobalExceptionHandler 구조: 비즈니스 예외 매핑 + Exception.class 전부 500 */
    @RestControllerAdvice
    static class GlobalExceptionHandler {
        @ExceptionHandler(InvalidPasswordException.class)
        ResponseEntity<Map<String, Object>> invalidPassword(InvalidPasswordException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("success", false, "status", 401, "message", e.getMessage()));
        }

        @ExceptionHandler(Exception.class)
        ResponseEntity<Map<String, Object>> handle(Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "status", 500, "message", "서버 내부 오류가 발생했습니다."));
        }
    }
}
