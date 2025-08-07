// Простой серверный DataManager - адаптер для APIService
const DataManager = {
    // Данные в памяти как кэш
    users: [],
    processes: [],
    products: [],
    orders: [],
    currentUser: null,
    
    // Инициализация
    async init() {
        console.log('📊 Инициализируем DataManager (server-only)...');
        
        if (!window.APIService) {
            console.error('APIService не найден!');
            return false;
        }
        
        // Загружаем данные с сервера
        try {
            await this.loadFromServer();
            console.log('✅ DataManager инициализирован');
            return true;
        } catch (error) {
            console.error('❌ Ошибка инициализации DataManager:', error);
            return false;
        }
    },
    
    // === ОБНОВЛЕНИЕ UI ===
    
    notifyUIUpdate() {
        // Обновляем админку если открыта
        if (window.AdminModule && typeof AdminModule.renderProcesses === 'function') {
            AdminModule.renderProcesses();
        }
        
        // Обновляем доску процессов
        if (window.BoardModule && typeof BoardModule.renderBoard === 'function') {
            BoardModule.renderBoard();
        }
        
        console.log('🔄 UI обновлен');
    },
    
    async addProcess(processData) {
        return await this.createProcess(processData);
    },
    
    async removeProcess(processId) {
        try {
            console.log('🗑️ Удаляем процесс:', processId);
            
            const response = await fetch(`${window.APIService.baseUrl}/processes/${processId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    // Обновляем локальный кэш
                    this.processes = this.processes.filter(p => p.id !== parseInt(processId));
                    
                    // Обновляем UI
                    this.notifyUIUpdate();
                    
                    console.log('✅ Процесс удален');
                    return result;
                }
            }
            
            throw new Error('Ошибка удаления процесса');
        } catch (error) {
            console.error('❌ Ошибка удаления процесса:', error);
            throw error;
        }
    },
    
    async updateProcess(processId, processData) {
        try {
            const response = await fetch(`${window.APIService.baseUrl}/processes/${processId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(processData)
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    // Обновляем локальный кэш
                    const index = this.processes.findIndex(p => p.id === parseInt(processId));
                    if (index !== -1) {
                        this.processes[index] = { ...this.processes[index], ...processData };
                    }
                    
                    this.notifyUIUpdate();
                    return result;
                }
            }
            
            throw new Error('Ошибка обновления процесса');
        } catch (error) {
            console.error('❌ Ошибка обновления процесса:', error);
            throw error;
        }
    },
    
    // === ОБНОВЛЕНИЕ ИЗ APIService ===
    
    updateFromServer(serverData) {
        try {
            console.log('🔄 Обновляем данные из APIService...');
            
            this.users = serverData.users || [];
            this.processes = serverData.processes || [];
            this.products = serverData.products || [];
            this.orders = serverData.orders || [];
            
            console.log('✅ Данные обновлены:', {
                users: this.users.length,
                processes: this.processes.length,
                products: this.products.length,
                orders: this.orders.length
            });
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка обновления данных:', error);
            return false;
        }
    },
    
    // Загрузка данных с сервера через APIService
    async loadFromServer() {
        try {
            console.log('📥 Загружаем данные через APIService...');
            
            const response = await fetch(window.APIService.baseUrl + '/data', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    this.users = result.data.users || [];
                    this.processes = result.data.processes || [];
                    this.products = result.data.products || [];
                    this.orders = result.data.orders || [];
                    
                    console.log('✅ Данные загружены:', {
                        users: this.users.length,
                        processes: this.processes.length,
                        products: this.products.length,
                        orders: this.orders.length
                    });
                } else {
                    console.log('ℹ️ Сервер вернул пустые данные');
                }
            } else {
                console.error('❌ Ошибка загрузки:', response.status);
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
            throw error;
        }
    },
    
    // === МЕТОДЫ ДОСТУПА К ДАННЫМ ===
    
    getUsers() {
        return this.users;
    },
    
    findUser(id) {
        return this.users.find(user => user.id === parseInt(id));
    },
    
    getProcesses() {
        return this.processes;
    },
    
    findProcess(id) {
        return this.processes.find(process => process.id === parseInt(id));
    },
    
    getProducts() {
        return this.products;
    },
    
    findProduct(id) {
        return this.products.find(product => product.id === parseInt(id));
    },
    
    getOrders() {
        return this.orders;
    },
    
    findOrder(id) {
        return this.orders.find(order => order.id === parseInt(id));
    },
    
    // === СОЗДАНИЕ ДАННЫХ ===
    
    async createOrder(orderData) {
        try {
            console.log('📝 Создаем заказ:', orderData);
            
            const response = await fetch(window.APIService.baseUrl + '/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    // Перезагружаем данные с сервера
                    await this.loadFromServer();
                    console.log('✅ Заказ создан успешно');
                    return result;
                }
            }
            
            throw new Error('Ошибка создания заказа');
        } catch (error) {
            console.error('❌ Ошибка создания заказа:', error);
            throw error;
        }
    },
    
    async createProcess(processData) {
        try {
            const response = await fetch(window.APIService.baseUrl + '/processes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(processData)
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    // Обновляем локальные данные
                    const newProcess = { ...processData, id: result.id || Date.now() };
                    this.processes.push(newProcess);
                    
                    // Обновляем UI
                    this.notifyUIUpdate();
                    
                    console.log('✅ Процесс создан');
                    return result;
                }
            }
            
            throw new Error('Ошибка создания процесса');
        } catch (error) {
            console.error('❌ Ошибка создания процесса:', error);
            throw error;
        }
    },
    
    async createProduct(productData) {
        try {
            const response = await fetch(window.APIService.baseUrl + '/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    await this.loadFromServer();
                    return result;
                }
            }
            
            throw new Error('Ошибка создания изделия');
        } catch (error) {
            console.error('❌ Ошибка создания изделия:', error);
            throw error;
        }
    },
    
    async createUser(userData) {
        try {
            const response = await fetch(window.APIService.baseUrl + '/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    await this.loadFromServer();
                    return result;
                }
            }
            
            throw new Error('Ошибка создания пользователя');
        } catch (error) {
            console.error('❌ Ошибка создания пользователя:', error);
            throw error;
        }
    },
    
    // === ПЕРЕМЕЩЕНИЕ ЗАКАЗОВ ===
    
    async moveOrder(orderId, processId, reason, isDefect, userName) {
        try {
            console.log(`🔄 Перемещаем заказ ${orderId} в процесс ${processId}`);
            
            const response = await fetch(`${window.APIService.baseUrl}/orders/${orderId}/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    processId,
                    reason,
                    isDefect,
                    userName
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    // Обновляем локальный кэш
                    const order = this.findOrder(orderId);
                    if (order) {
                        order.currentProcessId = processId === 0 ? null : processId;
                        order.status = processId === 0 ? 'status-done' : 'status-process';
                    }
                    
                    console.log('✅ Заказ перемещен успешно');
                    return result;
                }
            }
            
            throw new Error('Ошибка перемещения заказа');
        } catch (error) {
            console.error('❌ Ошибка перемещения заказа:', error);
            throw error;
        }
    },
    
    // === УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЕМ ===
    
    setCurrentUser(user) {
        this.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
    },
    
    getCurrentUser() {
        return this.currentUser;
    },
    
    clearCurrentUser() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
    },
    
    // === СТАТИСТИКА ===
    
    getStats() {
        return {
            totalOrders: this.orders.length,
            completedOrders: this.orders.filter(o => o.status === 'status-done').length,
            activeOrders: this.orders.filter(o => o.status !== 'status-done').length,
            totalUsers: this.users.length,
            totalProcesses: this.processes.length,
            totalProducts: this.products.length
        };
    },
    
    // === АВТООБНОВЛЕНИЕ ===
    
    startAutoRefresh(intervalMs = 30000) {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(async () => {
            try {
                console.log('🔄 Автообновление данных...');
                await this.loadFromServer();
                
                // Обновляем UI
                if (window.BoardModule && typeof BoardModule.renderBoard === 'function') {
                    BoardModule.renderBoard();
                }
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
        }
    }
};

// Глобальный доступ
window.DataManager = DataManager;

console.log('📊 DataManager (simplified server-only) загружен');
