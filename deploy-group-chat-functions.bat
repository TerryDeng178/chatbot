@echo off
echo 🚀 开始部署群聊相关云函数...

echo.
echo 📦 部署 group-chat-send-message 云函数...
cd src\backend\group-chat-send-message
call npm install
call tcb fn deploy group-chat-send-message --force
cd ..\..

echo.
echo 📦 部署 group-chat-get-messages 云函数...
cd src\backend\group-chat-get-messages
call npm install
call tcb fn deploy group-chat-get-messages --force
cd ..\..

echo.
echo 📦 部署 chat-ai-greet 云函数...
cd src\backend\chat-ai-greet
call npm install
call tcb fn deploy chat-ai-greet --force
cd ..\..

echo.
echo 📦 部署 chat-list-groups 云函数...
cd src\backend\chat-list-groups
call npm install
call tcb fn deploy chat-list-groups --force
cd ..\..

echo.
echo 📦 部署 chat-create-group 云函数...
cd src\backend\chat-create-group
call npm install
call tcb fn deploy chat-create-group --force
cd ..\..

echo.
echo 📦 部署 user-report-presence 云函数...
cd src\backend\user-report-presence
call npm install
call tcb fn deploy user-report-presence --force
cd ..\..

echo.
echo ✅ 群聊云函数部署完成！
echo.
echo 📋 已部署的云函数：
echo   - group-chat-send-message (群聊消息发送)
echo   - group-chat-get-messages (群聊消息获取)
echo   - chat-ai-greet (AI主动发言)
echo   - chat-list-groups (群聊列表)
echo   - chat-create-group (创建群聊)
echo   - user-report-presence (在线状态)
echo.
echo �� 群聊功能已准备就绪！
pause
