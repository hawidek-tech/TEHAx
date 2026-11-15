# ACCESSFLOW - single image: Spring Boot API serving the built frontend (one origin for app, API and embeds).
# NOTE: written for Docker but NOT yet run in this project's environment (Docker was not installed). See PROJECT_STATUS.md.

# ---- 1. Frontend build ---------------------------------------------------------------------------------------------
FROM node:22-alpine AS frontend
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---- 2. Backend build ----------------------------------------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /src/backend
COPY backend/pom.xml ./
RUN mvn -B -q dependency:go-offline
COPY backend/src ./src
RUN mvn -B -q -DskipTests package

# ---- 3. Runtime ----------------------------------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S accessflow && adduser -S accessflow -G accessflow
WORKDIR /app
COPY --from=backend /src/backend/target/accessflow-backend-*.jar /app/accessflow.jar
COPY --from=frontend /src/frontend/dist /app/frontend
RUN mkdir -p /app/storage && chown -R accessflow:accessflow /app
USER accessflow
ENV ACCESSFLOW_FRONTEND_DIR=/app/frontend \
    ACCESSFLOW_STORAGE_DIR=/app/storage \
    SERVER_PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --retries=10 CMD wget -qO- http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/accessflow.jar"]
