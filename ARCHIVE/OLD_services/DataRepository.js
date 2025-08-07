/**
 * Основной репозиторий для управления данными приложения
 */
class DataRepository {
    constructor() {
        this.storageService = new StorageService();
        
        // Коллекции данных
        this._users = new Map();
        this._processes = new Map();
        this._products = new Map();
        this._orders = new Map();
        
        // Текущий пользователь
        this._currentUser = null;
        
        // Инициализация
        this._initializeDefaultData();
    }

    /**
     * Инициализация данных по умолчанию
     */
    _initializeDefaultData() {
        // Создаем администратора по умолчанию
        const defaultAdmin = User.createDefaultAdmin();
        this._users.set(defaultAdmin.id, defaultAdmin);
    }

    // ====================================
    // ПОЛЬЗОВАТЕЛИ
    // ====================================

    getUsers() { return Array.from(this._users.values()); }
    getUserById(id) { return this._users.get(id) || null; }
    
    getUserByPhone(phone) {
        return this.getUsers().find(user => 
            user.phone.getClean() === new Phone(phone).getClean()
        ) || null;
    }

    addUser(userData) {
        const user = userData instanceof User ? userData : new User(userData);
        
        const validation = user.validate();
        if (!validation.isValid) {
            throw new Error(`Ошибка валидации пользователя: ${validation.errors.join(', ')}`);
        }

        const existingUser = this.getUserByPhone(user.phone.getClean());
        if (existingUser && existingUser.id !== user.id) {
            throw new Error('Пользователь с таким номером телефона уже существует');
        }

        this._users.set(user.id, user);
        return user;
    }

    updateUser(userId, updates) {
        const user = this.getUserById(userId);
        if (!user) throw new Error('Пользователь не найден');

        Object.assign(user, updates);
        user.updateTimestamp();

        const validation = user.validate();
        if (!validation.isValid) {
            throw new Error(`Ошибка валидации: ${validation.errors.join(', ')}`);
        }

        return user;
    }

    deleteUser(userId) {
        const user = this.getUserById(userId);
        if (!user) throw new Error('Пользователь не найден');

        if (user.isAdmin && this.getUsers().filter(u => u.isAdmin).length === 1) {
            throw new Error('Нельзя удалить последнего администратора');
        }

        return this._users.delete(userId);
    }

    // ====================================
    // ПРОЦЕССЫ
    // ====================================

    getProcesses() { return Array.from(this._processes.values()).sort(Process.compare); }
    getProcessById(id) { return this._processes.get(id) || null; }

    addProcess(processData) {
        const process = processData instanceof Process ? processData : new Process(processData);
        
        const validation = process.validate();
        if (!validation.isValid) {
            throw new Error(`Ошибка валидации процесса: ${validation.errors.join(', ')}`);
        }

        this._processes.set(process.id, process);
        return process;
    }

    updateProcess(processId, updates) {
        const process = this.getProcessById(processId);
        if (!process) throw new Error('Процесс не найден');

        Object.assign(process, updates);
        process.updateTimestamp();

        const validation = process.validate();
        if (!validation.isValid) {
            throw new Error(`Ошибка валидации: ${validation.errors.join(', ')}`);
        }

        return process;
    }

    deleteProcess(processId) {
        const process = this.getProcessById(processId);
        if (!process) throw new Error('Процесс не найден');

        const usedInProducts = this.getProducts().filter(product => 
            product.processes.includes(processId)
        );

        if (usedInProducts.length > 0) {
            throw new Error(`Процесс используется в изделиях: ${usedInProducts.map(p => p.name).join(', ')}`);
        }

        const ordersOnProcess = this.getOrders().filter(order => 
            order.currentProcessId === processId
        );

        if (ordersOnProcess.length > 0) {
            throw new Error(`На процессе находятся заказы: ${ordersOnProcess.map(o => o.number).join(', ')}`);
        }

        this.getUsers().forEach(user => {
            user.removeProcess(processId);
        });

        return this._processes.delete(processId);
    }

    // ====================================
    // ИЗДЕЛИЯ
    // ====================================

    getProducts() { return Array.from(this._products.values()); }
    getProductById(id) { return this._products.get(id) || null; }

