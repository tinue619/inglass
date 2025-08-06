@echo off
echo 🧪 Быстрый тест сервера перед деплоем...
echo.

cd /d "%~dp0"

echo 📦 Проверяем package.json...
if exist package.json (
    echo ✅ package.json найден
    type package.json | findstr "server-heroku"
) else (
    echo ❌ package.json не найден
    pause
    exit /b 1
)

echo.
echo 📄 Проверяем Procfile...
if exist Procfile (
    echo ✅ Procfile найден
    type Procfile
) else (
    echo ❌ Procfile не найден
    pause
    exit /b 1
)

echo.
echo 🚀 Проверяем server-heroku.js...
if exist server-heroku.js (
    echo ✅ server-heroku.js найден
) else (
    echo ❌ server-heroku.js не найден
    pause
    exit /b 1
)

echo.
echo 📋 Структура готова для Heroku!
echo.
echo 🌐 Теперь можно деплоить:
echo    1. Создайте приложение на heroku.com
echo    2. Или используйте Heroku CLI:
echo       heroku create inglass-9be99f83200c
echo       git add .
echo       git commit -m "Deploy to Heroku"
echo       git push heroku main
echo.

pause
