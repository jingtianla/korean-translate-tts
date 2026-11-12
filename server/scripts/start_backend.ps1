# 启动后端（Windows / PowerShell）
# 用法：在项目根目录执行  powershell -ExecutionPolicy Bypass -File server/scripts/start_backend.ps1
# 等价的跨平台方式见根目录 docker-compose.yml

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Server = Join-Path $Root "server"
$Venv = Join-Path $Root ".venv"
$Py = Join-Path $Venv "Scripts\python.exe"

Set-Location $Root

if (-not (Test-Path $Py)) {
    Write-Host "[1/4] 创建虚拟环境 .venv ..." -ForegroundColor Cyan
    python -m venv $Venv
}

Write-Host "[2/4] 安装核心依赖 ..." -ForegroundColor Cyan
& $Py -m pip install --quiet --upgrade pip
& $Py -m pip install --quiet -r (Join-Path $Server "requirements.txt")

$Optional = Join-Path $Server "requirements-optional.txt"
if ($env:INSTALL_OPTIONAL -eq "1") {
    Write-Host "[3/4] 安装可选引擎（Argos + edge-tts）..." -ForegroundColor Cyan
    & $Py -m pip install -r $Optional
    & $Py (Join-Path $Server "scripts\setup_argos.py")
} else {
    Write-Host "[3/4] 跳过可选引擎（设 INSTALL_OPTIONAL=1 可安装离线翻译与服务端语音）" -ForegroundColor Yellow
    Write-Host "      当前翻译走在线免费接口，发音由浏览器 Web Speech 兜底" -ForegroundColor Yellow
}

Write-Host "[4/4] 启动服务 http://localhost:8000 ..." -ForegroundColor Cyan
$env:PYTHONPATH = $Server
& $Py -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --app-dir $Server
