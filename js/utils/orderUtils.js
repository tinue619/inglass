// Утилиты для работы с заказами
const OrderUtils = {
    // Генерация номера заказа
    generateOrderNumber() {
        const today = new Date();
        const dateStr = today.getFullYear().toString().substr(-2) + 
                       (today.getMonth() + 1).toString().padStart(2, '0') + 
                       today.getDate().toString().padStart(2, '0');
        
        const existingNumbers = DataManager.getOrders()
            .map(o => o.number)
            .filter(n => n.startsWith(dateStr))
            .map(n => parseInt(n.split('-')[1]) || 0);
        
        const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
        
        return `${dateStr}-${nextNumber.toString().padStart(3, '0')}`;
    },

    // Проверка прав пользователя на перемещение заказа вперед
    canUserMoveOrderForward(order, user) {
        if (!order.currentProcessId) return false;
        const product = DataManager.getProducts().find(p => p.id === order.productId);
        if (!product) return false;
        if (!user.processes.includes(order.currentProcessId)) return false;
        const currentIndex = product.processes.indexOf(order.currentProcessId);
        return currentIndex < product.processes.length - 1 || currentIndex === product.processes.length - 1;
    },

    // Проверка прав пользователя на перемещение заказа назад
    canUserMoveOrderBack(order, user) {
        if (!order.currentProcessId) {
            const product = DataManager.getProducts().find(p => p.id === order.productId);
            if (!product) return false;
            const lastProcessId = product.processes[product.processes.length - 1];
            return user.processes.includes(lastProcessId);
        }
        const product = DataManager.getProducts().find(p => p.id === order.productId);
        if (!product) return false;
        if (!user.processes.includes(order.currentProcessId)) return false;
        const currentIndex = product.processes.indexOf(order.currentProcessId);
        return currentIndex > 0;
    },

    // Получение следующего процесса для заказа
    getNextProcess(order) {
        const product = DataManager.getProducts().find(p => p.id === order.productId);
        if (!product) return null;
        
        const currentIndex = product.processes.indexOf(order.currentProcessId);
        if (currentIndex < product.processes.length - 1) {
            return product.processes[currentIndex + 1];
        }
        return null; // Завершен
    },

    // Получение предыдущего процесса для заказа
    getPreviousProcess(order) {
        if (!order.currentProcessId) {
            const product = DataManager.getProducts().find(p => p.id === order.productId);
            if (!product) return null;
            return product.processes[product.processes.length - 1];
        }
        
        const product = DataManager.getProducts().find(p => p.id === order.productId);
        if (!product) return null;
        
        const currentIndex = product.processes.indexOf(order.currentProcessId);
        if (currentIndex > 0) {
            return product.processes[currentIndex - 1];
        }
        return null;
    },

    // Форматирование даты для отображения
    formatDate(dateString) {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString('ru-RU'),
            time: date.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'}),
            full: `${date.toLocaleDateString('ru-RU')} ${date.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}`
        };
    },

    // Получение статуса заказа для отображения
    getOrderStatusClass(order) {
        const isDefective = order.defectInfo && order.defectInfo.isDefective;
        
        if (!order.currentProcessId) {
            return APP_CONSTANTS.ORDER_STATUS.DONE;
        } else if (isDefective) {
            return APP_CONSTANTS.ORDER_STATUS.PROBLEM;
        }
        return APP_CONSTANTS.ORDER_STATUS.PROCESS;
    },

    // Создание кастомных полей для формы
    createCustomFieldRow() {
        const fieldRow = document.createElement('div');
        fieldRow.className = 'custom-field-row';
        fieldRow.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
        
        fieldRow.innerHTML = `
            <input type="text" class="custom-field-key form-input" placeholder="Название поля" style="flex: 1;">
            <input type="text" class="custom-field-value form-input" placeholder="Значение" style="flex: 1;">
            <button type="button" class="btn btn-danger btn-small" onclick="this.parentElement.remove()">×</button>
        `;
        
        return fieldRow;
    },

    // Сбор кастомных полей из формы
    collectCustomFields() {
        const customFields = {};
        document.querySelectorAll('.custom-field-row').forEach(row => {
            const key = row.querySelector('.custom-field-key').value.trim();
            const value = row.querySelector('.custom-field-value').value.trim();
            if (key && value) {
                customFields[key] = value;
            }
        });
        return customFields;
    }
};

window.OrderUtils = OrderUtils;
