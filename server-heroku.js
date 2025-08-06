const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Простое файловое хранилище (как в локальной версии)
const DATA_FILE = path.join(__dirname, 'heroku-data.json');

// CORS middleware с расширенными настройками
app.use(cors({
    origin: true, // Разрешаем все домены
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control', 'Pragma'],
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar']
}));

// Preflight requests
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma');
    res.sendStatus(200);
});

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Статические файлы (фронтенд)
app.use(express.static(__dirname));

// Функции для работы с данными
function readData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        } else {
            // Данные по умолчанию
            const defaultData = {
                users: [{
                    id: 1,
                    name: "Администратор",
                    phone: "+7 777 777 7777",
                    password: "1488",
                    isAdmin: true,
                    processes: [],
                    canCreateOrders: true
                }],
                processes: [],
                products: [],
                orders: [],
                lastSync: new Date().toISOString()
            };
            writeData(defaultData);
            return defaultData;
        }
    } catch (error) {
        console.error('Ошибка чтения данных:', error);
        return {
            users: [{
                id: 1,
                name: "Администратор",
                phone: "+7 777 777 7777",
                password: "1488",
                isAdmin: true,
                processes: [],
                canCreateOrders: true
            }],
            processes: [],
            products: [],
            orders: [],
            lastSync: new Date().toISOString()
        };
    }
}

function writeData(data) {
    try {
        data.lastSync = new Date().toISOString();
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        console.log('💾 Данные сохранены в', new Date().toLocaleString());
        return true;
    } catch (error) {
        console.error('Ошибка записи данных:', error);
        return false;
    }
}

// API Routes

// Проверка состояния сервера
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Inglass CRM Server работает на Heroku',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'production'
    });
});

// Аутентификация пользователя
app.post('/api/auth/login', (req, res) => {
    try {
        const { phone, password } = req.body;
        
        if (!phone || !password) {
            return res.status(400).json({
                success: false,
                error: 'Телефон и пароль обязательны'
            });
        }
        
        const data = readData();
        const user = data.users.find(u => u.phone === phone);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Неверный телефон или пароль'
            });
        }
        
        // Простая проверка пароля (в реальном проекте используйте bcrypt)
        if (user.password !== password) {
            return res.status(401).json({
                success: false,
                error: 'Неверный телефон или пароль'
            });
        }
        
        // Возвращаем данные пользователя без пароля
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({
            success: true,
            user: userWithoutPassword
        });
        
    } catch (error) {
        console.error('Ошибка аутентификации:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка сервера'
        });
    }
});

// Получить все данные
app.get('/api/data', (req, res) => {
    try {
        const data = readData();
        res.json({
            success: true,
            data: data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Ошибка получения данных:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения данных'
        });
    }
});

// Сохранить все данные
app.post('/api/data', (req, res) => {
    try {
        const newData = req.body;
        
        if (!newData || typeof newData !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Некорректные данные'
            });
        }
        
        console.log('📝 Получены данные для сохранения:', {
            users: newData.users?.length || 0,
            processes: newData.processes?.length || 0,
            products: newData.products?.length || 0,
            orders: newData.orders?.length || 0
        });
        
        const success = writeData(newData);
        
        if (success) {
            res.json({
                success: true,
                message: 'Данные успешно сохранены',
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Ошибка сохранения данных'
            });
        }
    } catch (error) {
        console.error('Ошибка сохранения данных:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка сохранения данных'
        });
    }
});

// Получить информацию о синхронизации
app.get('/api/sync-info', (req, res) => {
    try {
        const data = readData();
        res.json({
            success: true,
            lastSync: data.lastSync || null,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Ошибка получения информации'
        });
    }
});

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка сервера:', err);
    res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
    });
});

// 404 для несуществующих маршрутов
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Маршрут не найден'
    });
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Inglass CRM Server запущен на Heroku!`);
    console.log(`🔗 Порт: ${PORT}`);
    console.log(`🌐 Приложение доступно по адресу приложения Heroku`);
    console.log(`📊 API: /api`);
    console.log(`📁 Данные: ${DATA_FILE}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log('✅ Система готова к работе!');
    
    // Инициализируем данные при запуске
    const data = readData();
    console.log(`👥 Пользователей: ${data.users.length}`);
    console.log(`⚙️ Процессов: ${data.processes.length}`);
    console.log(`📦 Изделий: ${data.products.length}`);
    console.log(`📋 Заказов: ${data.orders.length}`);
});
