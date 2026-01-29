FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline

COPY src ./src

# Debug: Check if source exists
RUN echo "Checking Source..." && find src -name "*.sql"

# Build
RUN mvn clean package -DskipTests

# Debug: Check if Maven actually put the file in the classes folder
RUN echo "Checking Compiled Classes..." && ls -R target/classes/db/migration || echo "MIGRATION FOLDER MISSING IN TARGET"

# Runtime Stage
FROM eclipse-temurin:17-jre
WORKDIR /app

# COPY SPECIFIC JAR (Use wildcard for version only)
COPY --from=build /app/target/jobmanager-backend-*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]