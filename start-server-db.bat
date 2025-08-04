@echo off
echo ========================================
echo    INGLASS CRM Server - SQLite Database
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
echo Проверяем базу данных...
if not exist "database\inglass.db" (
    echo Инициализируем базу данных...
    node database/init-database.js
    if %errorlevel% neq 0 (
        echo ОШИБКА: Не удалось инициализировать базу данных!
        pause
        exit /b 1
    )
) else (
    echo База данных найдена
)

echo.
echo ========================================
echo Запускаем сервер с SQLite...
echo ========================================
echo API будет доступен по адресу: http://localhost:3001/api
echo База данных: SQLite (database/inglass.db)
echo Для остановки нажмите Ctrl+C
echo.

node server-db.js

pause
