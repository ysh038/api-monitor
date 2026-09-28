# API Monitor

Spring Boot 앱에 의존성 한 줄만 추가하면, 들어온 요청·응답·예외와 앱이 호출한 외부 API를 웹 대시보드에서 한 번에 볼 수 있게 해 주는 도구입니다. 연계 테스트 중에 "요청이 어떤 값으로 들어왔는지, 무엇을 응답했는지, 내부에서 어떤 예외가 났는지"를 로그 grep 없이 확인하는 용도입니다.

```
Spring Boot 앱 (+ starter)                          대시보드 (Node + SQLite, Docker)
 ├─ 들어온 요청/응답 캡처     ─┐
 ├─ 예외 캡처 (응답 변경 없음) ─┼─ 비동기 POST /ingest ─▶  저장 (30일 보관)
 └─ 외부 호출(RestClient) 캡처 ─┘   (실패해도 버림)          웹 대시보드 :8090
```

| 폴더 | 내용 |
|---|---|
| `starter/` | Spring Boot Starter (런타임 의존성 0개) |
| `server/` | 대시보드 서버 (Node 22, Express 5, better-sqlite3) |
| `deploy/` | 대시보드 설치 스크립트, compose 예시 |
| `test-api/` | 최소 예제 앱 (`/login`, `/healthcheck`) |
| `sample-app/`, `sample-ai-server/`, `docker-compose.test.yml` | 전체 기능 검증용 (JWT, 전역 예외 처리, SSE, 외부 Python 서버 호출) |

지원 환경: Spring Boot 4.x (Servlet/Spring MVC), Java 17 이상. Spring Boot 4.0.5 + Java 26에서 검증했습니다.

---

## 빠른 시작

### 1. 대시보드 설치 (앱과 같은 서버, 한 번만)

```bash
docker build -t api-monitor-server:1.0.0 server
./deploy/install-dashboard.sh          # http://<서버IP>:8090
```

`install-dashboard.sh`는 같은 폴더에 `api-monitor-server-*.tar.gz`가 있으면 먼저 로드합니다. 폐쇄망 반입용입니다. 다시 실행해도 쌓인 로그는 유지됩니다.

### 2. 앱에 의존성 추가

```groovy
dependencies {
    implementation 'io.github.ysh038:api-monitor-spring-boot-starter:1.0.0'
}
```

### 3. 평소처럼 빌드·배포

앱이 같은 서버의 대시보드를 **자동으로 찾아 연결합니다.** 설정은 필요 없습니다. 기동 로그에 아래 줄이 보이면 연결된 것입니다.

```
[api-monitor] 대시보드 연결: http://172.18.0.1:8090/ingest
```

---

## 대시보드 자동 연결

`api-monitor.endpoint`를 설정하지 않으면 아래 후보를 차례로 확인해서, `/api/health` 응답에 `X-Api-Monitor` 헤더가 있는 첫 주소에 연결합니다.

1. `http://api-monitor:8081`: 같은 compose 네트워크의 서비스명
2. `http://host.docker.internal:8090`: Docker Desktop, 또는 `extra_hosts` 설정이 있는 경우
3. `http://<컨테이너 기본 게이트웨이>:8090`: 리눅스 컨테이너에서 본 호스트. 별도 설정이 필요 없습니다.
4. `http://localhost:8090`: 도커 없이 `java -jar`로 실행한 경우

찾지 못하면 10초마다 다시 찾습니다. 그래서 대시보드를 앱보다 나중에 설치해도 연결됩니다. 찾기 전까지는 캡처 자체를 건너뛰어서 앱에는 영향이 없습니다.

대시보드가 다른 서버에 있으면 주소를 직접 지정합니다.

```
API_MONITOR_ENDPOINT=http://<대시보드IP>:8090/ingest
```

---

## 기록되는 것

