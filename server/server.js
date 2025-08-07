const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'crm-data.json');

// Middleware
app.use(cors({
    origin: true, // Разрешаем все домены
    credentials: true, // Поддержка cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control', 'Pragma'],
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar']
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Статические файлы (ДОБАВЛЕНО)
app.use(express.static(path.join(__dirname, '..')));
console.log('📁 Статические файлы раздаются из:', path.join(__dirname, '..'));
console.log('📁 Проверяем наличие index.html:', fs.existsSync(path.join(__dirname, '..', 'index.html')));
console.log('📁 Содержимое корневой папки:', fs.readdirSync(path.join(__dirname, '..')).slice(0, 10));

// Обработчик preflight запросов CORS
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma');
    res.sendStatus(200);
});

// Создаем директорию для данных если её нет
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('📁 Создана директория для данных:', DATA_DIR);
}

// Функция для чтения данных
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

// Функция для записи данных
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

// Создание резервной копии
function createBackup() {
    try {
        const data = readData();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(DATA_DIR, `backup-${timestamp}.json`);
        fs.writeFileSync(backupFile, JSON.stringify(data, null, 2), 'utf8');
        console.log('🔄 Создана резервная копия:', backupFile);
        
        // Удаляем старые бэкапы (оставляем только последние 10)
        const backupFiles = fs.readdirSync(DATA_DIR)
            .filter(file => file.startsWith('backup-'))
            .sort()
            .reverse();
            
        if (backupFiles.length > 10) {
            for (let i = 10; i < backupFiles.length; i++) {
                fs.unlinkSync(path.join(DATA_DIR, backupFiles[i]));
            }
        }
    } catch (error) {
        console.error('Ошибка создания резервной копии:', error);
    }
}

// API Routes

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
        
        // Валидация данных
        if (!newData || typeof newData !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Некорректные данные'
            });
        }
        
        // Создаем резервную копию перед записью
        createBackup();
        
        // Сохраняем данные
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

// Получить конкретную сущность
app.get('/api/:entity', (req, res) => {
    try {
        const { entity } = req.params;
        const data = readData();
        
        if (data.hasOwnProperty(entity)) {
            res.json({
                success: true,
                data: data[entity],
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(404).json({
                success: false,
                error: `Сущность ${entity} не найдена`
            });
        }
    } catch (error) {
        console.error('Ошибка получения сущности:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения данных'
        });
    }
});

// Обновить конкретную сущность
app.post('/api/:entity', (req, res) => {
    try {
        const { entity } = req.params;
        const newEntityData = req.body;
        
        console.log(`📤 Получен запрос на обновление ${entity}:`, newEntityData);
        
        const data = readData();
        
        if (!data.hasOwnProperty(entity)) {
            console.error(`Сущность ${entity} не найдена`);
            return res.status(404).json({
                success: false,
                error: `Сущность ${entity} не найдена`
            });
        }
        
        // Создаем резервную копию
        createBackup();
        
        // Обновляем данные
        data[entity] = newEntityData;
        const success = writeData(data);
        
        if (success) {
            console.log(`✅ Сущность ${entity} успешно обновлена`);
            res.json({
                success: true,
                message: `Сущность ${entity} успешно обновлена`,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Ошибка сохранения данных'
            });
        }
    } catch (error) {
        console.error('Ошибка обновления сущности:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка обновления данных',
            details: error.message
        });
    }
});

// Проверка состояния сервера
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Сервер работает',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Получить информацию о последней синхронизации
app.get('/api/sync-info', (req, res) => {
    try {
        const data = readData();
        res.json({
            success: true,
            lastSync: data.lastSync || null,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Ошибка получения информации о синхронизации:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения информации'
        });
    }
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка сервера:', err);
    res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
    });
});

// Главная страница (ДОБАВЛЕНО)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// 404 для API маршрутов
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'API маршрут не найден'
    });
});

// 404 для остальных маршрутов (отдаем главную страницу для SPA)
app.use((req, res) => {
    // Если это запрос на HTML страницу, отдаем index.html
    if (req.accepts('html')) {
        res.sendFile(path.join(__dirname, '..', 'index.html'));
    } else {
        res.status(404).json({
            success: false,
            error: 'Маршрут не найден'
        });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Inglass CRM Server запущен на порту ${PORT}`);
    console.log(`📊 API доступен по адресу: http://localhost:${PORT}/api`);
    console.log(`📁 Данные хранятся в: ${DATA_FILE}`);
    
    // Инициализируем данные при запуске
    const data = readData();
    console.log(`👥 Пользователей: ${data.users.length}`);
    console.log(`⚙️ Процессов: ${data.processes.length}`);
    console.log(`📦 Изделий: ${data.products.length}`);
    console.log(`📋 Заказов: ${data.orders.length}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Получен сигнал завершения, создаем финальную резервную копию...');
    createBackup();
    console.log('✅ Сервер остановлен');
    process.exit(0);
});
