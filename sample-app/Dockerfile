# syntax=docker/dockerfile:1
FROM eclipse-temurin:26-jdk-alpine AS builder
WORKDIR /workspace
COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
COPY src ./src
RUN --mount=type=cache,target=/root/.gradle/caches \
    --mount=type=cache,target=/root/.gradle/wrapper \
    chmod +x ./gradlew \
    && ./gradlew --no-daemon bootJar

FROM eclipse-temurin:26-jdk-alpine
WORKDIR /app
COPY --from=builder /workspace/build/libs/*.jar app.jar
EXPOSE 9999
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
