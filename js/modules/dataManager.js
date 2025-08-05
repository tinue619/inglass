// Управление данными приложения
const DataManager = {
    _data: {
        users: [APP_CONSTANTS.DEFAULTS.ADMIN_USER],
        processes: [],
        products: [],
        orders: [],
        currentUser: null
    },

    // Геттеры для данных
    getUsers() { return this._data.users; },
    getProcesses() { return this._data.processes; },
    getProducts() { return this._data.products; },
    getOrders() { return this._data.orders; },
    getCurrentUser() { return this._data.currentUser; },

    // Сеттеры для данных
    setCurrentUser(user) { this._data.currentUser = user; },

    // Добавление сущностей с автосохранением
    addUser(user) { 
        this._data.users.push(user); 
        this.save();
    },
    addProcess(process) { 
        this._data.processes.push(process); 
        this.save();
    },
    addProduct(product) { 
        this._data.products.push(product); 
        this.save();
    },
    addOrder(order) { 
        this._data.orders.push(order); 
        this.save();
    },

    // Поиск сущностей
    findUser(id) { return this._data.users.find(u => u.id === id); },
    findProcess(id) { return this._data.processes.find(p => p.id === id); },
    findProduct(id) { return this._data.products.find(p => p.id === id); },
    findOrder(id) { return this._data.orders.find(o => o.id === id); },

    // Удаление сущностей с автосохранением
    removeUser(id) { 
        this._data.users = this._data.users.filter(u => u.id !== id); 
        this.save();
    },
    removeProcess(id) { 
        this._data.processes = this._data.processes.filter(p => p.id !== id);
        // Удаляем из изделий
        this._data.products.forEach(product => {
            product.processes = product.processes.filter(pid => pid !== id);
        });
        // Удаляем из пользователей
        this._data.users.forEach(user => {
            user.processes = user.processes.filter(pid => pid !== id);
        });
        this.save();
    },
    removeProduct(id) { 
        this._data.products = this._data.products.filter(p => p.id !== id); 
        this.save();
    },
    removeOrder(id) { 
        this._data.orders = this._data.orders.filter(o => o.id !== id); 
        this.save();
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
        this.save();
        
        console.log('Добавлено событие в историю:', historyEvent);
    },

    // Перемещение заказа между процессами
    moveOrderToProcess(orderId, newProcessId, reason = null, isDefect = false) {
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
        
        this.save();
        return true;
    },

    // Сохранение данных в localStorage и на сервер
    save() {
        try {
            const dataToSave = {
                users: this._data.users,
                processes: this._data.processes,
                products: this._data.products,
                orders: this._data.orders
            };
            
            // Сохраняем локально
            localStorage.setItem(APP_CONSTANTS.STORAGE_KEYS.CRM_DATA, JSON.stringify(dataToSave));
            console.log('Данные сохранены локально');
            
            // Отправляем на сервер если доступен
            if (window.APIService && window.APIService.isOnline) {
                window.APIService.saveToServer().catch(error => {
                    console.warn('Не удалось сохранить на сервер:', error);
                });
            }
        } catch (error) {
            console.error('Ошибка сохранения данных:', error);
        }
    },

    // Загрузка данных из localStorage и обязательная синхронизация с сервером
    async load() {
        try {
            // Сначала загружаем локальные данные
            const savedData = localStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.CRM_DATA);
            if (savedData) {
                const parsed = JSON.parse(savedData);
                this._data.users = parsed.users || [APP_CONSTANTS.DEFAULTS.ADMIN_USER];
                this._data.processes = parsed.processes || [];
                this._data.products = parsed.products || [];
                this._data.orders = parsed.orders || [];
                
                console.log('💾 Локальные данные загружены');
            } else {
                console.log('🎆 Первый запуск - используются данные по умолчанию');
            }
            
            // Проверяем и восстанавливаем админа если его нет
            const admin = this._data.users.find(u => u.isAdmin);
            if (!admin) {
                console.log('👤 Админ не найден, создаем заново');
                this._data.users.unshift(APP_CONSTANTS.DEFAULTS.ADMIN_USER);
            }
            
            // ОБЯЗАТЕЛЬНО пытаемся синхронизироваться с сервером
            if (window.APIService) {
                console.log('🔄 Начинаем синхронизацию с сервером...');
                
                // Ждем немного для инициализации API сервиса
                await new Promise(resolve => setTimeout(resolve, 500));
                
                try {
                    // Проверяем состояние сервера
                    await window.APIService.checkServerStatus();
                    
                    if (window.APIService.isOnline) {
                        console.log('🌐 Сервер доступен, загружаем данные...');
                        
                        // Загружаем данные с сервера
                        const serverData = await window.APIService.getData();
                        if (serverData && this.hasData(serverData)) {
                            console.log('📥 Обновляем данные с сервера');
                            this._data.users = serverData.users || this._data.users;
                            this._data.processes = serverData.processes || [];
                            this._data.products = serverData.products || [];
                            this._data.orders = serverData.orders || [];
                        } else if (this.hasData(this._data)) {
                            console.log('📤 Отправляем локальные данные на сервер');
                            await window.APIService.saveToServer();
                        }
                    } else {
                        console.log('🟡 Сервер недоступен, работаем офлайн');
                    }
                } catch (error) {
                    console.warn('⚠️ Ошибка синхронизации:', error);
                }
            }
            
            // Сохраняем локально (без отправки на сервер)
            this.saveLocal();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
            console.log('🔄 Используются данные по умолчанию');
            this.saveLocal();
        }
    },
    
    // Проверка наличия данных
    hasData(data) {
        return data.processes?.length > 0 || data.products?.length > 0 || data.orders?.length > 0;
    },
    
    // Сохранение только локально
    saveLocal() {
        try {
            const dataToSave = {
                users: this._data.users,
                processes: this._data.processes,
                products: this._data.products,
                orders: this._data.orders
            };
            localStorage.setItem(APP_CONSTANTS.STORAGE_KEYS.CRM_DATA, JSON.stringify(dataToSave));
        } catch (error) {
            console.error('❌ Ошибка локального сохранения:', error);
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
    clearAll() {
        const admin = this._data.users.find(u => u.isAdmin);
        this._data.users = admin ? [admin] : [APP_CONSTANTS.DEFAULTS.ADMIN_USER];
        this._data.processes = [];
        this._data.products = [];
        this._data.orders = [];
        this.save();
    },

    // Создание тестовых данных
    createTestData() {
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
        
        processes.forEach(p => this.addProcess(p));
        products.forEach(p => this.addProduct(p));
        users.forEach(u => this.addUser(u));
        
        this.save();
    }
};

// Совместимость с legacy кодом
window.DataManager = DataManager;
window.data = DataManager._data;

// Экспорт старых функций для совместимости
window.saveData = () => DataManager.save();
window.loadData = () => DataManager.load();
window.saveCurrentUser = () => DataManager.saveCurrentUser();
window.loadCurrentUser = () => DataManager.loadCurrentUser();
window.addOrderHistoryEvent = (orderId, eventType, eventData) => DataManager.addOrderHistoryEvent(orderId, eventType, eventData);
window.moveOrderToProcess = (orderId, newProcessId, reason, isDefect) => DataManager.moveOrderToProcess(orderId, newProcessId, reason, isDefect);
