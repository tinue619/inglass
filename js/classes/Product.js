/**
 * Класс изделия (продукта)
 */
class Product extends BaseEntity {
    constructor(data = {}) {
        super(data.id);
        
        this.name = data.name || '';
        this.description = data.description || '';
        this.processes = data.processes || []; // Массив ID процессов в порядке выполнения
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.customFields = data.customFields || {}; // Кастомные поля для заказов
    }

    /**
     * Добавить процесс в цепочку
     */
    addProcess(processId) {
        if (!this.processes.includes(processId)) {
            this.processes.push(processId);
            this.updateTimestamp();
        }
    }

    /**
     * Удалить процесс из цепочки
     */
    removeProcess(processId) {
        this.processes = this.processes.filter(id => id !== processId);
        this.updateTimestamp();
    }

    /**
     * Получить следующий процесс после указанного
     */
    getNextProcess(currentProcessId) {
        const currentIndex = this.processes.indexOf(currentProcessId);
        if (currentIndex >= 0 && currentIndex < this.processes.length - 1) {
            return this.processes[currentIndex + 1];
        }
        return null; // Процесс завершен
    }

    /**
     * Получить предыдущий процесс
     */
    getPreviousProcess(currentProcessId) {
        const currentIndex = this.processes.indexOf(currentProcessId);
        if (currentIndex > 0) {
            return this.processes[currentIndex - 1];
        }
        return null;
    }

    /**
     * Проверить, является ли процесс первым
     */
    isFirstProcess(processId) {
        return this.processes.length > 0 && this.processes[0] === processId;
    }

    /**
     * Проверить, является ли процесс последним
     */
    isLastProcess(processId) {
        const length = this.processes.length;
        return length > 0 && this.processes[length - 1] === processId;
    }

    /**
     * Получить первый процесс
     */
    getFirstProcess() {
        return this.processes.length > 0 ? this.processes[0] : null;
    }

    /**
     * Получить последний процесс
     */
    getLastProcess() {
        return this.processes.length > 0 ? this.processes[this.processes.length - 1] : null;
    }

    /**
     * Переупорядочить процессы
     */
    reorderProcesses(newOrder) {
        if (Array.isArray(newOrder) && newOrder.length === this.processes.length) {
            this.processes = [...newOrder];
            this.updateTimestamp();
        }
    }

    /**
     * Валидация изделия
     */
    validate() {
        const errors = [];

        if (!this.name || this.name.trim().length < 2) {
            errors.push('Название изделия должно содержать минимум 2 символа');
        }

        if (this.processes.length === 0) {
            errors.push('Изделие должно иметь хотя бы один процесс');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Получить отображаемое название
     */
    getDisplayName() {
        return `${this.name}${this.isActive ? '' : ' (неактивно)'} (${this.processes.length} процессов)`;
    }

    toString() {
        return `Product: ${this.name} (${this.processes.length} processes)`;
    }
}

window.Product = Product;
