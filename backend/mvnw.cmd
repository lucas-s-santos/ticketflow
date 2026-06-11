@REM ----------------------------------------------------------------------------
@REM Maven Wrapper startup batch script, version 3.3.2
@REM
@REM Uso: .\mvnw.cmd [goals]
@REM Exemplos:
@REM   .\mvnw.cmd spring-boot:run
@REM   .\mvnw.cmd clean package
@REM   .\mvnw.cmd test
@REM
@REM Na primeira execução baixa o Maven (~10MB). Requer conexão com a internet.
@REM ----------------------------------------------------------------------------

@IF "%__MVNW_ARG0_NAME__%"=="" (SET __MVNW_ARG0_NAME__=%~nx0)
@SET __ MVNW_CMD__=
@SETLOCAL

@SET MAVEN_PROJECTBASEDIR=%~dp0
@IF "%MAVEN_PROJECTBASEDIR:~-1%"=="\" SET "MAVEN_PROJECTBASEDIR=%MAVEN_PROJECTBASEDIR:~0,-1%"

@SET WRAPPER_JAR=%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar
@SET WRAPPER_PROPERTIES=%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.properties

@IF NOT EXIST "%WRAPPER_JAR%" (
    @ECHO Downloading Maven Wrapper JAR...
    @powershell -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri 'https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.3.2/maven-wrapper-3.3.2.jar' -OutFile '%WRAPPER_JAR%'"
)

@FOR /F "usebackq tokens=*" %%I IN ('where java 2^>nul') DO (
    SET JAVA_EXE=%%I
    GOTO foundJava
)
@ECHO Error: Java not found. Install Java 21 and ensure it is in PATH.
@EXIT /B 1

:foundJava
@"%JAVA_EXE%" %MAVEN_OPTS% -jar "%WRAPPER_JAR%" %MAVEN_PROJECTBASEDIR% %*
@SET MVNW_EXIT_CODE=%ERRORLEVEL%
@ENDLOCAL & EXIT /B %MVNW_EXIT_CODE%
