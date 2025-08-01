/**
 * Класс события в истории заказа
 */
class OrderHistoryEvent extends BaseEntity {
    constructor(data = {}) {
        super(data.id);
        
        this.orderId = data.orderId;
        this.type = data.type || 'unknown';
        this.user = data.user || { name: 'Система' };
        this.timestamp = data.timestamp || this.createdAt;
        this.data = data.data || {};
    }

    /**
     * Получить описание события
     */
    getDescription() {
        switch (this.type) {
            case 'created':
                return `🎆 Заказ создан и помещен в "${this.data?.toProcess?.name || 'Неизвестный процесс'}"`;
            case 'moved':
                return `➡️ Перемещен с "${this.data?.fromProcess?.name || 'Неизвестно'}" в "${this.data?.toProcess?.name || 'Завершено'}"`;
            case 'defect_sent':
                return `❌ Отправлен в брак: ${this.data?.reason || 'Причина не указана'}`;
            case 'defect_fixed':
                return `🔧 Брак устранен: ${this.data?.comment || 'Комментарий отсутствует'}`;
            case 'rejected':
                return `🚫 Заказ отклонен: ${this.data?.reason || 'Причина не указана'}`;
            default:
                return `📝 ${this.data?.comment || 'Неизвестное событие'}`;
        }
    }

    /**
     * Получить отформатированную дату
     */
    getFormattedDate() {
        const date = new Date(this.timestamp);
        return {
            date: date.toLocaleDateString('ru-RU'),
            time: date.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'}),
            full: `${date.toLocaleDateString('ru-RU')} ${date.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}`
        };
    }

    /**
     * Создать событие создания заказа
     */
    static createOrderCreated(orderId, user, processInfo) {
        return new OrderHistoryEvent({
            orderId,
            type: 'created',
            user,
            data: {
                toProcess: processInfo
            }
        });
    }

    /**
     * Создать событие перемещения заказа
     */
    static createOrderMoved(orderId, user, fromProcess, toProcess, reason = null) {
        return new OrderHistoryEvent({
            orderId,
            type: 'moved',
            user,
            data: {
                fromProcess,
                toProcess,
                reason
            }
        });
    }

    /**
     * Создать событие отправки в брак
     */
    static createDefectSent(orderId, user, fromProcess, toProcess, reason) {
        return new OrderHistoryEvent({
            orderId,
            type: 'defect_sent',
            user,
            data: {
                fromProcess,
                toProcess,
                reason,
                isDefect: true
            }
        });
    }

    /**
     * Создать событие устранения брака
     */
    static createDefectFixed(orderId, user, fromProcess, toProcess, comment) {
        return new OrderHistoryEvent({
            orderId,
            type: 'defect_fixed',
            user,
            data: {
                fromProcess,
                toProcess,
                comment
            }
        });
    }
}

window.OrderHistoryEvent = OrderHistoryEvent;
