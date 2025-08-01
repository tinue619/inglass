/**
 * Класс заказа
 */
class Order extends BaseEntity {
    constructor(data = {}) {
        super(data.id);
        
        this.number = data.number || this._generateNumber();
        this.productId = data.productId;
        this.customerName = data.customerName || '';
        this.customerPhone = data.customerPhone instanceof Phone ? data.customerPhone : new Phone(data.customerPhone);
        this.currentProcessId = data.currentProcessId || null;
        this.customFields = data.customFields || {};
        this.priority = data.priority || 'normal'; // low, normal, high
        
        // История и брак
        this.history = (data.history || []).map(event => 
            event instanceof OrderHistoryEvent ? event : OrderHistoryEvent.fromJSON(event)
        );
        this.defectInfo = data.defectInfo instanceof DefectInfo ? 
            data.defectInfo : 
            (data.defectInfo ? DefectInfo.fromJSON(data.defectInfo) : new DefectInfo());
    }

    /**
     * Генерация номера заказа
     */
    _generateNumber() {
        const today = new Date();
        const dateStr = today.getFullYear().toString().substr(-2) + 
                       (today.getMonth() + 1).toString().padStart(2, '0') + 
                       today.getDate().toString().padStart(2, '0');
        
        // Простой счетчик (в реальной системе нужно проверять существующие номера)
        const randomNum = Math.floor(Math.random() * 999) + 1;
        return `${dateStr}-${randomNum.toString().padStart(3, '0')}`;
    }

    /**
     * Добавить событие в историю
     */
    addHistoryEvent(event) {
        if (event instanceof OrderHistoryEvent) {
            this.history.push(event);
            this.updateTimestamp();
        }
    }

    /**
     * Переместить на следующий процесс
     */
    moveToNextProcess(product, user, reason = null) {
        if (!(product instanceof Product)) {
            throw new Error('Необходим экземпляр Product');
        }

        const oldProcessId = this.currentProcessId;
        const newProcessId = product.getNextProcess(this.currentProcessId);
        
        this.currentProcessId = newProcessId;
        this.updateTimestamp();

        // Добавляем событие в историю
        const event = OrderHistoryEvent.createOrderMoved(
            this.id,
            user,
            oldProcessId ? { id: oldProcessId, name: 'Процесс' } : null,
            newProcessId ? { id: newProcessId, name: 'Процесс' } : { id: 0, name: 'Завершено' },
            reason
        );
        this.addHistoryEvent(event);

        return newProcessId;
    }

    /**
     * Переместить на конкретный процесс
     */
    moveToProcess(processId, user, reason = null) {
        const oldProcessId = this.currentProcessId;
        this.currentProcessId = processId === 0 ? null : processId;
        this.updateTimestamp();

        // Добавляем событие в историю
        const event = OrderHistoryEvent.createOrderMoved(
            this.id,
            user,
            oldProcessId ? { id: oldProcessId, name: 'Процесс' } : null,
            processId ? { id: processId, name: 'Процесс' } : { id: 0, name: 'Завершено' },
            reason
        );
        this.addHistoryEvent(event);

        return this.currentProcessId;
    }

    /**
     * Отправить в брак
     */
    sendToDefect(targetProcessId, reason, user, fromProcess, isRejected = false) {
        const originalProcessId = this.defectInfo.isDefective ? 
            this.defectInfo.originalProcessId : 
            this.currentProcessId;

        this.defectInfo.markAsDefective(
            reason, 
            user, 
            originalProcessId, 
            fromProcess, 
            isRejected
        );

        const oldProcessId = this.currentProcessId;
        this.currentProcessId = targetProcessId;
        this.updateTimestamp();

        // Добавляем событие в историю
        const event = OrderHistoryEvent.createDefectSent(
            this.id,
            user,
            { id: oldProcessId, name: fromProcess },
            { id: targetProcessId, name: 'Процесс исправления' },
            reason
        );
        this.addHistoryEvent(event);
    }

    /**
     * Устранить брак
     */
    fixDefect(comment, user) {
        if (!this.defectInfo.isDefective) {
            throw new Error('Заказ не в браке');
        }

        const oldProcessId = this.currentProcessId;
        const returnProcessId = this.defectInfo.originalProcessId;

        this.defectInfo.markAsFixed(comment, user);
        this.currentProcessId = returnProcessId;
        this.updateTimestamp();

        // Добавляем событие в историю
        const event = OrderHistoryEvent.createDefectFixed(
            this.id,
            user,
            { id: oldProcessId, name: 'Процесс исправления' },
            { id: returnProcessId, name: 'Исходный процесс' },
            comment
        );
        this.addHistoryEvent(event);
    }

    /**
     * Проверить, завершен ли заказ
     */
    isCompleted() {
        return !this.currentProcessId;
    }

    /**
     * Проверить, в браке ли заказ
     */
    isDefective() {
        return this.defectInfo.isDefective;
    }

    /**
     * Получить статус заказа
     */
    getStatus() {
        if (this.isDefective()) {
            return 'defective';
        }
        if (this.isCompleted()) {
            return 'completed';
        }
        return 'in_progress';
    }

    /**
     * Получить описание статуса
     */
    getStatusDescription() {
        switch (this.getStatus()) {
            case 'defective':
                return this.defectInfo.getStatusDescription();
            case 'completed':
                return 'Завершен';
            case 'in_progress':
                return 'В работе';
            default:
                return 'Неизвестный статус';
        }
    }

    /**
     * Получить отсортированную историю (новые события сверху)
     */
    getSortedHistory() {
        return [...this.history].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
    }

    /**
     * Валидация заказа
     */
    validate() {
        const errors = [];

        if (!this.number || this.number.trim().length < 3) {
            errors.push('Номер заказа должен содержать минимум 3 символа');
        }

        if (!this.customerName || this.customerName.trim().length < 2) {
            errors.push('Имя клиента должно содержать минимум 2 символа');
        }

        if (!this.customerPhone.isValid()) {
            errors.push('Некорректный номер телефона клиента');
        }

        if (!this.productId) {
            errors.push('Необходимо выбрать изделие');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Получить отформатированную дату создания
     */
    getFormattedCreatedDate() {
        const date = new Date(this.createdAt);
        return {
            date: date.toLocaleDateString('ru-RU'),
            time: date.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'}),
            full: `${date.toLocaleDateString('ru-RU')} ${date.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}`
        };
    }

    /**
     * Сериализация с учетом вложенных объектов
     */
    toJSON() {
        return {
            ...super.toJSON(),
            customerPhone: this.customerPhone.toJSON(),
            history: this.history.map(event => event.toJSON()),
            defectInfo: this.defectInfo.toJSON()
        };
    }

    /**
     * Десериализация с восстановлением вложенных объектов
     */
    static fromJSON(data) {
        const orderData = { ...data };
        
        // Восстанавливаем Phone
        if (orderData.customerPhone && typeof orderData.customerPhone === 'object') {
            orderData.customerPhone = Phone.fromJSON(orderData.customerPhone);
        }
        
        // Восстанавливаем историю
        if (orderData.history) {
            orderData.history = orderData.history.map(event => 
                event instanceof OrderHistoryEvent ? event : OrderHistoryEvent.fromJSON(event)
            );
        }
        
        // Восстанавливаем информацию о браке
        if (orderData.defectInfo) {
            orderData.defectInfo = DefectInfo.fromJSON(orderData.defectInfo);
        }
        
        return new Order(orderData);
    }

    toString() {
        return `Order #${this.number} (${this.customerName})`;
    }
}

window.Order = Order;