**들어온 요청** (서블릿 필터, Spring Security보다 앞)
- 메서드, 경로, 헤더, 바디, 상태코드, 응답 헤더·바디, 소요시간, 클라이언트 IP
- 인증 실패(401/403)도 기록됩니다.
- 응답을 모아두지 않고 흘려보내면서 앞부분(기본 10KB)만 복사합니다. 그래서 **SSE 스트리밍이나 대용량 다운로드 동작이 바뀌지 않습니다.** SSE는 스트림이 끝날 때 전체 소요시간과 함께 기록됩니다.
- 앱이 MDC에 넣은 `requestId`가 있으면 그대로 씁니다. 없으면 `X-Request-Id` 헤더를 쓰고, 그것도 없으면 새로 만듭니다.

**예외** (최우선 `HandlerExceptionResolver`)
- 클래스, 메시지, 스택트레이스, cause 체인
- 예외를 기록만 하고 다음 리졸버로 넘깁니다. 그래서 **앱의 `@RestControllerAdvice`가 만드는 에러 응답은 전혀 바뀌지 않습니다.**
- 대시보드에서 4xx로 처리된 예외(비즈니스 예외)와 5xx(서버 오류)를 색으로 구분합니다.

**외부 호출** (`RestClient`, `RestClient.Builder`, `RestTemplate` 빈)
- 인터셉터를 자동으로 붙입니다. `RestClient.builder()...build()`로 직접 만든 빈도 적용됩니다.
- 상대 서버는 수정할 필요가 없습니다(Python 등 무엇이든).
- `X-Request-Id` 헤더를 전파해서, 상대 서버 로그에서도 같은 ID로 찾을 수 있습니다.
- 연결 실패나 타임아웃은 `ERR`와 예외 정보로 기록되고, 원래 예외는 앱에 그대로 전달됩니다.

**민감정보 마스킹** (기본값, `****`로 저장)
- 헤더: `authorization`, `cookie`, `set-cookie`, `x-api-key`, `x-auth-token`, `proxy-authorization`
- 이름에 `password`, `passwd`, `secret`, `token`, `apikey`, `api-key`, `api_key`, `credential`이 들어간 JSON 필드, 폼 파라미터, 쿼리 파라미터, 헤더
- multipart와 바이너리는 `[multipart/form-data, 3.2MB]` 같은 요약만 저장합니다.

**전송 방식**
- fire-and-forget입니다. 요청 스레드는 큐에 넣기만 하고, 전용 스레드 2개가 JDK `HttpClient`로 전송합니다.
- 타임아웃은 2초, 큐는 1000건입니다. 대시보드가 꺼져 있거나 느리면 **재시도 없이 버리고**, DEBUG 로그만 남깁니다.
- Spring, Servlet, SLF4J는 모두 `compileOnly`입니다. 앱에 새 라이브러리를 끌고 들어가지 않으므로 Jackson 버전 충돌도 없습니다.

---

## 설정 (전부 선택, 환경변수로도 지정 가능)

```yaml
api-monitor:
  enabled: true                    # API_MONITOR_ENABLED
  endpoint:                        # API_MONITOR_ENDPOINT (비우면 자동 탐색)
  discovery-port: 8090             # 자동 탐색할 대시보드 포트
  discovery-interval: 10s
  service-name:                    # 기본: spring.application.name
  instance-id:                     # 기본: HOSTNAME (컨테이너 ID)
  max-body-bytes: 10000
  exclude-paths: [/actuator/**, /health, /favicon.ico]
  mask-headers: [...]              # 지정하면 기본 목록을 대체
  mask-fields: [...]
  request-id-header: X-Request-Id
  mdc-key: requestId
  api-key:                         # 대시보드에 INGEST_API_KEY를 설정한 경우
  timeout: 2s
  sender-threads: 2
  queue-capacity: 1000
  outbound:
    enabled: true
    propagate-request-id: true
    exclude-hosts: []              # 기록하지 않을 host 또는 host:port
```

## 대시보드 서버 설정

