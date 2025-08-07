/**
 * Класс процесса производства
 */
class Process extends BaseEntity {
    constructor(data = {}) {
        super(data.id);
        
        this.name = data.name || '';
        this.order = data.order || 0; // Порядок в цепочке процессов
        this.description = data.description || '';
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.estimatedTimeHours = data.estimatedTimeHours || 0;
    }

    /**
     * Валидация процесса
     */
    validate() {
        const errors = [];

        if (!this.name || this.name.trim().length < 2) {
            errors.push('Название процесса должно содержать минимум 2 символа');
        }

        if (this.order < 0) {
            errors.push('Порядок процесса не может быть отрицательным');
        }

        if (this.estimatedTimeHours < 0) {
            errors.push('Время выполнения не может быть отрицательным');
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
        return `${this.name}${this.isActive ? '' : ' (неактивен)'}`;
    }

    /**
     * Сравнение процессов по порядку
     */
    static compare(a, b) {
        return a.order - b.order;
    }

    toString() {
        return `Process: ${this.name} (order: ${this.order})`;
    }
}

window.Process = Process;
