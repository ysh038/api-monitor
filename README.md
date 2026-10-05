# API Monitor

[![Maven Central](https://img.shields.io/maven-central/v/io.github.ysh038/api-monitor-spring-boot-starter)](https://central.sonatype.com/artifact/io.github.ysh038/api-monitor-spring-boot-starter)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)

Spring Boot 앱에 **의존성 한 줄**만 추가하면, 그 앱에 들어온 요청·응답·예외와 앱이 호출한 외부 API를 **앱 안의 대시보드(`/_api-monitor`)**에서 볼 수 있습니다. 연계 테스트 중에 "요청이 어떤 값으로 들어왔는지, 무엇을 응답했는지, 내부에서 어떤 예외가 났는지"를 로그 grep 없이 확인하는 용도입니다.

```
Spring Boot 앱 (+ starter)
 ├─ 들어온 요청/응답 캡처       ─┐
 ├─ 예외 캡처 (응답 변경 없음)   ─┼─▶ api-monitor-data/ (날짜별 파일, 30일)  ─▶  http://<앱>/_api-monitor
 └─ 외부 호출(RestClient 등) 캡처 ─┘                      └─(선택) 별도 대시보드 서버로도 전송
```

- **지원 환경**: Spring Boot 3.2 이상 / 4.x (Servlet, Spring MVC), Java 17 이상
- **검증 버전**: Spring Boot 3.2.12, 3.5.16, 4.0.5
- **미지원**: WebFlux(리액티브) 앱

---

## 빠른 시작

### 1. 의존성 추가

Gradle:
```groovy
dependencies {
    implementation 'io.github.ysh038:api-monitor-spring-boot-starter:1.4.0'
}
```

Maven:
```xml
<dependency>
    <groupId>io.github.ysh038</groupId>
    <artifactId>api-monitor-spring-boot-starter</artifactId>
    <version>1.4.0</version>
</dependency>
```

### 2. 평소처럼 빌드·배포

코드, `application.yml`, Dockerfile, compose 파일은 수정하지 않습니다. 기동 로그에 아래 줄이 나오면 적용된 것입니다.

```
[api-monitor] 활성화: service=my-api, 대시보드: /_api-monitor, 저장 위치: /app/api-monitor-data, 외부 전송: 없음
```

### 3. 대시보드 열기

```
http://<앱 주소>:<앱 포트>/_api-monitor
```

- `server.servlet.context-path`가 있으면 그 아래(`/<context-path>/_api-monitor`)에서 열립니다.
- 경로는 `application.yaml`의 `api-monitor.dashboard.path`(환경변수 `API_MONITOR_DASHBOARD_PATH`)로 바꿀 수 있습니다. 앱의 실제 API 경로와 겹치지 않게 정하세요.
  ```yaml
  api-monitor:
    dashboard:
      path: /monitor      # → http://<앱 주소>:<앱 포트>/monitor
  ```
- 화면 오른쪽 위에서 테마(자동/라이트/다크)를 고를 수 있습니다. 선택은 브라우저에 저장됩니다.
- 앱의 Spring Security 설정과 관계없이 열립니다. 스타터 필터가 Security보다 먼저 이 경로를 처리합니다.
- 대시보드 자체에 대한 요청은 기록하지 않습니다.
- 목록은 5초마다 자동으로 갱신됩니다.

앱마다 자기 대시보드를 가집니다. 서버에 앱이 여러 개 떠 있으면 각 앱의 포트에서 각자의 대시보드가 열립니다.

---

## 기록 보관

기록은 앱 실행 폴더의 `api-monitor-data/`에 날짜별 파일(`api-monitor-YYYY-MM-DD.jsonl`)로 쌓이고, 30일이 지나면 삭제됩니다. 앱이 켜질 때 최근 5000건을 다시 읽어 대시보드에 보여줍니다. 실제 저장 경로는 기동 로그의 `저장 위치`에 나옵니다.

| 상황 | 기록 |
|---|---|
| 앱 재시작 (`docker restart`, 프로세스 재시작) | 유지 |
| 컨테이너 재생성 (새 이미지로 재배포, `down` 후 `up`) | **삭제** |
| 컨테이너 재생성 + 볼륨 연결 | 유지 |
| 도커 없이 `java -jar` 실행 | 유지 (서버 디스크에 바로 쌓임) |

**재배포 후에도 남기고 싶을 때**는 compose의 앱 서비스에 볼륨 한 줄을 추가합니다. 오른쪽 경로는 기동 로그의 `저장 위치`를 그대로 씁니다.

```yaml
services:
  app:
    volumes:
      - ./api-monitor-data:/app/api-monitor-data
```

이미 볼륨으로 연결된 폴더(예: 로그 폴더)가 있으면, 볼륨을 추가하는 대신 저장 위치를 그 아래로 지정해도 됩니다.
```
API_MONITOR_STORAGE_DIR=/app/logs/api-monitor
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
- 대시보드에서 들어온 요청 아래에 그 요청 중 나간 외부 호출이 묶여 보입니다.
- `X-Request-Id` 헤더를 전파해서, 상대 서버 로그에서도 같은 ID로 찾을 수 있습니다.
- 연결 실패나 타임아웃은 `ERR`와 예외 정보로 기록되고, 원래 예외는 앱에 그대로 전달됩니다.

**민감정보 마스킹** (기본값, `****`로 저장)
- 헤더: `authorization`, `cookie`, `set-cookie`, `x-api-key`, `x-auth-token`, `proxy-authorization`
- 이름에 `password`, `passwd`, `secret`, `token`, `apikey`, `api-key`, `api_key`, `credential`이 들어간 JSON 필드, 폼 파라미터, 쿼리 파라미터, 헤더
- multipart와 바이너리는 `[multipart/form-data, 3.2MB]` 같은 요약만 저장합니다.

**앱에 주는 영향**
- 캡처한 기록은 전용 스레드 1개가 처리합니다(마스킹, 파일 저장). 요청 스레드는 대기열에 넣기만 하고 바로 돌아갑니다.
- 대기열(1000건)이 가득 차면 새 기록을 버립니다.
- Spring, Servlet, SLF4J는 모두 `compileOnly`입니다. 앱에 새 라이브러리를 끌고 들어가지 않습니다(런타임 의존성 0개).

---

## 주의: 대시보드 접근

대시보드에는 인증이 없습니다. 앱 주소를 아는 사람은 누구나 `/_api-monitor`에서 요청과 응답 내용을 볼 수 있습니다(민감값은 마스킹됨). 외부에 공개된 운영 서버에서는 꺼 두세요.

```
API_MONITOR_ENABLED=false             # 스타터 전체 끄기
API_MONITOR_DASHBOARD_ENABLED=false   # 대시보드만 끄기 (별도 대시보드 전송은 유지)
```

---

## 설정 (전부 선택, 환경변수로도 지정 가능)

```yaml
api-monitor:
  enabled: true                    # API_MONITOR_ENABLED
  dashboard:
    enabled: true                  # API_MONITOR_DASHBOARD_ENABLED
    path: /_api-monitor            # API_MONITOR_DASHBOARD_PATH
  storage-dir: api-monitor-data    # API_MONITOR_STORAGE_DIR (비우면 메모리에만 보관)
  retention-days: 30
  max-events-in-memory: 5000       # 대시보드에서 조회 가능한 최근 기록 수
  service-name:                    # 기본: spring.application.name
  instance-id:                     # 기본: HOSTNAME (컨테이너 ID)
  max-body-bytes: 10000
  exclude-paths: [/actuator/**, /health, /favicon.ico]
  mask-headers: [...]              # 지정하면 기본 목록을 대체
  mask-fields: [...]
  request-id-header: X-Request-Id
  mdc-key: requestId
  queue-capacity: 1000
  outbound:
    enabled: true
    propagate-request-id: true
    exclude-hosts: []              # 기록하지 않을 host 또는 host:port
  # (선택) 별도 대시보드 서버로도 보내기
  endpoint:                        # API_MONITOR_ENDPOINT  예: http://10.0.0.5:8090/ingest
  api-key:                         # 별도 대시보드에 INGEST_API_KEY를 설정한 경우
  timeout: 2s
  sender-threads: 2
  discovery-enabled: false         # true면 endpoint 없이 같은 서버의 별도 대시보드(8090)를 자동 탐색
```

---

## (선택) 여러 서버의 기록을 한곳에서 보기: 별도 대시보드

앱마다 내장 대시보드가 있으므로 보통은 필요 없습니다. 여러 앱의 기록을 한 화면에 모으고 싶을 때만 씁니다.

```bash
git clone https://github.com/ysh038/api-monitor.git && cd api-monitor
docker build -f server/Dockerfile -t api-monitor-server:1.0.0 .   # 저장소 루트에서 (화면 빌드 포함)
./deploy/install-dashboard.sh          # http://<서버IP>:8090 (재부팅 시 자동 시작, 30일 보관)
```

각 앱에 `API_MONITOR_ENDPOINT=http://<서버IP>:8090/ingest`를 지정하면, 내장 대시보드와 별도 대시보드 양쪽에 기록됩니다.

- 포트 변경: `./deploy/install-dashboard.sh 9000`
- compose로 띄우기: `docker compose -f deploy/docker-compose.api-monitor.yml up -d`
- 삭제: `docker rm -f api-monitor && docker volume rm api-monitor-data`
- 서버 설정(환경변수): `RETENTION_DAYS`(30), `INGEST_API_KEY`(비어 있으면 인증 없음)
- 폐쇄망 반입:
  ```bash
  docker buildx build --platform linux/amd64 -f server/Dockerfile -t api-monitor-server:1.0.0 --load .
  docker save api-monitor-server:1.0.0 | gzip > deploy/api-monitor-server-1.0.0.tar.gz
  ```
  `deploy/` 폴더째 반입한 뒤 `./install-dashboard.sh`를 실행합니다.

---

## 제약

- **즉석에서 만든 클라이언트**: 메서드 안에서 즉석으로 만든 `RestClient.create()` 같은 클라이언트는 빈이 아니라서 외부 호출이 기록되지 않습니다.
- **다른 스레드의 외부 호출**: 별도 스레드, `@Scheduled`, MQ 리스너에서 나간 외부 호출은 부모 요청과 연결되지 않고 "백그라운드"로 표시됩니다.
- **HTTP 밖의 예외**: 스케줄러나 MQ 리스너처럼 HTTP 요청이 아닌 곳에서 난 예외는 기록되지 않습니다.
- **요청 바디 버퍼링**: 인터셉터가 붙으면 Spring이 외부 호출의 요청 바디를 메모리에 버퍼링합니다. 아주 큰 업로드 대상은 `outbound.exclude-hosts`로 제외하세요.

---

## 검증

`docker-compose.test.yml`의 샘플 앱은 JWT 인증, `Exception.class`까지 잡는 `@RestControllerAdvice`, SSE, `RestClient.builder()` 빈, 가짜 Python AI 서버로 구성돼 있습니다. 모니터링 관련 코드는 한 줄도 없습니다.

- Security가 모든 경로에 인증을 요구해도 `/_api-monitor`는 열리고, 보호된 API는 그대로 401입니다.
- 에러 응답은 advice와 EntryPoint가 만든 형식 그대로 나갑니다.
- SSE는 실시간 스트리밍이 유지됩니다(0.4초 간격 그대로).
- 외부 호출의 성공, 500, 타임아웃이 모두 부모 요청 아래에 기록되고, 비밀번호·토큰·쿠키·API 키는 마스킹됩니다.
- 재시작하면 기록이 유지되고, 컨테이너를 재생성하면 삭제되며, 볼륨을 연결하면 유지되는 것을 확인했습니다.

```bash
docker compose -f docker-compose.test.yml up -d --build
open http://localhost:9999/_api-monitor
```

## 스타터 빌드·배포

```bash
cd starter
./gradlew build                      # JDK 21 + Node 22 필요 (없으면 ./build.sh 가 Docker로 빌드)
./gradlew publishToMavenLocal        # 로컬 테스트
./gradlew publishToMavenCentral      # Maven Central (~/.gradle/gradle.properties에 토큰·서명 키 필요)
```

대시보드 화면은 `dashboard-ui/`(React + Vite)입니다. 스타터를 빌드하면 `dashboard-ui`에서 `npm ci && npm run build`가 먼저 실행되고, 그 결과(`dist/`)가 jar에 들어갑니다. 별도 대시보드 서버(Node)도 같은 빌드 결과를 서빙합니다. 스타터를 **쓰는** 앱에는 Node가 필요 없습니다.

화면 개발:
```bash
cd server && npm ci && npm run dev          # API + Mock 데이터 (http://localhost:8081)
cd dashboard-ui && npm ci && npm run dev    # 화면 (http://localhost:5180, /api 는 8081로 프록시)
```
자세한 내용은 [dashboard-ui/README.md](dashboard-ui/README.md)를 참고하세요.

## License

[Apache License 2.0](LICENSE)
