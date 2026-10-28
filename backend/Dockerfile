# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 – build the fat JAR using the project's own Maven wrapper
# ─────────────────────────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jdk-alpine AS builder

# Install dos2unix so we can fix Windows CRLF line endings on mvnw
RUN apk add --no-cache dos2unix

WORKDIR /build

# Copy Maven wrapper metadata first (cache friendly)
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./

# Fix CRLF → LF on the Maven wrapper script (Windows hosts write CRLF)
# then make it executable and pre-download all dependencies
RUN dos2unix mvnw && chmod +x mvnw && ./mvnw dependency:go-offline -q

# Copy source and package; skip tests during image build
# (Tests need Docker for the MySQL Testcontainer — they run in CI and via mvnw verify)
COPY src/ src/
RUN ./mvnw package -DskipTests -q

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 – minimal JRE runtime image
# ─────────────────────────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine AS runtime

# Create a non-root user for the application
RUN addgroup -S -g 1000 mealsync && adduser -S -u 1000 -G mealsync mealsync

WORKDIR /app

# Copy only the fat JAR from the build stage
COPY --from=builder /build/target/*.jar app.jar

# Own the app directory
RUN chown -R mealsync:mealsync /app

USER mealsync

EXPOSE 8080 8081

# ── Health check ──────────────────────────────────────────────────────────────
# Actuator readiness on the internal management port (8081).
HEALTHCHECK --interval=20s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8081/actuator/health/readiness || exit 1

# Spring Boot reads DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD, JWT_SECRET from the environment
ENTRYPOINT ["java", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
