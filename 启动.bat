@echo off
chcp 65001 >nul
title 红色文化馆网页版
cd /d "%~dp0"

set NODE_EXE=node
where node >nul 2>&1
if %errorlevel%==0 goto :run
set "NODE_EXE=C:\Program Files (x86)\Tencent\微信web开发者工具\node.exe"
if not exist "%NODE_EXE%" (
	echo 未找到 Node.js，请先安装 Node.js 或微信开发者工具
	pause
	exit /b 1
)

:run
echo 正在启动服务...
start "" http://localhost:3000
"%NODE_EXE%" server\index.js
pause
