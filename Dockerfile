FROM gradle:8.7-jdk17 AS build
WORKDIR /app

COPY build.gradle settings.gradle ./
COPY src ./src
RUN gradle bootJar --no-daemon

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
ENV PORT=10000

COPY --from=build /tmp/english-school-crm-build/libs/*.jar app.jar

EXPOSE 10000
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=65.0", "-jar", "app.jar"]
