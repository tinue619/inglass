const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const DatabaseManager = require('./database/DatabaseManager');

const app = express();
const PORT = process.env.PORT || 3001;

// Инициализация базы данных
const db = new DatabaseManager();

// Проверяем существование базы данных при запуске
const fs = require('fs');
const dbPath = path.join(__dirname, 'database', 'inglass.db');
let dbExists = fs.existsSync(dbPath);

console.log('🗄️  Проверка базы данных:', dbExists ? 'найдена' : 'будет создана');

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Статические файлы - раздаем клиентское приложение
app.use(express.static(path.join(__dirname, '../')));

// API Routes

// Проверка состояния сервера
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Inglass CRM Server работает с SQLite базой данных',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'SQLite',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Получить все данные (для совместимости с клиентом)
app.get('/api/data', async (req, res) => {
    try {
        const data = await db.getAllData();
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

// Сохранить все данные (обновленная версия для базы данных)
app.post('/api/data', async (req, res) => {
    try {
        const newData = req.body;
        
        // Валидация данных
        if (!newData || typeof newData !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Некорректные данные'
            });
        }
        
        console.log('📝 Синхронизация данных с клиента...');
        
        // Создаем резервную копию перед обновлением
        await db.createBackup();
        
        // Обновляем пользователей (кроме системных)
        if (newData.users && Array.isArray(newData.users)) {
            for (const user of newData.users) {
                if (user.id && user.id > 1) { // Не трогаем админа (ID=1)
                    const existingUser = await db.get('SELECT id FROM users WHERE id = ?', [user.id]);
                    if (existingUser) {
                        await db.updateUser(user.id, {
                            name: user.name,
                            phone: user.phone,
                            isAdmin: user.isAdmin,
                            canCreateOrders: user.canCreateOrders,
                            processes: user.processes
                        });
                    } else {
                        await db.createUser({
                            name: user.name,
                            phone: user.phone,
                            password: '0000', // Временный пароль для синхронизированных пользователей
                            isAdmin: user.isAdmin,
                            canCreateOrders: user.canCreateOrders,
                            processes: user.processes
                        });
                    }
                }
            }
        }
        
        // Обновляем процессы
        if (newData.processes && Array.isArray(newData.processes)) {
            // Сначала удаляем все процессы
            await db.run('DELETE FROM processes');
            // Затем добавляем новые
            for (const process of newData.processes) {
                await db.createProcess({
                    name: process.name,
                    order: process.order || 1
                });
            }
        }
        
        // Обновляем изделия
        if (newData.products && Array.isArray(newData.products)) {
            // Сначала удаляем все изделия
            await db.run('DELETE FROM products');
            // Затем добавляем новые
            for (const product of newData.products) {
                await db.createProduct({
                    name: product.name,
                    processes: product.processes || []
                });
            }
        }
        
        // Обновляем заказы
        if (newData.orders && Array.isArray(newData.orders)) {
            for (const order of newData.orders) {
                if (order.id) {
                    const existingOrder = await db.get('SELECT id FROM orders WHERE id = ?', [order.id]);
                    if (existingOrder) {
                        await db.updateOrder(order.id, {
                            client: order.client,
                            product: order.product,
                            quantity: order.quantity,
                            size: order.size,
                            thickness: order.thickness,
                            comment: order.comment,
                            currentProcessId: order.currentProcessId,
                            status: order.status
                        });
                    } else {
                        await db.createOrder({
                            client: order.client,
                            product: order.product,
                            quantity: order.quantity,
                            size: order.size,
                            thickness: order.thickness,
                            comment: order.comment,
                            currentProcessId: order.currentProcessId,
                            status: order.status,
                            createdBy: 'Синхронизация'
                        });
                    }
                    
                    // Обновляем историю если есть
                    if (order.history && Array.isArray(order.history)) {
                        // Удаляем старую историю
                        await db.run('DELETE FROM order_history WHERE order_id = ?', [order.id]);
                        // Добавляем новую
                        for (const historyItem of order.history) {
                            await db.addOrderHistory(order.id, historyItem.type, {
                                userName: historyItem.user?.name,
                                fromProcessId: historyItem.data?.fromProcess?.id,
                                fromProcessName: historyItem.data?.fromProcess?.name,
                                toProcessId: historyItem.data?.toProcess?.id,
                                toProcessName: historyItem.data?.toProcess?.name,
                                reason: historyItem.data?.reason,
                                comment: historyItem.data?.comment,
                                isDefect: historyItem.data?.isDefect
                            });
                        }
                    }
                }
            }
        }
        
        res.json({
            success: true,
            message: 'Данные успешно синхронизированы с базой данных',
            timestamp: new Date().toISOString()
        });
        
        console.log('✅ Синхронизация завершена');
        
    } catch (error) {
        console.error('Ошибка синхронизации данных:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка синхронизации данных: ' + error.message
        });
    }
});

