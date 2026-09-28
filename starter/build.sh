#!/bin/sh
# JDK가 없어도 Docker로 스타터 jar를 빌드한다. 결과: build/libs/api-monitor-spring-boot-starter-1.0.0.jar
cd "$(dirname "$0")"
if command -v java >/dev/null 2>&1; then
  ./gradlew --no-daemon build
else
  docker run --rm -v "$PWD":/w -v apimon-gradle:/root/.gradle -w /w eclipse-temurin:21-jdk ./gradlew --no-daemon build
fi
ls -l build/libs/