    addProduct(productData) {
        const product = productData instanceof Product ? productData : new Product(productData);
        
        const validation = product.validate();
        if (!validation.isValid) {
            throw new Error(`Ошибка валидации изделия: ${validation.errors.join(', ')}`);
        }

        const invalidProcesses = product.processes.filter(processId => 
            !this.getProcessById(processId)
        );

        if (invalidProcesses.length > 0) {
            throw new Error(`Процессы не найдены: ${invalidProcesses.join(', ')}`);
        }

        this._products.set(product.id, product);
        return product;
    }

    updateProduct(productId, updates) {
        const product = this.getProductById(productId);
        if (!product) throw new Error('Изделие не найдено');

        Object.assign(product, updates);
        product.updateTimestamp();

        const validation = product.validate();
        if (!validation.isValid) {
            throw new Error(`Ошибка валидации: ${validation.errors.join(', ')}`);
        }

        return product;
    }

    deleteProduct(productId) {
        const product = this.getProductById(productId);
        if (!product) throw new Error('Изделие не найдено');

        const ordersWithProduct = this.getOrders().filter(order => 
            order.productId === productId
        );

        if (ordersWithProduct.length > 0) {
            throw new Error(`Существуют заказы с этим изделием: ${ordersWithProduct.map(o => o.number).join(', ')}`);
        }

        return this._products.delete(productId);
    }

    // ====================================
    // ЗАКАЗЫ
    // ====================================

    getOrders() { return Array.from(this._orders.values()); }
    getOrderById(id) { return this._orders.get(id) || null; }
    getOrderByNumber(number) { return this.getOrders().find(order => order.number === number) || null; }
    getOrdersByProcess(processId) { return this.getOrders().filter(order => order.currentProcessId === processId); }
    getCompletedOrders() { return this.getOrders().filter(order => order.isCompleted()); }
    getDefectiveOrders() { return this.getOrders().filter(order => order.isDefective()); }

    addOrder(orderData) {
        const order = orderData instanceof Order ? orderData : new Order(orderData);

        const validation = order.validate();
        if (!validation.isValid) {
            throw new Error(`Ошибка валидации заказа: ${validation.errors.join(', ')}`);
        }

        const existingOrder = this.getOrderByNumber(order.number);
        if (existingOrder && existingOrder.id !== order.id) {
            throw new Error('Заказ с таким номером уже существует');
        }

        const product = this.getProductById(order.productId);
        if (!product) {
            throw new Error('Изделие не найдено');
        }

        this._orders.set(order.id, order);
        return order;
    }

    updateOrder(orderId, updates) {
        const order = this.getOrderById(orderId);
        if (!order) throw new Error('Заказ не найден');

        Object.assign(order, updates);
        order.updateTimestamp();

        const validation = order.validate();
        if (!validation.isValid) {
            throw new Error(`Ошибка валидации: ${validation.errors.join(', ')}`);
        }

        return order;
    }

    deleteOrder(orderId) {
        const order = this.getOrderById(orderId);
        if (!order) throw new Error('Заказ не найден');
        return this._orders.delete(orderId);
    }

    // ====================================
    // ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ
    // ====================================

    getCurrentUser() { return this._currentUser; }
    
    setCurrentUser(user) {
        this._currentUser = user instanceof User ? user : null;
        return this._currentUser;
    }

    // ====================================
    // СОХРАНЕНИЕ И ЗАГРУЗКА
    // ====================================

    save() {
        try {
            const data = this._serializeData();
            this.storageService.saveToLocal(this.storageService.STORAGE_KEYS.CRM_DATA, data);
            
            if (this._currentUser) {
                this.storageService.saveToSession(
                    this.storageService.STORAGE_KEYS.CURRENT_USER, 
                    this._currentUser.toJSON()
                );
            }

            console.log('Данные сохранены успешно');
            return true;
        } catch (error) {
            console.error('Ошибка сохранения данных:', error);
            return false;
        }
    }

    load() {
        try {
            const data = this.storageService.loadFromLocal(this.storageService.STORAGE_KEYS.CRM_DATA);
            
            if (data) {
                this._deserializeData(data);
                console.log('Данные загружены успешно');
            } else {
                console.log('Используются данные по умолчанию');
            }

            this._loadCurrentUser();
            return true;
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            this._initializeDefaultData();
            return false;
        }
    }

