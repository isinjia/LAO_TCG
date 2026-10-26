@echo off
chcp 65001 >nul
rem LAO card TCG - local server + browser (double-click to run)
rem   "게임 실행.bat"        -> http://localhost:8765
rem   "게임 실행.bat" 9000   -> another port
rem   set NOBROWSER=1        -> start the server only (for tests)
cd /d "%~dp0"

set PORT=%~1
if "%PORT%"=="" set PORT=8765
set URL=http://localhost:%PORT%/index.html

set PY=
py -3 --version >nul 2>nul && set PY=py -3
if not defined PY python --version >nul 2>nul && set PY=python
if not defined PY (
  echo [오류] Python 3을 찾을 수 없습니다. https://www.python.org 에서 설치한 뒤 다시 실행하세요.
  pause
  exit /b 1
)

rem a server already listening on this port: just open the game
netstat -ano | findstr /c:":%PORT% " | findstr /c:"LISTENING" >nul
if not errorlevel 1 (
  echo 서버가 이미 실행 중입니다. 게임만 엽니다: %URL%
  if not "%NOBROWSER%"=="1" start "" "%URL%"
  ping -n 3 127.0.0.1 >nul
  exit /b 0
)

echo 서버 시작: %URL%
echo 이 창을 닫으면 서버가 종료됩니다.
rem open the browser two seconds later, once the server is up
if not "%NOBROWSER%"=="1" start "" /min cmd /c "timeout /t 2 /nobreak >nul & start "" %URL%"
%PY% tools\serve.py %PORT%
pause
