#!/bin/bash

echo "🚀 Запуск Inglass CRM Server..."
echo "📁 Рабочая директория: $(pwd)"

# Переходим в директорию сервера
cd server

# Проверяем наличие Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен!"
    echo "Установите Node.js с https://nodejs.org/"
    exit 1
fi

# Проверяем наличие package.json
if [ ! -f "package.json" ]; then
    echo "❌ package.json не найден в директории server/"
    exit 1
fi

# Устанавливаем зависимости если нужно
if [ ! -d "node_modules" ]; then
    echo "📦 Устанавливаем зависимости..."
    npm install
fi

echo "🌐 Сервер будет доступен по адресу: http://localhost:3001"
echo "📊 API доступен по адресу: http://localhost:3001/api"
echo "🔄 Для остановки нажмите Ctrl+C"
echo ""

# Запускаем сервер
node server.js
