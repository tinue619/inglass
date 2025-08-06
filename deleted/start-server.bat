@echo off
echo ========================================
echo    INGLASS CRM Server - Запуск сервера
echo ========================================
echo.

cd /d "%~dp0server"

echo Проверяем наличие Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ОШИБКА: Node.js не установлен!
    echo Скачайте и установите Node.js с сайта: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js найден: 
node --version

echo.
echo Проверяем зависимости...
if not exist "node_modules" (
    echo Устанавливаем зависимости...
    npm install
    if %errorlevel% neq 0 (
        echo ОШИБКА: Не удалось установить зависимости!
        pause
        exit /b 1
    )
) else (
    echo Зависимости уже установлены
)

echo.
echo ========================================
echo Запускаем сервер...
echo ========================================
echo API будет доступен по адресу: http://localhost:3001/api
echo Для остановки нажмите Ctrl+C
echo.

node server.js

pause
