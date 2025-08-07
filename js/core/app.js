/**
 * Центральный класс приложения - точка входа для всей системы
 */
class CRMApp {
    constructor() {
        this.initialized = false;
        this.currentUser = null;
        
        // Менеджеры сущностей
        this.users = new UserManager();
        this.processes = new ProcessManager();
        this.products = new ProductManager();
        this.orders = new OrderManager();
        
        // API клиент
        this.api = null;
        
        // Конфигурация
        this.config = {
            apiUrl: this.getApiUrl(),
            autoSyncInterval: 30000,
            debug: true
        };
        
        // Состояние синхронизации
        this.syncState = {
            isOnline: false,
            lastSync: null,
            syncing: false
        };
        
        this.setupEventListeners();
    }

    getApiUrl() {
        if (window.APP_CONFIG && typeof window.APP_CONFIG.getApiUrl === 'function') {
            return window.APP_CONFIG.getApiUrl();
        }
        const currentDomain = window.location.origin;
        if (currentDomain.includes('localhost') || currentDomain.includes('127.0.0.1')) {
            return 'http://localhost:3001/api';
        }
        return `${currentDomain}/api`;
    }

    setupEventListeners() {
        // Подписываемся на изменения в менеджерах для автосинхронизации
        [this.users, this.processes, this.products, this.orders].forEach(manager => {
            manager.addObserver((action, data) => {
                if (this.config.debug) {
                    console.log(`🔄 ${manager.constructor.name}: ${action}`, data);
                }
                this.scheduleSync();
            });
        });
    }

    // === ИНИЦИАЛИЗАЦИЯ ===

    async init() {
        try {
            console.log('🚀 Инициализация CRM системы...');
            
            // Проверяем подключение к серверу
            await this.checkServerConnection();
            
            // Загружаем данные
            await this.loadData();
            
            // Восстанавливаем сессию пользователя
            this.restoreUserSession();
            
            // Запускаем автосинхронизацию
            this.startAutoSync();
            
            this.initialized = true;
            console.log('✅ CRM система инициализирована');
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            throw error;
        }
    }

    async checkServerConnection() {
        try {
            const response = await fetch(`${this.config.apiUrl}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const result = await response.json();
                this.syncState.isOnline = result.success;
                console.log('🌐 Сервер доступен');
            } else {
                this.syncState.isOnline = false;
                console.warn('⚠️ Сервер недоступен');
            }
        } catch (error) {
            this.syncState.isOnline = false;
            console.warn('⚠️ Нет соединения с сервером');
        }
    }

    async loadData() {
        try {
            console.log('📥 Загрузка данных с сервера...');
            
            if (!this.syncState.isOnline) {
                console.log('📱 Работаем в автономном режиме');
                return;
            }

            const response = await fetch(`${this.config.apiUrl}/data`);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    this.users.loadFromArray(result.data.users || []);
                    this.processes.loadFromArray(result.data.processes || []);
                    this.products.loadFromArray(result.data.products || []);
                    this.orders.loadFromArray(result.data.orders || []);
                    
                    this.syncState.lastSync = new Date();
                    
                    console.log('✅ Данные загружены:', {
                        users: this.users.count(),
                        processes: this.processes.count(),
                        products: this.products.count(),
                        orders: this.orders.count()
                    });
                }
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
        }
    }

    async saveData() {
        try {
            if (!this.syncState.isOnline || this.syncState.syncing) {
                return false;
            }

            this.syncState.syncing = true;
            console.log('📤 Сохранение данных на сервер...');

            const data = {
                users: this.users.toArray(),
                processes: this.processes.toArray(),
                products: this.products.toArray(),
                orders: this.orders.toArray()
            };

            const response = await fetch(`${this.config.apiUrl}/data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.syncState.lastSync = new Date();
                    console.log('✅ Данные сохранены');
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error);
            return false;
        } finally {
            this.syncState.syncing = false;
        }
    }

    // === УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ===

