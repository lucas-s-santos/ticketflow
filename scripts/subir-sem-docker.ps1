<#
  Sobe o Canhoto numa máquina Windows sem Docker: PostgreSQL e RabbitMQ
  instalados pelo Scoop, e o backend com o JDK 21. Com Docker, prefira o
  docker compose do README.

  Uma vez só, antes do primeiro uso:
    scoop bucket add java; scoop bucket add extras
    scoop install temurin21-jdk postgresql rabbitmq
    scoop install erlang@28.5.0.8; scoop hold erlang
      # o RabbitMQ 4.3.6 quebra na Erlang 29 (suporte só a partir do 4.3.7);
      # o hold impede o "scoop update" de voltar para a 29
    scoop reset temurin17-jdk
      # opcional: devolve o Java padrão da máquina; o script usa o 21 só aqui dentro

  Uso, na raiz do repositório (o Bypass contorna a política padrão do Windows,
  que bloqueia scripts; vale só para este comando):
    powershell -ExecutionPolicy Bypass -File .\scripts\subir-sem-docker.ps1
    powershell -ExecutionPolicy Bypass -File .\scripts\subir-sem-docker.ps1 -SoInfra   # só banco e fila
  O terminal fica preso no backend.
  Depois, em outro terminal: cd frontend; npm start
#>
param([switch]$SoInfra)
$ErrorActionPreference = 'Stop'

function Escutando([int]$porta) {
  return [bool](Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction SilentlyContinue)
}

function Esperar-Porta([int]$porta, [string]$nome, [string]$log) {
  $limite = (Get-Date).AddSeconds(120)
  while (-not (Escutando $porta)) {
    if ((Get-Date) -gt $limite) { throw "$nome não subiu em 2 minutos. Veja $log" }
    Start-Sleep -Seconds 2
  }
}

$pg = scoop prefix postgresql
$rabbit = scoop prefix rabbitmq
$erlang = scoop prefix erlang
$jdk = scoop prefix temurin21-jdk
$raizScoop = Split-Path (Split-Path (Split-Path $pg -Parent) -Parent) -Parent

# ------------------------------------------------------------------ PostgreSQL
$logPg = "$env:TEMP\canhoto-postgres.log"
if (-not (Escutando 5432)) {
  # Start-Process, e não "&": chamado direto, o servidor herda a saída deste
  # terminal e o prende até o banco ser desligado.
  Start-Process -FilePath "$pg\bin\pg_ctl.exe" -WindowStyle Hidden `
    -ArgumentList @('start', '-D', "`"$pg\data`"", '-l', "`"$logPg`"")
  Esperar-Porta 5432 'PostgreSQL' $logPg
}
# Mesmo usuário e banco do docker-compose.yml, criados só na primeira vez.
$psql = "$pg\bin\psql.exe"
if ((& $psql -U postgres -h localhost -tAc "SELECT 1 FROM pg_roles WHERE rolname = 'canhoto_user'") -ne '1') {
  & $psql -U postgres -h localhost -c "CREATE ROLE canhoto_user LOGIN PASSWORD 'canhoto_pass'" | Out-Null
}
if ((& $psql -U postgres -h localhost -tAc "SELECT 1 FROM pg_database WHERE datname = 'canhoto'") -ne '1') {
  & $psql -U postgres -h localhost -c "CREATE DATABASE canhoto OWNER canhoto_user" | Out-Null
}
Write-Host 'PostgreSQL no ar: localhost:5432 (banco canhoto, usuário canhoto_user)'

# -------------------------------------------------------------------- RabbitMQ
# A Erlang se perde com acento no caminho do perfil do Windows (ex.: "edição"):
# dados, configuração e cookie ficam numa pasta do Scoop, só com ASCII.
$base = Join-Path $raizScoop 'persist\rabbitmq-canhoto'
if ($base -match '[^\x00-\x7F]') {
  Write-Warning "O caminho $base tem acento; o RabbitMQ pode não subir. Instale o Scoop numa pasta sem acento."
}
New-Item -ItemType Directory -Force -Path "$base\home" | Out-Null
$conf = Join-Path $base 'rabbitmq.conf'
if (-not (Test-Path $conf)) {
  # Mesmo usuário e senha do docker-compose.yml, criados no primeiro boot.
  @(
    'listeners.tcp.default = 5672',
    'default_user = canhoto_user',
    'default_pass = canhoto_pass',
    'default_user_tags.administrator = true',
    'default_permissions.configure = .*',
    'default_permissions.read = .*',
    'default_permissions.write = .*'
  ) | Set-Content -Path $conf -Encoding ascii
}
if (-not (Escutando 5672)) {
  # As variáveis valem só para o processo do RabbitMQ: o backend precisa do
  # USERPROFILE original, senão o Maven procura o ~/.m2 na pasta do RabbitMQ.
  $antes = @{}
  $novas = @{
    ERLANG_HOME = $erlang; RABBITMQ_BASE = $base; RABBITMQ_CONFIG_FILE = $conf
    RABBITMQ_NODENAME = 'rabbit@localhost'; USERPROFILE = "$base\home"
    HOMEDRIVE = (Split-Path $base -Qualifier); HOMEPATH = ((Split-Path $base -NoQualifier) + '\home')
  }
  foreach ($nome in $novas.Keys) {
    $antes[$nome] = [Environment]::GetEnvironmentVariable($nome, 'Process')
    [Environment]::SetEnvironmentVariable($nome, $novas[$nome], 'Process')
  }
  try {
    Start-Process -FilePath "$rabbit\sbin\rabbitmq-server.bat" -WindowStyle Hidden
  } finally {
    foreach ($nome in $antes.Keys) { [Environment]::SetEnvironmentVariable($nome, $antes[$nome], 'Process') }
  }
  Esperar-Porta 5672 'RabbitMQ' "$base\log"
}
Write-Host 'RabbitMQ no ar: localhost:5672 (usuário canhoto_user)'

if ($SoInfra) { return }

# --------------------------------------------------------------------- Backend
$env:JAVA_HOME = $jdk
$env:Path = "$jdk\bin;$env:Path"
# O application.yml só libera a porta 4200; um segundo front (ng serve --port 4201)
# para comparar versões ficaria bloqueado pelo CORS.
if (-not $env:APP_CORS_ALLOWED_ORIGINS) {
  $env:APP_CORS_ALLOWED_ORIGINS = 'http://localhost:4200,http://localhost:4201'
}
Set-Location (Join-Path $PSScriptRoot '..\backend')
Write-Host 'Subindo o backend em http://localhost:8080 (Ctrl+C para parar)...'
.\mvnw.cmd spring-boot:run
