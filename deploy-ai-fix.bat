@echo off
echo ========================================
echo AI功能修复云函数部署脚本
echo ========================================
echo.

echo 此脚本将部署修复后的AI相关云函数
echo 解决"获取AI性格列表失败"的问题
echo.

echo 请按照以下步骤操作：
echo.

echo [步骤1] 部署修复后的 get-ai-personalities 云函数
echo - 在微信开发者工具中展开 src/backend/get-ai-personalities/ 目录
echo - 右键点击该目录
echo - 选择"上传并部署：云端安装依赖"
echo - 等待部署完成
echo.
pause

echo [步骤2] 部署修复后的 init-database 云函数
echo - 在微信开发者工具中展开 src/backend/init-database/ 目录
echo - 右键点击该目录
echo - 选择"上传并部署：云端安装依赖"
echo - 等待部署完成
echo.
pause

echo ========================================
echo AI功能修复云函数部署完成！
echo ========================================
echo.

echo 验证步骤：
echo 1. 在微信开发者工具中进入"云开发"面板
echo 2. 检查"云函数"列表，确认以下函数状态为"正常"：
echo    - get-ai-personalities
echo    - init-database
echo 3. 重新编译并运行小程序
echo 4. 进入群聊页面，观察控制台日志
echo 5. 检查是否还有"获取AI性格列表失败"的错误
echo.

echo 预期结果：
echo - 云函数应该返回详细的调试日志
echo - 数据库环境检查应该显示当前集合列表
echo - AI性格列表应该能正常获取
echo.

echo 如果仍有问题，请检查：
echo - 云函数部署状态
echo - 云开发控制台中的云函数日志
echo - 数据库权限设置
echo - 云开发环境配置
echo.

pause
