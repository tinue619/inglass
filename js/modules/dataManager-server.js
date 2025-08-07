// Менеджер данных - только серверное хранение
const DataManager = {
    // Кэш для быстрого доступа (только для чтения)
    cache: {
        users: [],
        processes: [],
        products: [],
        orders: []
    },
    
    // API сервис
    api: null,
    
    // Инициализация
    async init() {
        // Ждем загрузки APIService
        if (window.APIService) {
            this.api = window.APIService;
        } else {
            console.error('APIService не найден!');
            return false;
        }
        
        // Загружаем данные с сервера
        await this.loadFromServer();
        return true;
    },
    
    // Загрузка всех данных с сервера
    async loadFromServer() {
        try {
            console.log('📥 Загружаем данные с сервера...');
            
            // Загружаем все данные параллельно
            const [users, processes, products, orders] = await Promise.all([
                this.api.getEntity('users'),
                this.api.getEntity('processes'),
                this.api.getEntity('products'),
                this.api.getEntity('orders')
            ]);
            
            // Обновляем кэш
            this.cache.users = users || [];
            this.cache.processes = processes || [];
            this.cache.products = products || [];
            this.cache.orders = orders || [];
            
            console.log('✅ Данные загружены:', {
                users: this.cache.users.length,
                processes: this.cache.processes.length,
                products: this.cache.products.length,
                orders: this.cache.orders.length
            });
            
            // Уведомляем о загрузке
            this.notifyDataChanged();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
            throw error;
        }
    },
    
    // === ПОЛЬЗОВАТЕЛИ ===
    getUsers() {
        return this.cache.users;
    },
    
    findUser(id) {
        return this.cache.users.find(user => user.id === parseInt(id));
    },
    
    async createUser(userData) {
        try {
            const newUser = await this.api.createEntity('users', userData);
            this.cache.users.push(newUser);
            this.notifyDataChanged();
            return newUser;
        } catch (error) {
            console.error('Ошибка создания пользователя:', error);
            throw error;
        }
    },
    
    // === ПРОЦЕССЫ ===
    getProcesses() {
        return this.cache.processes;
    },
    
    findProcess(id) {
        return this.cache.processes.find(process => process.id === parseInt(id));
    },
    
    async createProcess(processData) {
        try {
            const newProcess = await this.api.createEntity('processes', processData);
            this.cache.processes.push(newProcess);
            this.notifyDataChanged();
            return newProcess;
        } catch (error) {
            console.error('Ошибка создания процесса:', error);
            throw error;
        }
    },
    
    async updateProcess(id, processData) {
        try {
            await this.api.updateEntity('processes', id, processData);
            const index = this.cache.processes.findIndex(p => p.id === parseInt(id));
            if (index !== -1) {
                this.cache.processes[index] = { ...this.cache.processes[index], ...processData };
            }
            this.notifyDataChanged();
        } catch (error) {
            console.error('Ошибка обновления процесса:', error);
            throw error;
        }
    },
    
    // === ИЗДЕЛИЯ ===
    getProducts() {
        return this.cache.products;
    },
    
    findProduct(id) {
        return this.cache.products.find(product => product.id === parseInt(id));
    },
    
    async createProduct(productData) {
        try {
            const newProduct = await this.api.createEntity('products', productData);
            this.cache.products.push(newProduct);
            this.notifyDataChanged();
            return newProduct;
        } catch (error) {
            console.error('Ошибка создания изделия:', error);
            throw error;
        }
    },
    
    // === ЗАКАЗЫ ===
    getOrders() {
        return this.cache.orders;
    },
    
    findOrder(id) {
        return this.cache.orders.find(order => order.id === parseInt(id));
    },
    
    async createOrder(orderData) {
        try {
            console.log('📝 Создаем заказ на сервере:', orderData);
            const newOrder = await this.api.createEntity('orders', orderData);
            this.cache.orders.push(newOrder);
            this.notifyDataChanged();
            console.log('✅ Заказ создан:', newOrder);
            return newOrder;
        } catch (error) {
            console.error('❌ Ошибка создания заказа:', error);
            throw error;
        }
    },
    
    async updateOrder(id, orderData) {
        try {
            await this.api.updateEntity('orders', id, orderData);
            const index = this.cache.orders.findIndex(o => o.id === parseInt(id));
            if (index !== -1) {
                this.cache.orders[index] = { ...this.cache.orders[index], ...orderData };
            }
            this.notifyDataChanged();
        } catch (error) {
            console.error('Ошибка обновления заказа:', error);
            throw error;
        }
    },
    
    async moveOrder(orderId, processId, reason, isDefect, userName) {
        try {
            console.log(`🔄 Перемещаем заказ ${orderId} в процесс ${processId}`);
            
            const result = await this.api.moveOrderToProcess(orderId, processId, reason, isDefect, userName);
            
            // Обновляем кэш
            const orderIndex = this.cache.orders.findIndex(o => o.id === parseInt(orderId));
            if (orderIndex !== -1) {
                this.cache.orders[orderIndex].currentProcessId = processId === 0 ? null : processId;
                this.cache.orders[orderIndex].status = processId === 0 ? 'status-done' : 'status-process';
                
                // Добавляем в историю если есть
                if (!this.cache.orders[orderIndex].history) {
                    this.cache.orders[orderIndex].history = [];
                }
                
                this.cache.orders[orderIndex].history.push({
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    type: isDefect ? 'defect_sent' : 'moved',
                    user: { name: userName || 'Пользователь' },
                    data: {
                        fromProcess: null, // Заполнится на сервере
                        toProcess: { id: processId, name: processId === 0 ? 'Завершено' : `Процесс ${processId}` },
                        reason: reason,
                        isDefect: isDefect || false
                    }
                });
            }
            
            this.notifyDataChanged();
            console.log('✅ Заказ перемещен успешно');
            return result;
            
        } catch (error) {
            console.error('❌ Ошибка перемещения заказа:', error);
            throw error;
        }
    },
    
    // === СТАТИСТИКА ===
    getStats() {
        return {
            totalOrders: this.cache.orders.length,
            completedOrders: this.cache.orders.filter(o => o.status === 'status-done').length,
            activeOrders: this.cache.orders.filter(o => o.status !== 'status-done').length,
            totalUsers: this.cache.users.length,
            totalProcesses: this.cache.processes.length,
            totalProducts: this.cache.products.length
        };
    },
    
    // === УВЕДОМЛЕНИЯ ===
    listeners: [],
    
    addListener(callback) {
        this.listeners.push(callback);
    },
    
    removeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    },
    
    notifyDataChanged() {
        this.listeners.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Ошибка в listener:', error);
            }
        });
    },
    
    // === ПЕРИОДИЧЕСКОЕ ОБНОВЛЕНИЕ ===
    startAutoRefresh(intervalMs = 30000) { // каждые 30 секунд
        this.stopAutoRefresh(); // Останавливаем предыдущий интервал если есть
        
        this.refreshInterval = setInterval(async () => {
            try {
                console.log('🔄 Автообновление данных...');
                await this.loadFromServer();
            } catch (error) {
                console.error('Ошибка автообновления:', error);
            }
        }, intervalMs);
        
        console.log(`🔄 Автообновление каждые ${intervalMs/1000} секунд`);
    },
    
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log('⏹ Автообновление остановлено');
        }
    }
};

// Глобальный доступ
window.DataManager = DataManager;

console.log('📊 DataManager (server-only) загружен');