    async login(phone, password) {
        const user = this.users.authenticate(phone, password);
        if (user) {
            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user.toJSON()));
            console.log('👤 Пользователь авторизован:', user.name);
            return user;
        }
        throw new Error('Неверный телефон или пароль');
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.stopAutoSync();
        console.log('👋 Пользователь вышел из системы');
    }

    restoreUserSession() {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            try {
                const data = JSON.parse(userData);
                this.currentUser = this.users.getById(data.id);
                if (this.currentUser) {
                    console.log('🔄 Сессия восстановлена:', this.currentUser.name);
                } else {
                    localStorage.removeItem('currentUser');
                }
            } catch (error) {
                localStorage.removeItem('currentUser');
            }
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return !!this.currentUser;
    }

    // === СИНХРОНИЗАЦИЯ ===

    scheduleSync() {
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }
        this.syncTimeout = setTimeout(() => this.saveData(), 1000);
    }

    startAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        this.syncInterval = setInterval(() => {
            this.loadData();
        }, this.config.autoSyncInterval);
        console.log(`🔄 Автосинхронизация запущена (${this.config.autoSyncInterval/1000}с)`);
    }

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
            this.syncTimeout = null;
        }
    }

    // === УТИЛИТЫ ===

    getStats() {
        return {
            users: this.users.count(),
            processes: this.processes.count(),
            products: this.products.count(),
            orders: this.orders.count(),
            completedOrders: this.orders.getCompleted().length,
            activeOrders: this.orders.getActive().length,
            isOnline: this.syncState.isOnline,
            lastSync: this.syncState.lastSync
        };
    }

    // === API ДЛЯ СОВМЕСТИМОСТИ С СУЩЕСТВУЮЩИМ КОДОМ ===

    // DataManager compatibility
    getUsers() { return this.users.getAll(); }
    getProcesses() { return this.processes.getAll(); }
    getProducts() { return this.products.getAll(); }
    getOrders() { return this.orders.getAll(); }
    
    findUser(id) { return this.users.getById(id); }
    findProcess(id) { return this.processes.getById(id); }
    findProduct(id) { return this.products.getById(id); }
    findOrder(id) { return this.orders.getById(id); }
    
    async addProcess(data) {
        const process = this.processes.create(data);
        await this.saveEntityToServer('processes', process);
        return process;
    }
    
    async removeProcess(id) {
        const success = this.processes.delete(id);
        if (success) {
            await this.deleteEntityFromServer('processes', id);
        }
        return success;
    }
    
    async createOrder(data) {
        const order = this.orders.create(data);
        await this.saveEntityToServer('orders', order);
        return order;
    }
    
    async moveOrder(orderId, processId, moveData = {}) {
        const historyEntry = this.orders.moveOrder(orderId, processId, moveData);
        if (historyEntry) {
            const order = this.orders.getById(orderId);
            await this.updateEntityOnServer('orders', order);
        }
        return historyEntry;
    }
    
    // === СЕРВЕРНЫЕ ОПЕРАЦИИ ===
    
    async saveEntityToServer(entityType, entity) {
        if (!this.syncState.isOnline) return false;
        
        try {
            const response = await fetch(`${this.config.apiUrl}/${entityType}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entity.toJSON())
            });
            
            return response.ok;
        } catch (error) {
            console.error(`Ошибка сохранения ${entityType}:`, error);
            return false;
        }
    }
    
    async updateEntityOnServer(entityType, entity) {
        if (!this.syncState.isOnline) return false;
        
        try {
            const response = await fetch(`${this.config.apiUrl}/${entityType}/${entity.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entity.toJSON())
            });
            
            return response.ok;
        } catch (error) {
            console.error(`Ошибка обновления ${entityType}:`, error);
            return false;
        }
    }
    
    async deleteEntityFromServer(entityType, id) {
        if (!this.syncState.isOnline) return false;
        
        try {
            const response = await fetch(`${this.config.apiUrl}/${entityType}/${id}`, {
                method: 'DELETE'
            });
            
            return response.ok;
        } catch (error) {
            console.error(`Ошибка удаления ${entityType}:`, error);
            return false;
        }
    }
}

// Создаем глобальный экземпляр приложения
window.CRMApp = CRMApp;
window.App = new CRMApp();

// Совместимость с существующим кодом
window.DataManager = {
    // Делегируем все вызовы к App
    init: () => App.init(),
    getUsers: () => App.getUsers(),
    getProcesses: () => App.getProcesses(),
    getProducts: () => App.getProducts(),
    getOrders: () => App.getOrders(),
    findUser: (id) => App.findUser(id),
    findProcess: (id) => App.findProcess(id),
    findProduct: (id) => App.findProduct(id),
    findOrder: (id) => App.findOrder(id),
    addProcess: (data) => App.addProcess(data),
    removeProcess: (id) => App.removeProcess(id),
    createOrder: (data) => App.createOrder(data),
    moveOrder: (orderId, processId, moveData) => App.moveOrder(orderId, processId, moveData),
    
    // Методы пользователя
    setCurrentUser: (user) => { App.currentUser = user; },
    getCurrentUser: () => App.getCurrentUser(),
    clearCurrentUser: () => App.logout(),
    
    // Статистика
    getStats: () => App.getStats(),
    
    // Автообновление
    startAutoRefresh: (interval) => {
        App.config.autoSyncInterval = interval;
        App.startAutoSync();
    },
    
    // UI обновления
    notifyUIUpdate: () => {
        if (window.AdminModule && typeof AdminModule.renderProcesses === 'function') {
            AdminModule.renderProcesses();
        }
        if (window.BoardModule && typeof BoardModule.renderBoard === 'function') {
            BoardModule.renderBoard();
        }
    },
    
    // Серверные операции - совместимость
    loadFromServer: async () => {
        try {
            if (App.initialized) {
                return await App.loadData();
            }
            return false;
        } catch (error) {
            console.error('Ошибка загрузки с сервера:', error);
            return false;
        }
    },
    
    saveToServer: async () => {
        try {
            if (App.initialized) {
                return await App.saveData();
            }
            return false;
        } catch (error) {
            console.error('Ошибка сохранения на сервер:', error);
            return false;
        }
    },
    
    // Метод для безопасного обновления данных с сервера
    updateFromServer: (serverData) => {
        try {
            if (!App.initialized) {
                console.warn('App не инициализирован, пропускаем обновление');
                return false;
            }
            
            if (serverData.users) {
                App.users.loadFromArray(serverData.users);
            }
            if (serverData.processes) {
                App.processes.loadFromArray(serverData.processes);
            }
            if (serverData.products) {
                App.products.loadFromArray(serverData.products);
            }
            if (serverData.orders) {
                App.orders.loadFromArray(serverData.orders);
            }
            
            console.log('✅ Данные обновлены с сервера через DataManager compatibility layer');
            return true;
        } catch (error) {
            console.error('Ошибка обновления данных:', error);
            return false;
        }
    },
    
    // Дополнительные методы для совместимости
    saveToCache: () => {
        // В новом ядре кэширование происходит автоматически
        console.log('ℹ️ Кэширование происходит автоматически в новом ядре');
        return true;
    },
    
    loadFromCache: () => {
        // В новом ядре восстановление происходит при инициализации
        console.log('ℹ️ Восстановление данных происходит автоматически при инициализации');
        return true;
    }
};

console.log('🎯 CRM App Core загружен');
