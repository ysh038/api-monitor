# syntax=docker/dockerfile:1
# 빌드 단계는 빌드하는 머신 아키텍처로 실행하고(jar는 아키텍처 무관), 실행 이미지만 대상 플랫폼으로 만든다.
FROM --platform=$BUILDPLATFORM eclipse-temurin:26-jdk-alpine AS builder
WORKDIR /workspace
COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
COPY src ./src
RUN --mount=type=cache,target=/root/.gradle/caches \
    --mount=type=cache,target=/root/.gradle/wrapper \
    chmod +x ./gradlew \
    && ./gradlew --no-daemon bootJar

FROM eclipse-temurin:26-jre-alpine
WORKDIR /app
COPY --from=builder /workspace/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
