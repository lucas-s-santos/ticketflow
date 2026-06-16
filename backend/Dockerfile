# ---- Stage 1: build ----
# Usa a imagem do Maven (o projeto só tem mvnw.cmd do Windows, não o wrapper Unix).
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copia só o pom primeiro para cachear as dependências entre builds.
COPY pom.xml .
RUN mvn -B dependency:go-offline

# Agora o código e o empacotamento. Testes rodam no CI, não na imagem.
COPY src ./src
RUN mvn -B clean package -DskipTests

# ---- Stage 2: runtime ----
# Imagem enxuta só com o JRE para rodar o jar.
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Render injeta a porta via env PORT; o Spring lê server.port=${PORT:8080}.
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
