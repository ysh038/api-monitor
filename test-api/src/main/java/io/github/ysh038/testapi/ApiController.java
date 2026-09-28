package io.github.ysh038.testapi;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

@RestController
public class ApiController {

    /** 테스트 계정 */
    private static final String LOGIN_ID = "admin";
    private static final String PASSWORD = "admin1234";

    public record LoginRequest(@NotBlank String loginId, @NotBlank String password) {
    }

    /**
     * 성공: 200 + accessToken
     * 비밀번호 틀림: LoginFailedException → 401 (예외가 대시보드에 기록되는지 확인용)
     * 필드 누락: 400 (검증 예외)
     */
    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody LoginRequest request) {
        if (!LOGIN_ID.equals(request.loginId()) || !PASSWORD.equals(request.password())) {
            throw new LoginFailedException("아이디 또는 비밀번호가 일치하지 않습니다.");
        }
        return Map.of("success", true, "data", Map.of(
                "loginId", request.loginId(),
                "accessToken", UUID.randomUUID().toString()));
    }

    @GetMapping("/healthcheck")
    public Map<String, Object> healthcheck() {
        return Map.of("status", "UP", "service", "test-api", "time", OffsetDateTime.now().toString());
    }

    public static class LoginFailedException extends RuntimeException {
        public LoginFailedException(String message) {
            super(message);
        }
    }
}
