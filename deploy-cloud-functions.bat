@echo off
echo ========================================
echo 云函数快速部署脚本
echo ========================================
echo.
echo 请按照以下步骤操作：
echo.
echo 1. 确保微信开发者工具已打开
echo 2. 确保项目已正确加载
echo 3. 按照提示操作
echo.
pause

echo.
echo 部署步骤：
echo.
echo 步骤1: 右键点击 src/backend/ 目录
echo 步骤2: 选择"上传并部署：云端安装依赖"
echo 步骤3: 等待部署完成
echo.
echo 如果批量部署失败，请逐个部署以下云函数：
echo.
echo - user-report-presence
echo - chat-list-groups  
echo - chat-create-group
echo - chat-send-message
echo - chat-get-messages
echo - chat-ai-greet
echo - user-login
echo - user-update-profile
echo - user-reset-quota
echo - user-report-unlock
echo - user-get-welcome-package
echo - system-status
echo - init-database
echo.
echo 部署完成后，请重新编译小程序并测试
echo.
pause
