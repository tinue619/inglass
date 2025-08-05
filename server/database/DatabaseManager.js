const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

class DatabaseManager {
    constructor() {
        this.dbPath = path.join(__dirname, 'inglass.db');
        this.db = null;
    }

    // Подключение к базе данных
    connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Ошибка подключения к базе данных:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Подключение к SQLite установлено');
                    // Включаем поддержку внешних ключей
                    this.db.run('PRAGMA foreign_keys = ON');
                    resolve();
                }
            });
        });
    }

    // Закрытие соединения
    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('🔒 Соединение с базой данных закрыто');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    // Выполнение SQL запроса
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    // Получение одной записи
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Получение всех записей
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // ПОЛЬЗОВАТЕЛИ
    async getUsers() {
        const users = await this.all('SELECT * FROM users ORDER BY id');
        return users.map(user => ({
            id: user.id,
            name: user.name,
            phone: user.phone,
            isAdmin: Boolean(user.is_admin),
            canCreateOrders: Boolean(user.can_create_orders),
            processes: JSON.parse(user.processes || '[]')
        }));
    }

    async getUserByPhone(phone) {
        const user = await this.get('SELECT * FROM users WHERE phone = ?', [phone]);
        if (!user) return null;
        
        return {
            id: user.id,
            name: user.name,
            phone: user.phone,
            passwordHash: user.password_hash,
            isAdmin: Boolean(user.is_admin),
            canCreateOrders: Boolean(user.can_create_orders),
            processes: JSON.parse(user.processes || '[]')
        };
    }

    async createUser(userData) {
        const passwordHash = await bcrypt.hash(userData.password, 10);
        const result = await this.run(
            'INSERT INTO users (name, phone, password_hash, is_admin, can_create_orders, processes) VALUES (?, ?, ?, ?, ?, ?)',
            [
                userData.name,
                userData.phone,
                passwordHash,
                userData.isAdmin || false,
                userData.canCreateOrders || false,
                JSON.stringify(userData.processes || [])
            ]
        );
        return result.id;
    }

    async updateUser(id, userData) {
        const updates = [];
        const params = [];

        if (userData.name) {
            updates.push('name = ?');
            params.push(userData.name);
        }
        if (userData.phone) {
            updates.push('phone = ?');
            params.push(userData.phone);
        }
        if (userData.password) {
            const passwordHash = await bcrypt.hash(userData.password, 10);
            updates.push('password_hash = ?');
            params.push(passwordHash);
        }
        if (userData.hasOwnProperty('isAdmin')) {
            updates.push('is_admin = ?');
            params.push(userData.isAdmin);
        }
        if (userData.hasOwnProperty('canCreateOrders')) {
            updates.push('can_create_orders = ?');
            params.push(userData.canCreateOrders);
        }
        if (userData.processes) {
            updates.push('processes = ?');
            params.push(JSON.stringify(userData.processes));
        }

        params.push(id);
        
        const result = await this.run(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            params
        );
        return result.changes > 0;
    }

    async deleteUser(id) {
        const result = await this.run('DELETE FROM users WHERE id = ?', [id]);
        return result.changes > 0;
    }

    // ПРОЦЕССЫ
    async getProcesses() {
        const processes = await this.all('SELECT * FROM processes ORDER BY order_num');
        return processes.map(process => ({
            id: process.id,
            name: process.name,
            order: process.order_num, // Маппинг order_num -> order
            description: process.description
        }));
    }

    async createProcess(processData) {
        const result = await this.run(
            'INSERT INTO processes (name, order_num, description) VALUES (?, ?, ?)',
            [processData.name, processData.order, processData.description || null]
        );
        return result.id;
    }

    async updateProcess(id, processData) {
        const updates = [];
        const params = [];

        if (processData.name) {
            updates.push('name = ?');
            params.push(processData.name);
        }
        if (processData.order) {
            updates.push('order_num = ?');
            params.push(processData.order);
        }
        if (processData.description !== undefined) {
            updates.push('description = ?');
            params.push(processData.description);
        }

        params.push(id);
        
        const result = await this.run(
            `UPDATE processes SET ${updates.join(', ')} WHERE id = ?`,
            params
        );
        return result.changes > 0;
    }

    async deleteProcess(id) {
        const result = await this.run('DELETE FROM processes WHERE id = ?', [id]);
        return result.changes > 0;
    }

    // ИЗДЕЛИЯ
    async getProducts() {
        const products = await this.all('SELECT * FROM products ORDER BY name');
        return products.map(product => ({
            id: product.id,
            name: product.name,
            processes: JSON.parse(product.processes || '[]'),
            description: product.description
        }));
    }

    async createProduct(productData) {
        const result = await this.run(
            'INSERT INTO products (name, processes, description) VALUES (?, ?, ?)',
            [
                productData.name,
                JSON.stringify(productData.processes || []),
                productData.description || null
            ]
        );
        return result.id;
    }

    async updateProduct(id, productData) {
        const updates = [];
        const params = [];

        if (productData.name) {
            updates.push('name = ?');
            params.push(productData.name);
        }
        if (productData.processes) {
            updates.push('processes = ?');
            params.push(JSON.stringify(productData.processes));
        }
        if (productData.description !== undefined) {
            updates.push('description = ?');
            params.push(productData.description);
        }

        params.push(id);
        
        const result = await this.run(
            `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
            params
        );
        return result.changes > 0;
    }

    async deleteProduct(id) {
        const result = await this.run('DELETE FROM products WHERE id = ?', [id]);
        return result.changes > 0;
    }

    // ЗАКАЗЫ
    async getOrders() {
        const orders = await this.all('SELECT * FROM orders ORDER BY created_at DESC');
        const result = [];

        for (const order of orders) {
            // Получаем историю заказа
            const history = await this.all(
                'SELECT * FROM order_history WHERE order_id = ? ORDER BY created_at',
                [order.id]
            );

            result.push({
                id: order.id,
                client: {
                    name: order.client_name,
                    contacts: JSON.parse(order.client_contacts || '[]')
                },
                product: {
                    id: order.product_id,
                    name: order.product_name
                },
                quantity: order.quantity,
                size: order.size,
                thickness: order.thickness,
                comment: order.comment,
                currentProcessId: order.current_process_id,
                status: order.status,
                createdAt: order.created_at,
                history: history.map(h => ({
                    id: h.id,
                    timestamp: h.created_at,
                    type: h.event_type,
                    user: { name: h.user_name },
                    data: {
                        fromProcess: h.from_process_id ? {
                            id: h.from_process_id,
                            name: h.from_process_name
                        } : null,
                        toProcess: h.to_process_id ? {
                            id: h.to_process_id,
                            name: h.to_process_name
                        } : null,
                        reason: h.reason,
                        comment: h.comment,
                        isDefect: Boolean(h.is_defect)
                    }
                }))
            });
        }

        return result;
    }

    async createOrder(orderData) {
        const result = await this.run(`
            INSERT INTO orders (
                client_name, client_contacts, product_id, product_name,
                quantity, size, thickness, comment, current_process_id, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                orderData.client.name,
                JSON.stringify(orderData.client.contacts || []),
                orderData.product.id,
                orderData.product.name,
                orderData.quantity,
                orderData.size,
                orderData.thickness,
                orderData.comment,
                orderData.currentProcessId,
                orderData.status || 'status-process'
            ]
        );

        // Добавляем запись в историю о создании заказа
        await this.addOrderHistory(result.id, 'created', {
            userName: orderData.createdBy || 'Система',
            toProcessId: orderData.currentProcessId,
            comment: 'Заказ создан'
        });

        return result.id;
    }

    async updateOrder(id, orderData) {
        const updates = [];
        const params = [];

        if (orderData.client) {
            if (orderData.client.name) {
                updates.push('client_name = ?');
                params.push(orderData.client.name);
            }
            if (orderData.client.contacts) {
                updates.push('client_contacts = ?');
                params.push(JSON.stringify(orderData.client.contacts));
            }
        }

        if (orderData.product) {
            if (orderData.product.id) {
                updates.push('product_id = ?');
                params.push(orderData.product.id);
            }
            if (orderData.product.name) {
                updates.push('product_name = ?');
                params.push(orderData.product.name);
            }
        }

        ['quantity', 'size', 'thickness', 'comment', 'status'].forEach(field => {
            if (orderData[field] !== undefined) {
                updates.push(`${field} = ?`);
                params.push(orderData[field]);
            }
        });

        if (orderData.currentProcessId !== undefined) {
            updates.push('current_process_id = ?');
            params.push(orderData.currentProcessId);
        }

        params.push(id);
        
        const result = await this.run(
            `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`,
            params
        );
        return result.changes > 0;
    }

    async deleteOrder(id) {
        // История удалится автоматически благодаря ON DELETE CASCADE
        const result = await this.run('DELETE FROM orders WHERE id = ?', [id]);
        return result.changes > 0;
    }

    // ИСТОРИЯ ЗАКАЗОВ
    async addOrderHistory(orderId, eventType, data) {
        await this.run(`
            INSERT INTO order_history (
                order_id, event_type, user_name,
                from_process_id, from_process_name,
                to_process_id, to_process_name,
                reason, comment, is_defect
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                orderId,
                eventType,
                data.userName || null,
                data.fromProcessId || null,
                data.fromProcessName || null,
                data.toProcessId || null,
                data.toProcessName || null,
                data.reason || null,
                data.comment || null,
                data.isDefect || false
            ]
        );
    }

    // СОВМЕСТИМОСТЬ С LEGACY API
    async getAllData() {
        const [users, processes, products, orders] = await Promise.all([
            this.getUsers(),
            this.getProcesses(),
            this.getProducts(),
            this.getOrders()
        ]);

        return {
            users,
            processes,
            products,
            orders,
            lastSync: new Date().toISOString()
        };
    }

    // Создание резервной копии
    async createBackup() {
        const data = await this.getAllData();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fs = require('fs');
        const backupPath = path.join(__dirname, `backup-${timestamp}.json`);
        
        fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
        console.log('💾 Резервная копия создана:', backupPath);
        
        // Удаляем старые бэкапы (оставляем последние 10)
        const backupFiles = fs.readdirSync(__dirname)
            .filter(file => file.startsWith('backup-'))
            .sort()
            .reverse();
            
        if (backupFiles.length > 10) {
            for (let i = 10; i < backupFiles.length; i++) {
                fs.unlinkSync(path.join(__dirname, backupFiles[i]));
            }
        }
    }
}

module.exports = DatabaseManager;
