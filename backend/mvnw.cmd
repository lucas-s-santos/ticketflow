@REM ----------------------------------------------------------------------------
@REM Maven Wrapper startup batch script (Windows)
@REM
@REM Uso: .\mvnw.cmd [goals]
@REM Exemplos:
@REM   .\mvnw.cmd spring-boot:run
@REM   .\mvnw.cmd clean package
@REM   .\mvnw.cmd -B verify
@REM
@REM No PowerShell o ".\" e obrigatorio: ele nao executa comandos do diretorio atual.
@REM Na primeira execucao baixa o Maven (~10MB). Requer conexao com a internet.
@REM ----------------------------------------------------------------------------

@ECHO OFF
SETLOCAL

SET "MAVEN_PROJECTBASEDIR=%~dp0"
IF "%MAVEN_PROJECTBASEDIR:~-1%"=="\" SET "MAVEN_PROJECTBASEDIR=%MAVEN_PROJECTBASEDIR:~0,-1%"

SET "WRAPPER_JAR=%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar"
SET "WRAPPER_URL=https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.3.2/maven-wrapper-3.3.2.jar"

IF NOT EXIST "%WRAPPER_JAR%" (
    ECHO Baixando o Maven Wrapper...
    powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri '%WRAPPER_URL%' -OutFile '%WRAPPER_JAR%'"
)
IF NOT EXIST "%WRAPPER_JAR%" (
    ECHO ERRO: nao foi possivel baixar o Maven Wrapper de %WRAPPER_URL%
    EXIT /B 1
)

@REM JAVA_HOME tem prioridade sobre o PATH: em maquinas com um JRE antigo instalado,
@REM "where java" devolve o JRE errado e a compilacao falha com "release 21 not supported".
SET "JAVA_EXE="
IF DEFINED JAVA_HOME IF EXIST "%JAVA_HOME%\bin\java.exe" SET "JAVA_EXE=%JAVA_HOME%\bin\java.exe"
IF NOT DEFINED JAVA_EXE (
    FOR /F "delims=" %%I IN ('where java 2^>nul') DO (
        IF NOT DEFINED JAVA_EXE SET "JAVA_EXE=%%I"
    )
)
IF NOT DEFINED JAVA_EXE (
    ECHO ERRO: Java nao encontrado. Instale o JDK 21 e defina JAVA_HOME,
    ECHO       ou garanta que "java" esteja no PATH.
    EXIT /B 1
)

"%JAVA_EXE%" %MAVEN_OPTS% -classpath "%WRAPPER_JAR%" "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR%" org.apache.maven.wrapper.MavenWrapperMain %*
SET "MVNW_EXIT_CODE=%ERRORLEVEL%"
ENDLOCAL & EXIT /B %MVNW_EXIT_CODE%
