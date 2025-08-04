const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const DB_PATH = path.join(__dirname, 'inglass.db');

console.log('🗄️  Инициализация базы данных SQLite...');

// Создаем подключение к базе данных
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Ошибка подключения к базе данных:', err.message);
        process.exit(1);
    }
    console.log('✅ Подключение к SQLite установлено');
});

// SQL скрипты для создания таблиц
const createTables = `
-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    can_create_orders BOOLEAN DEFAULT FALSE,
    processes TEXT DEFAULT '[]', -- JSON массив ID процессов
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Таблица процессов
CREATE TABLE IF NOT EXISTS processes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    order_num INTEGER NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Таблица изделий
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    processes TEXT DEFAULT '[]', -- JSON массив ID процессов
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Таблица заказов
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT NOT NULL,
    client_contacts TEXT DEFAULT '[]', -- JSON массив контактов
    product_id INTEGER,
    product_name TEXT,
    quantity TEXT,
    size TEXT,
    thickness TEXT,
    comment TEXT,
    current_process_id INTEGER,
    status TEXT DEFAULT 'status-process',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products (id),
    FOREIGN KEY (current_process_id) REFERENCES processes (id)
);

-- Таблица истории заказов
CREATE TABLE IF NOT EXISTS order_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    user_name TEXT,
    from_process_id INTEGER,
    from_process_name TEXT,
    to_process_id INTEGER,
    to_process_name TEXT,
    reason TEXT,
    comment TEXT,
    is_defect BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    FOREIGN KEY (from_process_id) REFERENCES processes (id),
    FOREIGN KEY (to_process_id) REFERENCES processes (id)
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_current_process ON orders(current_process_id);
CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON order_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_history_created_at ON order_history(created_at);

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
    AFTER UPDATE ON users
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_processes_timestamp 
    AFTER UPDATE ON processes
    BEGIN
        UPDATE processes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_products_timestamp 
    AFTER UPDATE ON products
    BEGIN
        UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_orders_timestamp 
    AFTER UPDATE ON orders
    BEGIN
        UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
`;

// Функция для выполнения SQL скрипта
function executeSqlScript(sql) {
    return new Promise((resolve, reject) => {
        db.exec(sql, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// Функция для создания администратора
async function createAdminUser() {
    return new Promise((resolve, reject) => {
        const adminPassword = '1488';
        bcrypt.hash(adminPassword, 10, (err, hash) => {
            if (err) {
                reject(err);
                return;
            }

            const adminUser = {
                name: 'Администратор',
                phone: '+7 777 777 7777',
                password_hash: hash,
                is_admin: true,
                can_create_orders: true,
                processes: '[]'
            };

            const sql = `
                INSERT OR REPLACE INTO users 
                (id, name, phone, password_hash, is_admin, can_create_orders, processes)
                VALUES (1, ?, ?, ?, ?, ?, ?)
            `;

            db.run(sql, [
                adminUser.name,
                adminUser.phone,
                adminUser.password_hash,
                adminUser.is_admin,
                adminUser.can_create_orders,
                adminUser.processes
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    console.log('👤 Администратор создан (ID: 1)');
                    resolve();
                }
            });
        });
    });
}

// Функция для создания тестовых данных
async function createTestData() {
    return new Promise(async (resolve, reject) => {
        try {
            console.log('📦 Создание тестовых данных...');

            // Создаем процессы
            const processes = [
                { name: 'Прием заказа', order_num: 1 },
                { name: 'Замер', order_num: 2 },
                { name: 'Резка стекла', order_num: 3 },
                { name: 'Обработка кромки', order_num: 4 },
                { name: 'Упаковка', order_num: 5 }
            ];

            for (const process of processes) {
                await new Promise((res, rej) => {
                    db.run(
                        'INSERT OR REPLACE INTO processes (name, order_num) VALUES (?, ?)',
                        [process.name, process.order_num],
                        function(err) {
                            if (err) rej(err);
                            else res();
                        }
                    );
                });
            }

            // Создаем изделия
            const products = [
                { name: 'Стекло прозрачное', processes: '[1,2,3,4,5]' },
                { name: 'Зеркало', processes: '[1,2,3,5]' },
                { name: 'Стеклопакет', processes: '[1,2,3,4,5]' }
            ];

            for (const product of products) {
                await new Promise((res, rej) => {
                    db.run(
                        'INSERT OR REPLACE INTO products (name, processes) VALUES (?, ?)',
                        [product.name, product.processes],
                        function(err) {
                            if (err) rej(err);
                            else res();
                        }
                    );
                });
            }

            // Создаем дополнительных пользователей
            const users = [
                {
                    name: 'Менеджер Анна',
                    phone: '+7 111 111 1111',
                    password: '1111',
                    is_admin: false,
                    can_create_orders: true,
                    processes: '[1]'
                },
                {
                    name: 'Мастер Иван',
                    phone: '+7 222 222 2222',
                    password: '2222',
                    is_admin: false,
                    can_create_orders: false,
                    processes: '[2,3]'
                }
            ];

            for (const user of users) {
                const hash = await new Promise((res, rej) => {
                    bcrypt.hash(user.password, 10, (err, hash) => {
                        if (err) rej(err);
                        else res(hash);
                    });
                });

                await new Promise((res, rej) => {
                    db.run(
                        'INSERT OR REPLACE INTO users (name, phone, password_hash, is_admin, can_create_orders, processes) VALUES (?, ?, ?, ?, ?, ?)',
                        [user.name, user.phone, hash, user.is_admin, user.can_create_orders, user.processes],
                        function(err) {
                            if (err) rej(err);
                            else res();
                        }
                    );
                });
            }

            console.log('✅ Тестовые данные созданы');
            resolve();

        } catch (error) {
            reject(error);
        }
    });
}

// Основная функция инициализации
async function initializeDatabase() {
    try {
        console.log('🔨 Создание таблиц...');
        await executeSqlScript(createTables);
        console.log('✅ Таблицы созданы');

        console.log('👤 Создание администратора...');
        await createAdminUser();

        console.log('📊 Создание тестовых данных...');
        await createTestData();

        console.log('🎉 База данных успешно инициализирована!');
        console.log(`📍 Путь к базе данных: ${DB_PATH}`);

    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('❌ Ошибка закрытия базы данных:', err.message);
            } else {
                console.log('🔒 Соединение с базой данных закрыто');
            }
            process.exit(0);
        });
    }
}

// Запуск инициализации
initializeDatabase();