// === ПОЛЬЗОВАТЕЛИ ===
app.get('/api/users', async (req, res) => {
    try {
        const users = await db.getUsers();
        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Ошибка получения пользователей:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const userData = req.body;
        const userId = await db.createUser(userData);
        res.json({ success: true, id: userId, message: 'Пользователь создан' });
    } catch (error) {
        console.error('Ошибка создания пользователя:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const userData = req.body;
        const success = await db.updateUser(userId, userData);
        if (success) {
            res.json({ success: true, message: 'Пользователь обновлен' });
        } else {
            res.status(404).json({ success: false, error: 'Пользователь не найден' });
        }
    } catch (error) {
        console.error('Ошибка обновления пользователя:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        if (userId === 1) {
            return res.status(400).json({ success: false, error: 'Нельзя удалить администратора' });
        }
        const success = await db.deleteUser(userId);
        if (success) {
            res.json({ success: true, message: 'Пользователь удален' });
        } else {
            res.status(404).json({ success: false, error: 'Пользователь не найден' });
        }
    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Аутентификация пользователя
app.post('/api/auth/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        
        const user = await db.getUserByPhone(phone);
        if (!user) {
            return res.status(401).json({ success: false, error: 'Неверный телефон или пароль' });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, error: 'Неверный телефон или пароль' });
        }
        
        // Возвращаем данные пользователя без хеша пароля
        const { passwordHash, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword });
        
    } catch (error) {
        console.error('Ошибка аутентификации:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// === ПРОЦЕССЫ ===
app.get('/api/processes', async (req, res) => {
    try {
        const processes = await db.getProcesses();
        res.json({ success: true, data: processes });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/processes', async (req, res) => {
    try {
        const processData = req.body;
        const processId = await db.createProcess(processData);
        res.json({ success: true, id: processId });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === ИЗДЕЛИЯ ===
app.get('/api/products', async (req, res) => {
    try {
        const products = await db.getProducts();
        res.json({ success: true, data: products });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const productData = req.body;
        const productId = await db.createProduct(productData);
        res.json({ success: true, id: productId });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === ЗАКАЗЫ ===
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await db.getOrders();
        res.json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;
        const orderId = await db.createOrder(orderData);
        res.json({ success: true, id: orderId });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/orders/:id', async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const orderData = req.body;
        const success = await db.updateOrder(orderId, orderData);
        if (success) {
            res.json({ success: true, message: 'Заказ обновлен' });
        } else {
            res.status(404).json({ success: false, error: 'Заказ не найден' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Перемещение заказа между процессами
app.post('/api/orders/:id/move', async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const { processId, reason, isDefect, userName, processName } = req.body;
        
        // Получаем текущий заказ
        const currentOrder = await db.get('SELECT current_process_id FROM orders WHERE id = ?', [orderId]);
        if (!currentOrder) {
            return res.status(404).json({ success: false, error: 'Заказ не найден' });
        }
        
        // Получаем информацию о процессах
        let fromProcess = null;
        let toProcess = null;
        
        if (currentOrder.current_process_id) {
            const fromProcessData = await db.get('SELECT id, name FROM processes WHERE id = ?', [currentOrder.current_process_id]);
            if (fromProcessData) {
                fromProcess = { id: fromProcessData.id, name: fromProcessData.name };
            }
        }
        
        if (processId && processId !== 0) {
            const toProcessData = await db.get('SELECT id, name FROM processes WHERE id = ?', [processId]);
            if (toProcessData) {
                toProcess = { id: toProcessData.id, name: toProcessData.name };
            }
        } else if (processId === 0) {
            toProcess = { id: 0, name: 'Завершено' };
        }
        
        // Обновляем заказ
        await db.updateOrder(orderId, {
            currentProcessId: processId === 0 ? null : processId,
            status: processId === 0 ? 'status-done' : 'status-process'
        });
        
        // Добавляем в историю
        await db.addOrderHistory(orderId, isDefect ? 'defect_sent' : 'moved', {
            userName: userName || 'Система',
            fromProcessId: fromProcess?.id,
            fromProcessName: fromProcess?.name,
            toProcessId: toProcess?.id,
            toProcessName: toProcess?.name,
            reason: reason,
            isDefect: isDefect || false
        });
        
        res.json({ success: true, message: 'Заказ перемещен' });
        
    } catch (error) {
        console.error('Ошибка перемещения заказа:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Получить информацию о последней синхронизации
app.get('/api/sync-info', (req, res) => {
    res.json({
        success: true,
        lastSync: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        database: 'SQLite'
    });
});

// Главная страница - редирект на приложение
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
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
async function startServer() {
    try {
        // Если база не существует, инициализируем её
        if (!dbExists) {
            console.log('🔨 Инициализирую базу данных...');
            
            // Создаем директорию для базы если нужно
            const dbDir = path.dirname(dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }
            
            // Запускаем скрипт инициализации
            const { spawn } = require('child_process');
            const initProcess = spawn('node', [path.join(__dirname, 'database', 'init-database.js')], {
                stdio: 'inherit',
                cwd: __dirname
            });
            
            await new Promise((resolve, reject) => {
                initProcess.on('close', (code) => {
                    if (code === 0) {
                        console.log('✅ База данных успешно инициализирована');
                        resolve();
                    } else {
                        reject(new Error(`Ошибка инициализации базы: ${code}`));
                    }
                });
            });
        }
        
        // Подключаемся к базе данных
        await db.connect();
        
        // Запускаем сервер
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`\n🚀 Inglass CRM Server с SQLite запущен!`);
            console.log(`🔗 Порт: ${PORT}`);
            console.log(`🌐 Приложение: http://localhost:${PORT}/`);
            console.log(`📊 API: http://localhost:${PORT}/api`);
            console.log(`🗄️  База данных: SQLite (${db.dbPath})`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`\n👤 Админ: +7 777 777 7777 / 1488`);
            console.log('✅ Система готова к работе!\n');
        });
        
    } catch (error) {
        console.error('❌ Ошибка запуска сервера:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Получен сигнал завершения...');
    try {
        await db.createBackup();
        await db.close();
        console.log('✅ Сервер корректно остановлен');
        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка при остановке:', error);
        process.exit(1);
    }
});

// Обработка необработанных исключений
process.on('uncaughtException', (error) => {
    console.error('❌ Необработанное исключение:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Необработанное отклонение Promise:', reason);
    process.exit(1);
});

// Запускаем сервер
startServer();