    _serializeData() {
        return {
            users: this.getUsers().map(user => user.toJSON()),
            processes: this.getProcesses().map(process => process.toJSON()),
            products: this.getProducts().map(product => product.toJSON()),
            orders: this.getOrders().map(order => order.toJSON())
        };
    }

    _deserializeData(data) {
        this._users.clear();
        this._processes.clear();
        this._products.clear();
        this._orders.clear();

        if (data.users) {
            data.users.forEach(userData => {
                try {
                    const user = User.fromJSON(userData);
                    this._users.set(user.id, user);
                } catch (error) {
                    console.error('Ошибка восстановления пользователя:', error);
                }
            });
        }

        if (data.processes) {
            data.processes.forEach(processData => {
                try {
                    const process = Process.fromJSON(processData);
                    this._processes.set(process.id, process);
                } catch (error) {
                    console.error('Ошибка восстановления процесса:', error);
                }
            });
        }

        if (data.products) {
            data.products.forEach(productData => {
                try {
                    const product = Product.fromJSON(productData);
                    this._products.set(product.id, product);
                } catch (error) {
                    console.error('Ошибка восстановления изделия:', error);
                }
            });
        }

        if (data.orders) {
            data.orders.forEach(orderData => {
                try {
                    const order = Order.fromJSON(orderData);
                    this._orders.set(order.id, order);
                } catch (error) {
                    console.error('Ошибка восстановления заказа:', error);
                }
            });
        }

        const admins = this.getUsers().filter(u => u.isAdmin);
        if (admins.length === 0) {
            console.log('Администратор не найден, создаем заново');
            const defaultAdmin = User.createDefaultAdmin();
            this._users.set(defaultAdmin.id, defaultAdmin);
        }
    }

    _loadCurrentUser() {
        try {
            const userData = this.storageService.loadFromSession(this.storageService.STORAGE_KEYS.CURRENT_USER);
            if (userData) {
                const actualUser = this.getUserById(userData.id);
                if (actualUser) {
                    this._currentUser = actualUser;
                    console.log('Текущий пользователь загружен:', this._currentUser.name);
                    return true;
                } else {
                    this.storageService.removeFromSession(this.storageService.STORAGE_KEYS.CURRENT_USER);
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки текущего пользователя:', error);
            this.storageService.removeFromSession(this.storageService.STORAGE_KEYS.CURRENT_USER);
        }
        return false;
    }

    clearAll() {
        this._users.clear();
        this._processes.clear();
        this._products.clear();
        this._orders.clear();
        this._currentUser = null;
        
        this._initializeDefaultData();
        this.storageService.clearAll();
    }

    createTestData() {
        try {
            const processes = [
                new Process({ name: 'Прием заказа', order: 1 }),
                new Process({ name: 'Замер', order: 2 }),
                new Process({ name: 'Резка', order: 3 }),
                new Process({ name: 'Упаковка', order: 4 })
            ];

            processes.forEach(process => this.addProcess(process));

            const products = [
                new Product({ 
                    name: 'Стекло',
                    processes: processes.map(p => p.id)
                }),
                new Product({ 
                    name: 'Зеркало',
                    processes: [processes[0].id, processes[2].id, processes[3].id]
                })
            ];

            products.forEach(product => this.addProduct(product));

            const users = [
                new User({
                    name: 'Менеджер',
                    phone: '+7 111 111 1111',
                    password: '1111',
                    isAdmin: false,
                    canCreateOrders: true,
                    processes: [processes[0].id]
                }),
                new User({
                    name: 'Мастер резки',
                    phone: '+7 222 222 2222',
                    password: '2222',
                    isAdmin: false,
                    canCreateOrders: false,
                    processes: [processes[2].id]
                })
            ];

            users.forEach(user => this.addUser(user));

            console.log('Тестовые данные созданы успешно');
            return true;
        } catch (error) {
            console.error('Ошибка создания тестовых данных:', error);
            return false;
        }
    }

    getStatistics() {
        return {
            users: this.getUsers().length,
            processes: this.getProcesses().length,
            products: this.getProducts().length,
            orders: {
                total: this.getOrders().length,
                inProgress: this.getOrders().filter(o => !o.isCompleted() && !o.isDefective()).length,
                completed: this.getCompletedOrders().length,
                defective: this.getDefectiveOrders().length
            }
        };
    }
}

window.DataRepository = DataRepository;
