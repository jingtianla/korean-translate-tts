@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion
cd /d "%~dp0"

set "PY=%~dp0.venv\Scripts\python.exe"
set "APPDIR=%~dp0server"
set "URL=http://127.0.0.1:8000"
set "HEALTH=%URL%/api/health"

echo.
echo   ============================================
echo      中→韩 翻译发音台  启动器
echo   ============================================
echo.

REM ---- 1. 检查 Python 虚拟环境与后端依赖 ----
if not exist "%PY%" (
  echo   [1/4] 未找到虚拟环境，正在创建 .venv ...
  where python >nul 2>&1
  if errorlevel 1 (
    echo   [错误] 系统未安装 Python，请先安装 Python 3.10+ 并加入 PATH。
    goto :fail
  )
  python -m venv "%~dp0.venv"
  if not exist "%PY%" (
    echo   [错误] 虚拟环境创建失败，请查看上方提示。
    goto :fail
  )
  echo         正在安装后端依赖 ^(首次约需 1 分钟^) ...
  "%PY%" -m pip install -q -r "%~dp0server\requirements.txt"
  "%PY%" -m pip install -q edge-tts==7.3.1
)

REM ---- 2. 检查前端静态产物 ----
if not exist "%~dp0web\dist\index.html" (
  echo   [2/4] 前端尚未构建，正在构建 ^(首次约需 1-3 分钟^) ...
  where npm >nul 2>&1
  if errorlevel 1 (
    echo   [错误] 未找到 Node.js / npm，请先安装 Node.js 18+。
    goto :fail
  )
  pushd "%~dp0web"
  call npm install --no-audit --no-fund
  call npm run build
  popd
  if not exist "%~dp0web\dist\index.html" (
    echo   [错误] 前端构建失败，请查看上方 npm 输出。
    goto :fail
  )
)

REM ---- 3. 检查服务；未运行则启动，并等待健康检查通过 ----
echo   [3/4] 检查服务状态 ...
"%PY%" -c "import urllib.request;urllib.request.urlopen('%HEALTH%',timeout=2)" >nul 2>&1
if not errorlevel 1 (
  echo         服务已在运行，无需重复启动。
  goto :open
)

set "PYTHONPATH=%APPDIR%"
echo         正在启动后端服务 ^(会有一个最小化窗口，关闭它即停止服务^) ...
start "中→韩 翻译发音台 - 服务" /min "%PY%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --app-dir "%APPDIR%"

set /a TRIES=0
:wait
set /a TRIES+=1
"%PY%" -c "import urllib.request;urllib.request.urlopen('%HEALTH%',timeout=2)" >nul 2>&1
if not errorlevel 1 goto :ready
if !TRIES! GEQ 25 (
  echo   [错误] 服务启动超时，请检查 8000 端口是否被其他程序占用。
  goto :fail
)
ping -n 2 127.0.0.1 >nul
goto :wait

:ready
echo         服务已就绪。

REM ---- 4. 打开浏览器 ----
:open
echo   [4/4] 正在打开浏览器 ...
if not "%KO_SKIP_BROWSER%"=="1" start "" "%URL%"
echo.
echo   完成！网页地址： %URL%
echo   服务窗口最小化在任务栏，关闭该窗口即可停止服务。
echo   再次双击本文件不会重复启动，只会打开网页。
echo.
ping -n 6 127.0.0.1 >nul
exit /b 0

:fail
echo.
echo   启动失败，请按提示处理后重试；详见 README.md 的「常见问题」。
echo.
pause
exit /b 1
