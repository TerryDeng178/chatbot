@echo off
setlocal ENABLEDELAYEDEXPANSION

set ENV_ID=cloud3-8gtjhkakd53d4fdc
echo 🚀 部署必要云函数到环境: %ENV_ID%
echo.

REM ===== group-chat-get-messages =====
echo 📦 部署 group-chat-get-messages ...
cd src\backend\group-chat-get-messages
call npm install --no-audit --no-fund
call tcb fn deploy group-chat-get-messages -e %ENV_ID% --force
if errorlevel 1 (
  echo ❌ 部署 group-chat-get-messages 失败
  cd ..\..\..
  exit /b 1
)
cd ..\..
echo ✅ group-chat-get-messages 部署完成
echo.

REM ===== group-chat-multi-ai =====
echo 📦 部署 group-chat-multi-ai ...
cd src\backend\group-chat-multi-ai
call npm install --no-audit --no-fund
call tcb fn deploy group-chat-multi-ai -e %ENV_ID% --force
if errorlevel 1 (
  echo ❌ 部署 group-chat-multi-ai 失败
  cd ..\..\..
  exit /b 1
)
cd ..\..
echo ✅ group-chat-multi-ai 部署完成
echo.

echo 🎉 必要云函数部署完成！
echo   - group-chat-get-messages
echo   - group-chat-multi-ai
exit /b 0