| 환경변수 | 기본값 | 설명 |
|---|---|---|
| `PORT` | 8081 (컨테이너 내부) | |
| `DB_PATH` | `/data/monitor.db` | SQLite 파일 |
| `RETENTION_DAYS` | 30 | 이보다 오래된 로그는 1시간마다 삭제 |
| `INGEST_API_KEY` | (비어 있음) | 설정하면 `X-Api-Key`가 일치하는 요청만 수신 |

API는 네 가지입니다.
- `POST /ingest`
- `GET /api/logs`
- `GET /api/logs/:id`
- `GET /api/services`, `GET /api/health`

---

## 폐쇄망 반입

빌드는 개방망에서 합니다. 폐쇄망에서는 외부 다운로드가 일어나지 않습니다.

```bash
# 개방망 (대상 서버가 x86이면 --platform linux/amd64)
docker buildx build --platform linux/amd64 -t api-monitor-server:1.0.0 --load server
docker save api-monitor-server:1.0.0 | gzip > deploy/api-monitor-server-1.0.0.tar.gz   # 약 70MB

# 폐쇄망 (deploy 폴더째 반입)
./install-dashboard.sh
```

앱은 개방망에서 스타터를 포함해 빌드한 이미지를 그대로 반입하면 됩니다.

---

## 제약

- **즉석에서 만든 클라이언트**: 메서드 안에서 즉석으로 만든 `RestClient.create()` 같은 클라이언트는 빈이 아니라서 외부 호출이 기록되지 않습니다.
- **다른 스레드의 외부 호출**: 별도 스레드, `@Scheduled`, MQ 리스너에서 나간 외부 호출은 부모 요청과 연결되지 않고 "백그라운드"로 표시됩니다.
- **HTTP 밖의 예외**: 스케줄러나 MQ 리스너처럼 HTTP 요청이 아닌 곳에서 난 예외는 기록되지 않습니다.
- **요청 바디 버퍼링**: 인터셉터가 붙으면 Spring이 외부 호출의 요청 바디를 메모리에 버퍼링합니다. 아주 큰 업로드 대상은 `outbound.exclude-hosts`로 제외하세요.
- **방화벽**: 리눅스 서버 방화벽이 컨테이너에서 호스트로 가는 접속을 막으면 자동 연결이 안 됩니다. 이 경우 `API_MONITOR_ENDPOINT`를 지정합니다.

---

## 검증

`docker-compose.test.yml`은 JWT 인증, `Exception.class`까지 잡는 `@RestControllerAdvice`, SSE, `RestClient.builder()` 빈, 가짜 Python AI 서버로 구성돼 있습니다. 모니터링 관련 코드는 한 줄도 없습니다.

- 에러 응답은 advice와 EntryPoint가 만든 형식 그대로 나갑니다.
- SSE는 실시간 스트리밍이 유지됩니다.
- 외부 호출의 성공, 500, 타임아웃이 모두 부모 요청 아래에 기록됩니다.
- 비밀번호, 토큰, 쿠키, API 키는 마스킹됩니다.
- 대시보드가 켜져 있을 때, 꺼져 있을 때, 응답이 없을 때 모두 앱 응답시간 차이가 측정 오차 수준입니다(요청 100건 평균 2~3ms).
- 리눅스(Ubuntu 20.04, Docker 27)에서 설정 없이 자동 연결되는 것을 확인했습니다. 대시보드를 앱보다 먼저 띄운 경우와 나중에 띄운 경우, 대시보드를 재설치한 경우를 모두 봤습니다.

```bash
docker build -t api-monitor-server:1.0.0 server
docker compose -f docker-compose.test.yml up -d --build    # 스타터를 Maven Central에서 받아 빌드
```

## 스타터 빌드·배포

```bash
cd starter
./gradlew build                      # JDK 21 필요 (JDK가 없으면 ./build.sh 가 Docker로 빌드)
./gradlew publishToMavenLocal        # 로컬 테스트
./gradlew publishToMavenCentral      # Maven Central (~/.gradle/gradle.properties에 토큰·서명 키 필요)
```

## License

[Apache License 2.0](LICENSE)
