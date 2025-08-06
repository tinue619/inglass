#!/bin/bash

echo "🚀 Подготовка к деплою Inglass CRM на хостинг..."
echo

# Создаем директорию для хостинга
mkdir -p hosting-deploy
cd hosting-deploy

echo "📁 Копируем файлы..."

# Копируем клиентскую часть
cp -r ../js ./
cp -r ../css ./
cp -r ../assets ./
cp ../index.html ./

# Копируем серверную часть
mkdir -p server
cp ../server/server-hosting.js ./server/
cp ../server/package-hosting.json ./server/package.json
cp -r ../server/database ./server/

# Создаем .gitignore
cat > .gitignore << EOF
node_modules/
*.log
.env
server/database/inglass.db
server/database/backup-*.json
EOF

# Создаем README для хостинга
cat > README.md << 'EOF'
# Inglass CRM - Хостинг версия

## Установка на хостинг

1. Загрузите все файлы на хостинг
2. Установите зависимости: `npm install`
3. Запустите сервер: `npm start`

## Структура файлов

```
/
├── index.html          # Главная страница
├── js/                # Клиентские скрипты
├── css/               # Стили
├── assets/            # Ресурсы
└── server/            # Серверная часть
    ├── server-hosting.js     # Главный файл сервера
    ├── package.json          # Зависимости
    └── database/             # База данных SQLite
```

## Требования хостинга

- Node.js 14+
- Поддержка SQLite
- Возможность запуска npm install
- Открытый порт (по умолчанию 3001 или PORT из переменных среды)

## Переменные среды

- `PORT` - порт сервера (по умолчанию 3001)
- `NODE_ENV` - окружение (production/development)
- `CORS_ORIGIN` - разрешенные домены для CORS (по умолчанию *)

Система готова к работе!
EOF

echo "✅ Файлы подготовлены в папке hosting-deploy/"
echo "📦 Загрузите содержимое папки hosting-deploy на ваш хостинг"
echo "🔧 Выполните 'npm install' на хостинге"
echo "🚀 Запустите 'npm start' для запуска сервера"
echo
