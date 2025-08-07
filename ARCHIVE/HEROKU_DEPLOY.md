# 🚀 РАЗВЕРТЫВАНИЕ НА HEROKU

## 📋 Шаги развертывания

### 1. Подготовка файлов для Heroku

1. **Замените содержимое Procfile:**
```
web: node server-heroku.js
```

2. **Замените содержимое package.json в корне:**
```json
{
  "name": "inglass-crm-api",
  "version": "1.0.0",
  "description": "Inglass CRM API Server for Heroku",
  "main": "server-heroku.js",
  "scripts": {
    "start": "node server-heroku.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2"
  },
  "engines": {
    "node": "18.x"
  }
}
```

### 2. Создание приложения на Heroku

#### Через веб-интерфейс:
1. Зайдите на https://dashboard.heroku.com/
2. Нажмите "New" → "Create new app"
3. Название: `inglass-9be99f83200c` (или другое)
4. Region: Europe
5. Нажмите "Create app"

#### Через Git:
1. В корне проекта выполните:
```bash
git init
git add .
git commit -m "Initial commit"
```

2. Подключите Heroku remote:
```bash
heroku git:remote -a inglass-9be99f83200c
```

3. Деплой:
```bash
git push heroku main
```

### 3. Альтернативный способ - через GitHub

1. **В настройках Heroku app:**
   - Deploy → Deployment method → GitHub
   - Connect to GitHub → найти репозиторий
   - Enable Automatic Deploys (optional)
   - Manual Deploy → Deploy Branch

### 4. Проверка развертывания

После деплоя:
1. Откройте https://inglass-9be99f83200c.herokuapp.com/api/health
2. Должен вернуть JSON с `"success": true`

## 🔧 Файлы, которые нужны для Heroku:

### Procfile (в корне):
```
web: node server-heroku.js
```

### package.json (в корне):
Используйте созданный файл `package-heroku.json`

### server-heroku.js (в корне):
Простой сервер без сложных зависимостей

## ⚡ Быстрый старт

### Вариант 1: Через Heroku CLI
```bash
# 1. Установите Heroku CLI
# 2. Логин
heroku login

# 3. Создайте app
heroku create inglass-9be99f83200c

# 4. Подготовьте файлы
cp package-heroku.json package.json
# Убедитесь что Procfile содержит: web: node server-heroku.js

# 5. Деплой
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

### Вариант 2: Через GitHub + Heroku Dashboard
1. Закоммитьте изменения в GitHub
2. В Heroku Dashboard подключите репозиторий
3. Нажмите Deploy

## 🧪 Тестирование

После деплоя проверьте:
- https://your-app.herokuapp.com/api/health
- https://your-app.herokuapp.com/ (должен показать ваше приложение)

## 🔍 Отладка

### Логи Heroku:
```bash
heroku logs --tail -a inglass-9be99f83200c
```

### Если не работает:
1. Проверьте логи
2. Убедитесь что package.json в корне
3. Убедитесь что Procfile правильный
4. Проверьте что server-heroku.js в корне

## ⚙️ После успешного деплоя

1. Обновите мета-тег в index.html:
```html
<meta name="api-url" content="https://inglass-9be99f83200c.herokuapp.com/api">
```

2. Протестируйте debug-api.html

3. Проверьте синхронизацию данных между устройствами!

---

**Готово!** После деплоя ваши данные будут синхронизироваться между всеми устройствами через Heroku! 🎯
