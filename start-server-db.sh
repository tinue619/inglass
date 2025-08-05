#!/bin/bash
echo "🚀 Запускаем CRM с базой данных SQLite для хостинга..."
echo

cd server
echo "📁 Переходим в директорию server"
echo

echo "📦 Проверяем зависимости..."
if [ ! -d "node_modules" ]; then
    echo "Устанавливаем зависимости..."
    npm install
fi
echo

echo "🗄️ Запускаем сервер с базой данных..."
echo "👤 Админ: +7 777 777 7777 / 1488"
echo "🌐 Приложение: http://localhost:3001/"
echo "📊 API: http://localhost:3001/api"
echo
echo "Нажмите Ctrl+C для остановки"
echo

node server-hosting.js
