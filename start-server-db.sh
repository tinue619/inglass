#!/bin/bash

echo "========================================"
echo "   INGLASS CRM Server - SQLite Database"
echo "========================================"
echo

# Переходим в директорию сервера
cd "$(dirname "$0")/server"

# Проверяем Node.js
if ! command -v node &> /dev/null; then
    echo "❌ ОШИБКА: Node.js не установлен!"
    echo "Скачайте и установите Node.js с сайта: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js найден: $(node --version)"

# Устанавливаем зависимости если нужно
if [ ! -d "node_modules" ]; then
    echo "📦 Устанавливаем зависимости..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ ОШИБКА: Не удалось установить зависимости!"
        exit 1
    fi
else
    echo "✅ Зависимости уже установлены"
fi

# Проверяем базу данных
if [ ! -f "database/inglass.db" ]; then
    echo "🗄️  Инициализируем базу данных..."
    node database/init-database.js
    if [ $? -ne 0 ]; then
        echo "❌ ОШИБКА: Не удалось инициализировать базу данных!"
        exit 1
    fi
else
    echo "✅ База данных найдена"
fi

echo
echo "========================================"
echo "🚀 Запускаем сервер с SQLite..."
echo "========================================"
echo "📊 API доступен по адресу: http://localhost:3001/api"
echo "🗄️  База данных: SQLite (database/inglass.db)"
echo "🛑 Для остановки нажмите Ctrl+C"
echo

# Запускаем сервер
node server-db.js
