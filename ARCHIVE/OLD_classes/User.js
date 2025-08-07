/**
 * Класс пользователя системы
 */
class User extends BaseEntity {
    constructor(data = {}) {
        super(data.id);
        
        this.name = data.name || '';
        this.phone = data.phone instanceof Phone ? data.phone : new Phone(data.phone);
        this.password = data.password || '';
        this.isAdmin = data.isAdmin || false;
        this.canCreateOrders = data.canCreateOrders || false;
        this.processes = data.processes || []; // Массив ID процессов
        this.isActive = data.isActive !== undefined ? data.isActive : true;
    }

    /**
     * Проверить пароль
     */
    checkPassword(password) {
        return this.password === password;
    }

    /**
     * Установить новый пароль
     */
    setPassword(newPassword) {
        if (!newPassword || newPassword.length < 4) {
            throw new Error('Пароль должен содержать минимум 4 символа');
        }
        this.password = newPassword;
        this.updateTimestamp();
    }

    /**
     * Проверить доступ к процессу
     */
    hasAccessToProcess(processId) {
        return this.isAdmin || this.processes.includes(processId);
    }

    /**
     * Добавить доступ к процессу
     */
    addProcess(processId) {
        if (!this.processes.includes(processId)) {
            this.processes.push(processId);
            this.updateTimestamp();
        }
    }

    /**
     * Удалить доступ к процессу
     */
    removeProcess(processId) {
        this.processes = this.processes.filter(id => id !== processId);
        this.updateTimestamp();
    }

    /**
     * Валидация пользователя
     */
    validate() {
        const errors = [];

        if (!this.name || this.name.trim().length < 2) {
            errors.push('Имя должно содержать минимум 2 символа');
        }

        if (!this.phone.isValid()) {
            errors.push('Некорректный номер телефона');
        }

        if (!this.password || this.password.length < 4) {
            errors.push('Пароль должен содержать минимум 4 символа');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Получить отображаемое имя
     */
    getDisplayName() {
        return this.name + (this.isAdmin ? ' (Администратор)' : '');
    }

    /**
     * Создать администратора по умолчанию
     */
    static createDefaultAdmin() {
        return new User({
            id: 1,
            name: "Администратор",
            phone: "+7 777 777 7777",
            password: "1488",
            isAdmin: true,
            canCreateOrders: true,
            processes: []
        });
    }

    /**
     * Сериализация с учетом Phone
     */
    toJSON() {
        return {
            ...super.toJSON(),
            phone: this.phone.toJSON()
        };
    }

    /**
     * Десериализация с восстановлением Phone
     */
    static fromJSON(data) {
        const userData = { ...data };
        if (userData.phone && typeof userData.phone === 'object') {
            userData.phone = Phone.fromJSON(userData.phone);
        }
        return new User(userData);
    }
}

window.User = User;
