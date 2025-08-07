/**
 * Базовый класс для всех сущностей системы
 */
class BaseEntity {
    constructor(id = null) {
        this.id = id || Date.now();
        this.createdAt = new Date().toISOString();
        this.updatedAt = this.createdAt;
    }

    update(data) {
        Object.assign(this, data);
        this.updatedAt = new Date().toISOString();
        return this;
    }

    toJSON() {
        return { ...this };
    }

    static fromJSON(data) {
        const instance = new this();
        return Object.assign(instance, data);
    }
}

/**
 * Пользователь системы
 */
class User extends BaseEntity {
    constructor(data = {}) {
        super(data.id);
        this.name = data.name || '';
        this.phone = data.phone || '';
        this.passwordHash = data.passwordHash || data.password || ''; // Временно для совместимости
        this.isAdmin = data.isAdmin || false;
        this.canCreateOrders = data.canCreateOrders || false;
        this.processes = data.processes || []; // ID процессов доступных пользователю
    }

    hasAccessToProcess(processId) {
        return this.isAdmin || this.processes.includes(processId);
    }

    addProcess(processId) {
        if (!this.processes.includes(processId)) {
            this.processes.push(processId);
            this.update({});
        }
        return this;
    }

    removeProcess(processId) {
        this.processes = this.processes.filter(id => id !== processId);
        this.update({});
        return this;
    }
}

/**
 * Процесс производства
 */
class Process extends BaseEntity {
    constructor(data = {}) {
        super(data.id);
        this.name = data.name || '';
        this.order = data.order || 1;
        this.description = data.description || '';
        this.isActive = data.isActive !== false; // По умолчанию активен
    }

    static sortByOrder(processes) {
        return [...processes].sort((a, b) => a.order - b.order);
    }
}

/**
 * Изделие
 */
class Product extends BaseEntity {
    constructor(data = {}) {
        super(data.id);
        this.name = data.name || '';
        this.description = data.description || '';
        this.processes = data.processes || []; // ID процессов для этого изделия
    }

    hasProcess(processId) {
        return this.processes.includes(processId);
    }

    addProcess(processId) {
        if (!this.processes.includes(processId)) {
            this.processes.push(processId);
            this.update({});
        }
        return this;
    }

    removeProcess(processId) {
        this.processes = this.processes.filter(id => id !== processId);
        this.update({});
        return this;
    }
}

/**
 * Запись в истории заказа
 */
class OrderHistoryEntry extends BaseEntity {
    constructor(data = {}) {
        super(data.id);
        this.type = data.type || 'moved'; // moved, defect_sent, created, completed
        this.orderId = data.orderId;
        this.userId = data.userId;
        this.userName = data.userName || '';
        this.fromProcessId = data.fromProcessId || null;
        this.toProcessId = data.toProcessId || null;
        this.reason = data.reason || '';
        this.comment = data.comment || '';
        this.isDefect = data.isDefect || false;
        this.timestamp = data.timestamp || new Date().toISOString();
    }
}

/**
 * Заказ
 */
class Order extends BaseEntity {
    constructor(data = {}) {
        super(data.id);
        this.number = data.number || this.generateOrderNumber();
        this.productId = data.productId;
        this.currentProcessId = data.currentProcessId || null;
        this.status = data.status || 'status-new';
        
        // Данные заказа
        this.client = data.client || '';
        this.customerName = data.customerName || '';
        this.customerPhone = data.customerPhone || '';
        this.quantity = data.quantity || 1;
        this.size = data.size || '';
        this.thickness = data.thickness || '';
        this.comment = data.comment || '';
        
        // История
        this.history = (data.history || []).map(entry => 
            entry instanceof OrderHistoryEntry ? entry : new OrderHistoryEntry(entry)
        );
        
        // Метаданные
        this.createdBy = data.createdBy || '';
        this.priority = data.priority || 'normal'; // low, normal, high, urgent
    }

    generateOrderNumber() {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const random = Math.random().toString(36).substr(2, 3).toUpperCase();
        return `${year}${month}${day}-${random}`;
    }

    moveToProcess(processId, data = {}) {
        const historyEntry = new OrderHistoryEntry({
            orderId: this.id,
            type: data.isDefect ? 'defect_sent' : 'moved',
            userId: data.userId,
            userName: data.userName || 'Система',
            fromProcessId: this.currentProcessId,
            toProcessId: processId,
            reason: data.reason || '',
            comment: data.comment || '',
            isDefect: data.isDefect || false
        });

        this.history.push(historyEntry);
        this.currentProcessId = processId;
        
        // Обновляем статус
        if (processId === null || processId === 0) {
            this.status = 'status-done';
        } else {
            this.status = 'status-process';
        }
        
        this.update({});
        return historyEntry;
    }

    complete(data = {}) {
        return this.moveToProcess(null, { ...data, type: 'completed' });
    }

    getCurrentProcess(processManager) {
        return this.currentProcessId ? processManager.getById(this.currentProcessId) : null;
    }

    getProduct(productManager) {
        return this.productId ? productManager.getById(this.productId) : null;
    }

    isCompleted() {
        return this.status === 'status-done';
    }

    isInProcess() {
        return this.status === 'status-process';
    }

    isNew() {
        return this.status === 'status-new';
    }
}

// Экспорт классов
window.BaseEntity = BaseEntity;
window.User = User;
window.Process = Process;
window.Product = Product;
window.Order = Order;
window.OrderHistoryEntry = OrderHistoryEntry;

console.log('🏗️ Базовые сущности загружены');
