// Управление данными приложения (с сервером как основным хранилищем)
const DataManager = {
    _data: {
        users: [APP_CONSTANTS.DEFAULTS.ADMIN_USER],
        processes: [],
        products: [],
        orders: [],
        currentUser: null
    },

    // Геттеры для данных (с защитой от undefined)
    getUsers() { 
        if (!this._data.users || !Array.isArray(this._data.users)) {
            console.warn('Пользователи не загружены, возвращаем данные по умолчанию');
            this._data.users = [APP_CONSTANTS.DEFAULTS.ADMIN_USER];
        }
        return this._data.users;
    },
    
    getProcesses() { 
        if (!this._data.processes || !Array.isArray(this._data.processes)) {
            console.warn('Процессы не загружены, возвращаем пустой массив');
            this._data.processes = [];
        }
        return this._data.processes;
    },
    
    getProducts() { 
        if (!this._data.products || !Array.isArray(this._data.products)) {
            console.warn('Изделия не загружены, возвращаем пустой массив');
            this._data.products = [];
        }
        return this._data.products;
    },
    
    getOrders() { 
        if (!this._data.orders || !Array.isArray(this._data.orders)) {
            console.warn('Заказы не загружены, возвращаем пустой массив');
            this._data.orders = [];
        }
        return this._data.orders;
    },
    
    getCurrentUser() { return this._data.currentUser; },

    // Сеттеры для данных
    setCurrentUser(user) { this._data.currentUser = user; },

    // Добавление сущностей (с отправкой на сервер)
    async addUser(user) { 
        this._data.users.push(user);
        this.saveToCache();
        
        // Пытаемся создать на сервере
        if (window.APIService && window.APIService.isOnline) {
            const serverId = await window.APIService.createEntity('users', user);
            if (serverId) {
                user.id = serverId;
                console.log('Пользователь создан на сервере с ID:', serverId);
            }
        }
        
        // Отправляем полный набор данных для синхронизации
        await this.syncWithServer();
    },
    
    async addProcess(process) { 
        this._data.processes.push(process);
        this.saveToCache();
        
        // Пытаемся создать на сервере
        if (window.APIService && window.APIService.isOnline) {
            const serverId = await window.APIService.createEntity('processes', process);
            if (serverId) {
                process.id = serverId;
                console.log('Процесс создан на сервере с ID:', serverId);
            }
        }
        
        await this.syncWithServer();
    },
    
    async addProduct(product) { 
        this._data.products.push(product);
        this.saveToCache();
        
        // Пытаемся создать на сервере
        if (window.APIService && window.APIService.isOnline) {
            const serverId = await window.APIService.createEntity('products', product);
            if (serverId) {
                product.id = serverId;
                console.log('Изделие создано на сервере с ID:', serverId);
            }
        }
        
        await this.syncWithServer();
    },
    
    async addOrder(order) { 
        this._data.orders.push(order);
        this.saveToCache();
        
        // Пытаемся создать на сервере
        if (window.APIService && window.APIService.isOnline) {
            const serverId = await window.APIService.createEntity('orders', order);
            if (serverId) {
                order.id = serverId;
                console.log('Заказ создан на сервере с ID:', serverId);
            }
        }
        
        await this.syncWithServer();
    },

    // Поиск сущностей
    findUser(id) { return this._data.users.find(u => u.id === id); },
    findProcess(id) { return this._data.processes.find(p => p.id === id); },
    findProduct(id) { return this._data.products.find(p => p.id === id); },
    findOrder(id) { return this._data.orders.find(o => o.id === id); },

    // Удаление сущностей (с отправкой на сервер)
    async removeUser(id) { 
        this._data.users = this._data.users.filter(u => u.id !== id);
        this.saveToCache();
        await this.syncWithServer();
    },
    
    async removeProcess(id) { 
        this._data.processes = this._data.processes.filter(p => p.id !== id);
        // Удаляем из изделий
        this._data.products.forEach(product => {
            product.processes = product.processes.filter(pid => pid !== id);
        });
        // Удаляем из пользователей
        this._data.users.forEach(user => {
            user.processes = user.processes.filter(pid => pid !== id);
        });
        this.saveToCache();
        await this.syncWithServer();
    },
    
    async removeProduct(id) { 
        this._data.products = this._data.products.filter(p => p.id !== id);
        this.saveToCache();
        await this.syncWithServer();
    },
    
    async removeOrder(id) { 
        this._data.orders = this._data.orders.filter(o => o.id !== id);
        this.saveToCache();
        await this.syncWithServer();
    },

    // Работа с историей заказов
    addOrderHistoryEvent(orderId, eventType, eventData = {}) {
        const order = this.findOrder(orderId);
        if (!order) return;
        
        if (!order.history) {
            order.history = [];
        }
        
        const historyEvent = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            type: eventType,
            user: eventData.currentUser || { name: 'Система' },
            data: {
                fromProcess: eventData.fromProcess || null,
                toProcess: eventData.toProcess || null,
                reason: eventData.reason || null,
                comment: eventData.comment || null,
                isDefect: eventData.isDefect || false
            }
        };
        
        order.history.push(historyEvent);
        this.saveToCache();
        
        console.log('Добавлено событие в историю:', historyEvent);
        
        // Синхронизируем с сервером асинхронно
        this.syncWithServer();
    },

    // Перемещение заказа между процессами (с отправкой на сервер)
    async moveOrderToProcess(orderId, newProcessId, reason = null, isDefect = false) {
        const order = this.findOrder(orderId);
        if (!order) return false;
        
        const oldProcessId = order.currentProcessId;
        const oldProcess = oldProcessId ? this.findProcess(oldProcessId) : null;
        const newProcess = newProcessId ? this.findProcess(newProcessId) : null;
        
        order.currentProcessId = newProcessId === 0 ? null : newProcessId;
        
        // Правильно определяем названия процессов
        const fromProcessInfo = oldProcess ? 
            { id: oldProcess.id, name: oldProcess.name } : 
            { id: null, name: 'Начальное состояние' };
            
        const toProcessInfo = newProcess ? 
            { id: newProcess.id, name: newProcess.name } : 
            { id: 0, name: 'Завершено' };
        
        // Добавляем событие в историю
        this.addOrderHistoryEvent(orderId, isDefect ? APP_CONSTANTS.EVENT_TYPES.DEFECT_SENT : APP_CONSTANTS.EVENT_TYPES.MOVED, {
            currentUser: this._data.currentUser,
            fromProcess: fromProcessInfo,
            toProcess: toProcessInfo,
            reason: reason,
            isDefect: isDefect
        });
        
        this.saveToCache();
        
        // Отправляем на сервер
        if (window.APIService && window.APIService.isOnline) {
            const success = await window.APIService.moveOrder(
                orderId, 
                newProcessId, 
                reason, 
                isDefect, 
                this._data.currentUser?.name
            );
            
            if (success) {
                console.log('Заказ перемещен на сервере');
            } else {
                console.warn('Не удалось переместить заказ на сервере, данные сохранены локально');
            }
        }
        
        return true;
    },

    // Сохранение в localStorage как кэш
    saveToCache() {
        try {
            const dataToSave = {
                users: this._data.users,
                processes: this._data.processes,
                products: this._data.products,
                orders: this._data.orders
            };
            
            localStorage.setItem(APP_CONSTANTS.STORAGE_KEYS.CRM_DATA, JSON.stringify(dataToSave));
            console.log('Данные сохранены в кэш (localStorage)');
        } catch (error) {
            console.error('Ошибка сохранения в кэш:', error);
        }
    },

    // Синхронизация с сервером (полная отправка данных)
    async syncWithServer() {
        if (window.APIService && window.APIService.isOnline) {
            await window.APIService.saveToServer();
        } else {
            console.log('Сервер недоступен, данные сохранены только в кэш');
        }
    },

    // Загрузка данных (сначала с сервера, потом из кэша)
    async load() {
        console.log('📅 Начинаем загрузку данных...');
        
        try {
            // Сначала пытаемся загрузить с сервера
            if (window.APIService) {
                console.log('🌐 Проверяем доступность сервера...');
                const serverLoaded = await window.APIService.loadFromServer();
                if (serverLoaded) {
                    console.log('✅ Данные успешно загружены с сервера');
                    
                    // Проверяем что данные действительно загрузились
                    this.validateData();
                    return;
                }
            }
            
            // Если сервер недоступен, загружаем из кэша
            console.log('📂 Сервер недоступен, загружаем из кэша...');
            
            const savedData = localStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.CRM_DATA);
            if (savedData) {
                try {
                    const parsed = JSON.parse(savedData);
                    
                    // Проверяем и загружаем данные
                    this._data.users = Array.isArray(parsed.users) ? parsed.users : [APP_CONSTANTS.DEFAULTS.ADMIN_USER];
                    this._data.processes = Array.isArray(parsed.processes) ? parsed.processes : [];
                    this._data.products = Array.isArray(parsed.products) ? parsed.products : [];
                    this._data.orders = Array.isArray(parsed.orders) ? parsed.orders : [];
                    
                    console.log('✅ Данные загружены из кэша');
                } catch (parseError) {
                    console.error('❌ Ошибка парсинга данных из кэша:', parseError);
                    this.initializeDefaultData();
                }
            } else {
                console.log('📋 Кэш пуст, используются данные по умолчанию');
                this.initializeDefaultData();
            }
            
            // Проверяем и восстанавливаем админа если его нет
            this.ensureAdminExists();
            
            // Валидируем загруженные данные
            this.validateData();
            
            // Сохраняем в кэш
            this.saveToCache();
            
        } catch (error) {
            console.error('❌ Критическая ошибка загрузки данных:', error);
            console.log('📋 Инициализируем данные по умолчанию из-за ошибки');
            this.initializeDefaultData();
            this.ensureAdminExists();
            this.saveToCache();
        }
        
        console.log('📊 Загрузка завершена. Статистика:', {
            пользователи: this._data.users.length,
            процессы: this._data.processes.length,
            изделия: this._data.products.length,
            заказы: this._data.orders.length
        });
    },
    
    // Инициализация данных по умолчанию
    initializeDefaultData() {
        this._data.users = [APP_CONSTANTS.DEFAULTS.ADMIN_USER];
        this._data.processes = [];
        this._data.products = [];
        this._data.orders = [];
        console.log('🔧 Данные инициализированы значениями по умолчанию');
    },
    
    // Проверка наличия администратора
    ensureAdminExists() {
        const admin = this._data.users.find(u => u.isAdmin);
        if (!admin) {
            console.log('👤 Админ не найден, создаем заново');
            this._data.users.unshift(APP_CONSTANTS.DEFAULTS.ADMIN_USER);
        }
    },
    
    // Валидация данных
    validateData() {
        let hasErrors = false;
        
        if (!Array.isArray(this._data.users)) {
            console.warn('⚠️ Пользователи не являются массивом, исправляем...');
            this._data.users = [APP_CONSTANTS.DEFAULTS.ADMIN_USER];
            hasErrors = true;
        }
        
        if (!Array.isArray(this._data.processes)) {
            console.warn('⚠️ Процессы не являются массивом, исправляем...');
            this._data.processes = [];
            hasErrors = true;
        }
        
        if (!Array.isArray(this._data.products)) {
            console.warn('⚠️ Изделия не являются массивом, исправляем...');
            this._data.products = [];
            hasErrors = true;
        }
        
        if (!Array.isArray(this._data.orders)) {
            console.warn('⚠️ Заказы не являются массивом, исправляем...');
            this._data.orders = [];
            hasErrors = true;
        }
        
        if (hasErrors) {
            console.log('🔧 Данные исправлены после валидации');
            this.saveToCache();
        } else {
            console.log('✅ Все данные прошли валидацию');
        }
    },

    // Работа с текущим пользователем
    saveCurrentUser() {
        if (this._data.currentUser) {
            sessionStorage.setItem(APP_CONSTANTS.STORAGE_KEYS.CURRENT_USER, JSON.stringify(this._data.currentUser));
            console.log('Текущий пользователь сохранен:', this._data.currentUser.name);
        } else {
            sessionStorage.removeItem(APP_CONSTANTS.STORAGE_KEYS.CURRENT_USER);
            console.log('Текущий пользователь удален из сессии');
        }
    },

    loadCurrentUser() {
        try {
            const savedUser = sessionStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.CURRENT_USER);
            if (savedUser) {
                const parsedUser = JSON.parse(savedUser);
                
                const actualUser = this._data.users.find(u => u.id === parsedUser.id);
                if (actualUser) {
                    this._data.currentUser = actualUser;
                    console.log('Текущий пользователь загружен:', this._data.currentUser.name, 'Админ:', this._data.currentUser.isAdmin);
                    return true;
                } else {
                    console.log('Сохраненный пользователь не найден в базе, очищаем сессию');
                    sessionStorage.removeItem(APP_CONSTANTS.STORAGE_KEYS.CURRENT_USER);
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки текущего пользователя:', error);
            sessionStorage.removeItem(APP_CONSTANTS.STORAGE_KEYS.CURRENT_USER);
        }
        return false;
    },

    // Очистка всех данных (кроме админа)
    async clearAll() {
        const admin = this._data.users.find(u => u.isAdmin);
        this._data.users = admin ? [admin] : [APP_CONSTANTS.DEFAULTS.ADMIN_USER];
        this._data.processes = [];
        this._data.products = [];
        this._data.orders = [];
        this.saveToCache();
        await this.syncWithServer();
    },

    // Создание тестовых данных
    async createTestData() {
        const processes = [
            { id: Date.now() + 1, name: 'Прием заказа', order: 1 },
            { id: Date.now() + 2, name: 'Замер', order: 2 },
            { id: Date.now() + 3, name: 'Резка', order: 3 },
            { id: Date.now() + 4, name: 'Упаковка', order: 4 }
        ];
        
        const products = [
            { id: Date.now() + 10, name: 'Стекло', processes: [processes[0].id, processes[1].id, processes[2].id, processes[3].id] },
            { id: Date.now() + 11, name: 'Зеркало', processes: [processes[0].id, processes[2].id, processes[3].id] }
        ];
        
        const users = [
            {
                id: Date.now() + 20,
                name: 'Менеджер',
                phone: '+7 111 111 1111',
                password: '1111',
                isAdmin: false,
                canCreateOrders: true,
                processes: [processes[0].id]
            },
            {
                id: Date.now() + 21,
                name: 'Мастер резки',
                phone: '+7 222 222 2222',
                password: '2222',
                isAdmin: false,
                canCreateOrders: false,
                processes: [processes[2].id]
            }
        ];
        
        // Добавляем процессы
        for (const process of processes) {
            await this.addProcess(process);
        }
        
        // Добавляем изделия
        for (const product of products) {
            await this.addProduct(product);
        }
        
        // Добавляем пользователей
        for (const user of users) {
            await this.addUser(user);
        }
        
        console.log('✅ Тестовые данные созданы');
    }
};

// Совместимость с legacy кодом
window.DataManager = DataManager;
window.data = DataManager._data;

// Экспорт функций для совместимости
window.saveData = () => DataManager.saveToCache();
window.loadData = () => DataManager.load();
window.saveCurrentUser = () => DataManager.saveCurrentUser();
window.loadCurrentUser = () => DataManager.loadCurrentUser();
window.addOrderHistoryEvent = (orderId, eventType, eventData) => DataManager.addOrderHistoryEvent(orderId, eventType, eventData);
window.moveOrderToProcess = (orderId, newProcessId, reason, isDefect) => DataManager.moveOrderToProcess(orderId, newProcessId, reason, isDefect);
