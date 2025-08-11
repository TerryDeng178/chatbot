@echo off
echo ========================================
echo 部署AI问题诊断云函数
echo ========================================
echo.

cd src\backend\debug-ai-issue

echo 正在安装依赖...
call npm install

echo.
echo 正在部署云函数...
call npm run deploy

echo.
echo ========================================
echo 部署完成！
echo ========================================
echo.
echo 使用方法：
echo 1. 在小程序中调用 cloud.callFunction('debug-ai-issue')
echo 2. 查看云函数日志获取详细诊断信息
echo 3. 根据诊断报告进行相应修复
echo.
pause
