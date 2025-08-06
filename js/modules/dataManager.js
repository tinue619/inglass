// Управление данными приложения (с сервером как основным хранилищем)
const DataManager = {
    _data: {
        users: [APP_CONSTANTS.DEFAULTS.ADMIN_USER],
        processes: [],
        products: [],
        orders: [],
        currentUser: null
    },
    // Обновление сущностей (с отправкой на сервер)
    async updateUser(id, updatedData) {
        const user = this.findUser(id);
        if (!user) {
            console.error('Пользователь не найден для обновления:', id);
            return false;
        }
        
        // Обновляем данные
        Object.assign(user, updatedData);
        user.id = id; // сохраняем ID
        
        this.saveToCache();
        await this.syncWithServer();
        
        // Проверяем ссылочную целостность
        this.validateReferentialIntegrity();
        
        console.log(`✅ Пользователь "${user.name}" обновлен`);
        return true;
    },
    
    async updateProcess(id, updatedData) {
        const process = this.findProcess(id);
        if (!process) {
            console.error('Процесс не найден для обновления:', id);
            return false;
        }
        
        // Обновляем данные
        Object.assign(process, updatedData);
        process.id = id; // сохраняем ID
        
        this.saveToCache();
        await this.syncWithServer();
        
        console.log(`✅ Процесс "${process.name}" обновлен`);
        return true;
    },
    
    async updateProduct(id, updatedData) {
        const product = this.findProduct(id);
        if (!product) {
            console.error('Изделие не найдено для обновления:', id);
            return false;
        }
        
        // Обновляем данные
        Object.assign(product, updatedData);
        product.id = id; // сохраняем ID
        
        // Проверяем что все процессы существуют
        if (Array.isArray(product.processes)) {
            const validProcesses = product.processes.filter(processId => {
                const process = this.findProcess(processId);
                if (!process) {
                    console.warn(`⚠️ Процесс ID=${processId} не найден, удаляем из изделия "${product.name}"`);
                    return false;
                }
                return true;
            });
            
            if (validProcesses.length !== product.processes.length) {
                console.log(`🔧 Процессы изделия "${product.name}" исправлены: ${product.processes.length} -> ${validProcesses.length}`);
                product.processes = validProcesses;
            }
        }
        
        this.saveToCache();
        await this.syncWithServer();
        
        console.log(`✅ Изделие "${product.name}" обновлено`);
        return true;
    },
    
    async updateOrder(id, updatedData) {
        const order = this.findOrder(id);
        if (!order) {
            console.error('Заказ не найден для обновления:', id);
            return false;
        }
        
        // Обновляем данные
        Object.assign(order, updatedData);
        order.id = id; // сохраняем ID
        
        this.saveToCache();
        await this.syncWithServer();
        
        console.log(`✅ Заказ "${order.number}" обновлен`);
        return true;
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

    // Безопасное обновление данных с сервера
    updateFromServer(serverData) {
        console.log('🔄 Обновляем данные с сервера...');
        
        try {
            // Безопасное обновление с проверками и копированием массивов
            if (serverData.users && Array.isArray(serverData.users)) {
                this._data.users = [...serverData.users];
                console.log(`✅ Пользователи обновлены: ${this._data.users.length}`);
            } else {
                console.warn('⚠️ Некорректные данные пользователей с сервера');
            }
            
            if (serverData.processes && Array.isArray(serverData.processes)) {
                this._data.processes = [...serverData.processes];
                console.log(`✅ Процессы обновлены: ${this._data.processes.length}`);
            } else {
                console.warn('⚠️ Некорректные данные процессов с сервера');
                this._data.processes = [];
            }
            
            if (serverData.products && Array.isArray(serverData.products)) {
                this._data.products = [...serverData.products];
                console.log(`✅ Изделия обновлены: ${this._data.products.length}`);
            } else {
                console.warn('⚠️ Некорректные данные изделий с сервера');
                this._data.products = [];
            }
            
            if (serverData.orders && Array.isArray(serverData.orders)) {
                this._data.orders = [...serverData.orders];
                console.log(`✅ Заказы обновлены: ${this._data.orders.length}`);
            } else {
                console.warn('⚠️ Некорректные данные заказов с сервера');
                this._data.orders = [];
            }
            
            // Проверяем админа
            this.ensureAdminExists();
            
            // Валидируем данные
            this.validateData();
            
            // Сохраняем в кэш
            this.saveToCache();
            
            console.log('✅ Данные успешно обновлены с сервера');
            return true;
            
        } catch (error) {
            console.error('❌ Ошибка обновления данных с сервера:', error);
            return false;
        }
    },

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
        return order;
    },

    // Поиск сущностей (с нормализацией ID)
    findUser(id) { 
        if (id === null || id === undefined) return null;
        const normalizedId = typeof id === 'string' ? parseInt(id) : id;
        return this._data.users.find(u => u.id === normalizedId || u.id === String(normalizedId)); 
    },
    
    findProcess(id) { 
        if (id === null || id === undefined) return null;
        const normalizedId = typeof id === 'string' ? parseInt(id) : id;
        return this._data.processes.find(p => p.id === normalizedId || p.id === String(normalizedId)); 
    },
    
    findProduct(id) { 
        if (id === null || id === undefined) return null;
        const normalizedId = typeof id === 'string' ? parseInt(id) : id;
        return this._data.products.find(p => p.id === normalizedId || p.id === String(normalizedId)); 
    },
    
    findOrder(id) { 
        if (id === null || id === undefined) return null;
        const normalizedId = typeof id === 'string' ? parseInt(id) : id;
        return this._data.orders.find(o => o.id === normalizedId || o.id === String(normalizedId)); 
    },

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
            console.log('💾 Данные сохранены в кэш (localStorage)');
        } catch (error) {
            console.error('Ошибка сохранения в кэш:', error);
        }
    },

    // Синхронизация с сервером (полная отправка данных)
    async syncWithServer() {
        if (window.APIService) {
            // Проверяем статус сервера перед попыткой сохранения
            await window.APIService.checkServerStatus();
            
            if (window.APIService.isOnline) {
                console.log('📤 Синхронизируем с сервером...');
                const success = await window.APIService.saveToServer();
                if (success) {
                    console.log('✅ Данные успешно синхронизированы');
                } else {
                    console.log('⚠️ Не удалось синхронизировать данные');
                }
            } else {
                console.log('🔴 Сервер недоступен, данные сохранены только в кэш');
            }
        } else {
            console.log('⚠️ APIService недоступен');
        }
    },

    // Загрузка данных (приоритет серверу)
    async load() {
        console.log('📅 Начинаем загрузку данных...');
        
        try {
            // Сначала загружаем из кэша для быстрого старта
            console.log('📂 Быстрый старт: загружаем из кэша...');
            this.loadFromCache();
            
            // Затем пытаемся загрузить с сервера и перезаписать
            if (window.APIService) {
                console.log('🌐 Проверяем доступность сервера и загружаем актуальные данные...');
                
                // Ждём немного, чтобы APIService инициализировался
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const serverLoaded = await window.APIService.loadFromServer();
                if (serverLoaded) {
                    console.log('✅ Данные обновлены с сервера');
                } else {
                    console.log('⚠️ Сервер недоступен, используем кэшированные данные');
                }
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

    // Загрузка из кэша
    loadFromCache() {
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
        let fixedErrors = [];
        
        console.log('🔍 Начинаем валидацию данных...');
        
        // Проверяем что все массивы
        if (!Array.isArray(this._data.users)) {
            console.warn('⚠️ Пользователи не являются массивом, исправляем...');
            this._data.users = [APP_CONSTANTS.DEFAULTS.ADMIN_USER];
            hasErrors = true;
            fixedErrors.push('Пользователи сброшены к админу');
        }
        
        if (!Array.isArray(this._data.processes)) {
            console.warn('⚠️ Процессы не являются массивом, исправляем...');
            this._data.processes = [];
            hasErrors = true;
            fixedErrors.push('Процессы очищены');
        }
        
        if (!Array.isArray(this._data.products)) {
            console.warn('⚠️ Изделия не являются массивом, исправляем...');
            this._data.products = [];
            hasErrors = true;
            fixedErrors.push('Изделия очищены');
        }
        
        if (!Array.isArray(this._data.orders)) {
            console.warn('⚠️ Заказы не являются массивом, исправляем...');
            this._data.orders = [];
            hasErrors = true;
            fixedErrors.push('Заказы очищены');
        }
        
        // Нормализуем ID (все должны быть числами)
        this._data.users.forEach(user => {
            if (typeof user.id === 'string' && !isNaN(user.id)) {
                user.id = parseInt(user.id);
                hasErrors = true;
            }
            // Проверяем массив процессов
            if (!Array.isArray(user.processes)) {
                user.processes = [];
                hasErrors = true;
            }
        });
        
        this._data.processes.forEach(process => {
            if (typeof process.id === 'string' && !isNaN(process.id)) {
                process.id = parseInt(process.id);
                hasErrors = true;
            }
            if (typeof process.order !== 'number') {
                process.order = 1;
                hasErrors = true;
            }
        });
        
        this._data.products.forEach(product => {
            if (typeof product.id === 'string' && !isNaN(product.id)) {
                product.id = parseInt(product.id);
                hasErrors = true;
            }
            // Проверяем массив процессов
            if (!Array.isArray(product.processes)) {
                product.processes = [];
                hasErrors = true;
            }
        });
        
        this._data.orders.forEach(order => {
            if (typeof order.id === 'string' && !isNaN(order.id)) {
                order.id = parseInt(order.id);
                hasErrors = true;
            }
            if (typeof order.productId === 'string' && !isNaN(order.productId)) {
                order.productId = parseInt(order.productId);
                hasErrors = true;
            }
            if (order.currentProcessId && typeof order.currentProcessId === 'string' && !isNaN(order.currentProcessId)) {
                order.currentProcessId = parseInt(order.currentProcessId);
                hasErrors = true;
            }
            // Проверяем историю
            if (!Array.isArray(order.history)) {
                order.history = [];
                hasErrors = true;
            }
        });
        
        // Проверяем ссылочную целостность
        this.validateReferentialIntegrity();
        
        // Обновляем порядковые номера процессов
        this._data.processes.forEach((process, index) => {
            if (!process.order || process.order !== (index + 1)) {
                process.order = index + 1;
                hasErrors = true;
            }
        });
        
        if (hasErrors) {
            console.log('🔧 Данные исправлены после валидации. Исправлено:', fixedErrors);
            this.saveToCache();
        } else {
            console.log('✅ Все данные прошли валидацию');
        }
        
        console.log('📊 Статистика после валидации:', {
            'Пользователи': this._data.users.length,
            'Процессы': this._data.processes.length,
            'Изделия': this._data.products.length,
            'Заказы': this._data.orders.length
        });
    },
    
    // Проверка ссылочной целостности
    validateReferentialIntegrity() {
        let fixedReferences = 0;
        
        console.log('🔗 Проверяем ссылочную целостность...');
        
        // Проверяем процессы в изделиях
        this._data.products.forEach(product => {
            if (Array.isArray(product.processes)) {
                const validProcesses = product.processes.filter(processId => {
                    const process = this.findProcess(processId);
                    if (!process) {
                        console.warn(`🔴 Изделие "${product.name}" ссылается на несуществующий процесс ID=${processId}`);
                        fixedReferences++;
                        return false;
                    }
                    return true;
                });
                
                if (validProcesses.length !== product.processes.length) {
                    console.log(`🔧 Исправлены процессы для изделия "${product.name}": ${product.processes.length} -> ${validProcesses.length}`);
                    product.processes = validProcesses;
                }
            }
        });
        
        // Проверяем процессы у пользователей
        this._data.users.forEach(user => {
            if (Array.isArray(user.processes)) {
                const validProcesses = user.processes.filter(processId => {
                    const process = this.findProcess(processId);
                    if (!process) {
                        console.warn(`🔴 Пользователь "${user.name}" ссылается на несуществующий процесс ID=${processId}`);
                        fixedReferences++;
                        return false;
                    }
                    return true;
                });
                
                if (validProcesses.length !== user.processes.length) {
                    console.log(`🔧 Исправлены процессы для пользователя "${user.name}": ${user.processes.length} -> ${validProcesses.length}`);
                    user.processes = validProcesses;
                }
            }
        });
        
        // Проверяем заказы
        this._data.orders.forEach(order => {
            // Проверяем ссылку на изделие
            const product = this.findProduct(order.productId);
            if (!product) {
                console.warn(`🔴 Заказ "${order.number}" ссылается на несуществующее изделие ID=${order.productId}`);
                // Не удаляем заказ, только логируем
                fixedReferences++;
            }
            
            // Проверяем текущий процесс
            if (order.currentProcessId) {
                const currentProcess = this.findProcess(order.currentProcessId);
                if (!currentProcess) {
                    console.warn(`🔴 Заказ "${order.number}" ссылается на несуществующий процесс ID=${order.currentProcessId}`);
                    // Сбрасываем на null (завершено)
                    order.currentProcessId = null;
                    fixedReferences++;
                }
            }
        });
        
        if (fixedReferences > 0) {
            console.log(`🔧 Исправлено ${fixedReferences} нарушений ссылочной целостности`);
        } else {
            console.log('✅ Ссылочная целостность сохранена');
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

    // Метод save для совместимости
    save() {
        this.saveToCache();
        this.syncWithServer(); // асинхронная синхронизация
        console.log('💾 Данные сохранены через save()');
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
