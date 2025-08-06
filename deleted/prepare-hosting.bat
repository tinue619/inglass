@echo off
echo ========================================
echo   Подготовка к деплою Inglass CRM на хостинг
echo ========================================
echo.

REM Создаем директорию для хостинга
if not exist "hosting-deploy" mkdir hosting-deploy
cd hosting-deploy

echo Копируем файлы...

REM Копируем клиентскую часть
xcopy "..\js" "js\" /E /I /Y >nul
xcopy "..\css" "css\" /E /I /Y >nul  
xcopy "..\assets" "assets\" /E /I /Y >nul
copy "..\index.html" . >nul

REM Копируем серверную часть
if not exist "server" mkdir server
copy "..\server\server-hosting.js" "server\" >nul
copy "..\server\package-hosting.json" "server\package.json" >nul
xcopy "..\server\database" "server\database\" /E /I /Y >nul

REM Создаем .gitignore
echo node_modules/ > .gitignore
echo *.log >> .gitignore
echo .env >> .gitignore
echo server/database/inglass.db >> .gitignore
echo server/database/backup-*.json >> .gitignore

REM Создаем README для хостинга
echo # Inglass CRM - Хостинг версия > README.md
echo. >> README.md
echo ## Установка на хостинг >> README.md
echo. >> README.md
echo 1. Загрузите все файлы на хостинг >> README.md
echo 2. Установите зависимости: `npm install` >> README.md
echo 3. Запустите сервер: `npm start` >> README.md
echo. >> README.md
echo ## Требования хостинга >> README.md
echo. >> README.md
echo - Node.js 14+ >> README.md
echo - Поддержка SQLite >> README.md
echo - Возможность запуска npm install >> README.md
echo. >> README.md
echo Система готова к работе! >> README.md

echo.
echo ========================================
echo   ДЕПЛОЙ ПОДГОТОВЛЕН!
echo ========================================
echo ✅ Файлы подготовлены в папке hosting-deploy\
echo 📦 Загрузите содержимое папки hosting-deploy на ваш хостинг
echo 🔧 Выполните 'npm install' на хостинге  
echo 🚀 Запустите 'npm start' для запуска сервера
echo.
echo Нажмите любую клавишу для продолжения...
pause >nul
