/**
 * Базовый менеджер коллекций
 */
class BaseManager {
    constructor(EntityClass) {
        this.EntityClass = EntityClass;
        this.items = new Map();
        this.observers = new Set();
    }

    // === CRUD операции ===

    create(data) {
        const entity = new this.EntityClass(data);
        this.items.set(entity.id, entity);
        this.notifyObservers('create', entity);
        return entity;
    }

    getById(id) {
        return this.items.get(parseInt(id)) || this.items.get(id);
    }

    getAll() {
        return Array.from(this.items.values());
    }

    update(id, data) {
        const entity = this.getById(id);
        if (entity) {
            entity.update(data);
            this.notifyObservers('update', entity);
            return entity;
        }
        return null;
    }

    delete(id) {
        const entity = this.getById(id);
        if (entity) {
            this.items.delete(entity.id);
            this.notifyObservers('delete', entity);
            return true;
        }
        return false;
    }

    // === Загрузка данных ===

    loadFromArray(dataArray) {
        this.items.clear();
        dataArray.forEach(data => {
            const entity = new this.EntityClass(data);
            this.items.set(entity.id, entity);
        });
        this.notifyObservers('reload', this.getAll());
    }

    toArray() {
        return this.getAll().map(entity => entity.toJSON());
    }

    // === Поиск и фильтрация ===

    find(predicate) {
        return this.getAll().find(predicate);
    }

    filter(predicate) {
        return this.getAll().filter(predicate);
    }

    count() {
        return this.items.size;
    }

    // === Наблюдатели ===

    addObserver(callback) {
        this.observers.add(callback);
    }

    removeObserver(callback) {
        this.observers.delete(callback);
    }

    notifyObservers(action, data) {
        this.observers.forEach(callback => {
            try {
                callback(action, data, this);
            } catch (error) {
                console.error('Ошибка в observer:', error);
            }
        });
    }
}

/**
 * Менеджер пользователей
 */
class UserManager extends BaseManager {
    constructor() {
        super(User);
    }

    findByPhone(phone) {
        return this.find(user => user.phone === phone);
    }

    getAdmins() {
        return this.filter(user => user.isAdmin);
    }

    getUsersWithAccess(processId) {
        return this.filter(user => user.hasAccessToProcess(processId));
    }

    authenticate(phone, password) {
        const user = this.findByPhone(phone);
        if (user && user.passwordHash === password) { // Упрощенная проверка
            return user;
        }
        return null;
    }
}

/**
 * Менеджер процессов
 */
class ProcessManager extends BaseManager {
    constructor() {
        super(Process);
    }

    getSortedByOrder() {
        return Process.sortByOrder(this.getAll());
    }

    getActive() {
        return this.filter(process => process.isActive);
    }

    getNextOrder() {
        const processes = this.getAll();
        return processes.length > 0 ? Math.max(...processes.map(p => p.order)) + 1 : 1;
    }

    reorder(processId, newOrder) {
        const process = this.getById(processId);
        if (process) {
            process.order = newOrder;
            process.update({});
            this.notifyObservers('reorder', process);
            return true;
        }
        return false;
    }
}

/**
 * Менеджер изделий
 */
class ProductManager extends BaseManager {
    constructor() {
        super(Product);
    }

    getProductsForProcess(processId) {
        return this.filter(product => product.hasProcess(processId));
    }

    addProcessToProduct(productId, processId) {
        const product = this.getById(productId);
        if (product) {
            product.addProcess(processId);
            this.notifyObservers('update', product);
            return true;
        }
        return false;
    }
}

/**
 * Менеджер заказов
 */
class OrderManager extends BaseManager {
    constructor() {
        super(Order);
    }

    getByStatus(status) {
        return this.filter(order => order.status === status);
    }

    getByProcess(processId) {
        return this.filter(order => order.currentProcessId === processId);
    }

    getCompleted() {
        return this.filter(order => order.isCompleted());
    }

    getActive() {
        return this.filter(order => !order.isCompleted());
    }

    moveOrder(orderId, processId, moveData = {}) {
        const order = this.getById(orderId);
        if (order) {
            const historyEntry = order.moveToProcess(processId, moveData);
            this.notifyObservers('move', { order, historyEntry });
            return historyEntry;
        }
        return null;
    }

    getOrdersByPriority(priority) {
        return this.filter(order => order.priority === priority);
    }

    searchOrders(query) {
        const searchTerm = query.toLowerCase();
        return this.filter(order => 
            order.number.toLowerCase().includes(searchTerm) ||
            order.client.toLowerCase().includes(searchTerm) ||
            order.customerName.toLowerCase().includes(searchTerm)
        );
    }
}

// Экспорт менеджеров
window.BaseManager = BaseManager;
window.UserManager = UserManager;
window.ProcessManager = ProcessManager;
window.ProductManager = ProductManager;
window.OrderManager = OrderManager;

console.log('🎯 Менеджеры сущностей загружены');
