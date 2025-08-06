@echo off
echo 🚀 Запуск Inglass CRM Server...
echo 📁 Рабочая директория: %cd%

:: Переходим в директорию сервера
cd server

:: Проверяем наличие Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js не установлен!
    echo Установите Node.js с https://nodejs.org/
    pause
    exit /b 1
)

:: Проверяем наличие package.json
if not exist "package.json" (
    echo ❌ package.json не найден в директории server/
    pause
    exit /b 1
)

:: Устанавливаем зависимости если нужно
if not exist "node_modules" (
    echo 📦 Устанавливаем зависимости...
    npm install
)

echo.
echo 🌐 Сервер будет доступен по адресу: http://localhost:3001
echo 📊 API доступен по адресу: http://localhost:3001/api
echo 🔄 Для остановки нажмите Ctrl+C
echo.

:: Запускаем сервер
node server.js

pause
