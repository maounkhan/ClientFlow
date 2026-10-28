FROM node:24-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM maven:3.9.9-eclipse-temurin-21 AS backend
WORKDIR /app
COPY backend/ backend/
COPY --from=frontend /app/frontend/dist frontend/dist
RUN mvn -f backend/pom.xml -B clean verify

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S clientflow && adduser -S clientflow -G clientflow
WORKDIR /app
COPY --from=backend --chown=clientflow:clientflow /app/backend/target/clientflow-1.0.0.jar app.jar
RUN mkdir -p /app/data && chown clientflow:clientflow /app/data
USER clientflow
ENV SERVER_ADDRESS=0.0.0.0
EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar"]
