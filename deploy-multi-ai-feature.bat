@echo off
echo ========================================
echo 部署多AI群聊功能
echo ========================================
echo.

echo 正在部署 group-chat-multi-ai 云函数...
cd src\backend\group-chat-multi-ai
call npm install
call npm run deploy
cd ..\..

echo.
echo 正在部署 get-ai-personalities 云函数...
cd src\backend\get-ai-personalities
call npm install
call npm run deploy
cd ..\..

echo.
echo 正在部署 init-database 云函数...
cd src\backend\init-database
call npm install
call npm run deploy
cd ..\..

echo.
echo ========================================
echo 部署完成！
echo ========================================
echo.
echo 请在微信开发者工具中：
echo 1. 重新编译项目
echo 2. 测试多AI群聊功能
echo 3. 测试添加/移除AI功能
echo.
echo 如果遇到问题，请检查云函数日志
echo ========================================
pause
