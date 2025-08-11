@echo off
echo ========================================
echo 群聊云函数批量部署脚本
echo ========================================
echo.

echo 请按照以下步骤操作：
echo.
echo 1. 确保微信开发者工具已打开
echo 2. 确保项目已加载到微信开发者工具中
echo 3. 按照脚本提示依次部署云函数
echo.

echo 开始部署云函数...
echo.

echo [步骤1] 部署 get-ai-personalities 云函数
echo - 在微信开发者工具中展开 src/backend/get-ai-personalities/ 目录
echo - 右键点击该目录
echo - 选择"上传并部署：云端安装依赖"
echo - 等待部署完成
echo.
pause

echo [步骤2] 部署 group-chat-info 云函数
echo - 在微信开发者工具中展开 src/backend/group-chat-info/ 目录
echo - 右键点击该目录
echo - 选择"上传并部署：云端安装依赖"
echo - 等待部署完成
echo.
pause

echo [步骤3] 部署 chat-create-sample-session 云函数
echo - 在微信开发者工具中展开 src/backend/chat-create-sample-session/ 目录
echo - 右键点击该目录
echo - 选择"上传并部署：云端安装依赖"
echo - 等待部署完成
echo.
pause

echo [步骤4] 部署 chat-mark-all-read 云函数
echo - 在微信开发者工具中展开 src/backend/chat-mark-all-read/ 目录
echo - 右键点击该目录
echo - 选择"上传并部署：云端安装依赖"
echo - 等待部署完成
echo.
pause

echo [步骤5] 部署 chat-send-message-simple 云函数
echo - 在微信开发者工具中展开 src/backend/chat-send-message-simple/ 目录
echo - 右键点击该目录
echo - 选择"上传并部署：云端安装依赖"
echo - 等待部署完成
echo.
pause

echo [步骤6] 部署 chat-test 云函数
echo - 在微信开发者工具中展开 src/backend/chat-test/ 目录
echo - 右键点击该目录
echo - 选择"上传并部署：云端安装依赖"
echo - 等待部署完成
echo.
pause

echo [步骤7] 部署 check-database 云函数
echo - 在微信开发者工具中展开 src/backend/check-database/ 目录
echo - 右键点击该目录
echo - 选择"上传并部署：云端安装依赖"
echo - 等待部署完成
echo.
pause

echo [步骤8] 部署 group-chat-create 云函数
echo - 在微信开发者工具中展开 src/backend/group-chat-create/ 目录
echo - 右键点击该目录
echo - 选择"上传并部署：云端安装依赖"
echo - 等待部署完成
echo.
pause

echo [步骤9] 部署 group-chat-list 云函数
echo - 在微信开发者工具中展开 src/backend/group-chat-list/ 目录
echo - 右键点击该目录
echo - 选择"上传并部署：云端安装依赖"
echo - 等待部署完成
echo.
pause

echo ========================================
echo 所有云函数部署完成！
echo ========================================
echo.

echo 验证步骤：
echo 1. 在微信开发者工具中进入"云开发"面板
echo 2. 检查"云函数"列表，确认所有9个函数状态为"正常"
echo 3. 重新编译并运行小程序
echo 4. 进入群聊页面，观察控制台是否还有错误
echo.

echo 如果仍有问题，请检查：
echo - 云函数部署状态
echo - 数据库权限设置
echo - 云开发环境配置
echo.

pause
