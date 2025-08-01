/**
 * Базовый класс для всех сущностей системы
 */
class BaseEntity {
    constructor(id = null) {
        this.id = id || Date.now() + Math.random();
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Обновить временную метку
     */
    updateTimestamp() {
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Сериализация в JSON
     */
    toJSON() {
        return { ...this };
    }

    /**
     * Десериализация из JSON
     */
    static fromJSON(data) {
        const instance = new this();
        Object.assign(instance, data);
        return instance;
    }

    /**
     * Валидация данных (переопределяется в наследниках)
     */
    validate() {
        return { isValid: true, errors: [] };
    }

    /**
     * Получить человекочитаемое представление
     */
    toString() {
        return `${this.constructor.name}#${this.id}`;
    }
}

window.BaseEntity = BaseEntity;
