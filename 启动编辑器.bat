@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist node_modules (
  echo 第一次运行，正在安装依赖...
  call npm install
)
echo 正在启动排版编辑器，浏览器会自动打开。关闭这个窗口即可停止。
call npm run editor
pause
