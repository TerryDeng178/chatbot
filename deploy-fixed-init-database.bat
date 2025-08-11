@echo off
echo ========================================
echo 部署修复后的 init-database 云函数
echo ========================================
echo.

echo 正在进入 init-database 目录...
cd src\backend\init-database

echo.
echo 正在安装依赖...
call npm install

echo.
echo 依赖安装完成！
echo.
echo 请在微信开发者工具中：
echo 1. 右键点击 init-database 云函数
echo 2. 选择"上传并部署：云端安装依赖"
echo 3. 等待部署完成
echo 4. 在云函数页面点击"测试"按钮
echo.
echo 预期输出：
echo ✅ Users集合初始化完成
echo ✅ Messages集合初始化完成
echo ✅ ChatSessions集合初始化完成
echo ✅ Groups集合初始化完成
echo ✅ GroupMembers集合初始化完成
echo ✅ Bots集合初始化完成
echo ✅ Presence集合初始化完成
echo ✅ 预置群聊数据初始化完成，共创建5个群聊
echo.

pause
