/**
 * Сервис аутентификации
 */
class AuthService {
    constructor(dataRepository) {
        this.dataRepository = dataRepository;
    }

    /**
     * Вход в систему
     */
    login(phone, password) {
        try {
            const user = this.dataRepository.getUserByPhone(phone);
            
            if (!user) {
                throw new Error('Пользователь с таким номером телефона не найден');
            }

            if (!user.isActive) {
                throw new Error('Учетная запись заблокирована');
            }

            if (!user.checkPassword(password)) {
                throw new Error('Неверный пароль');
            }

            this.dataRepository.setCurrentUser(user);
            this.dataRepository.save();

            console.log(`Пользователь ${user.name} успешно вошел в систему`);
            return user;
        } catch (error) {
            console.error('Ошибка входа в систему:', error);
            throw error;
        }
    }

    /**
     * Выход из системы
     */
    logout() {
        const currentUser = this.dataRepository.getCurrentUser();
        if (currentUser) {
            console.log(`Пользователь ${currentUser.name} вышел из системы`);
        }

        this.dataRepository.setCurrentUser(null);
        this.dataRepository.save();
    }

    /**
     * Проверить, авторизован ли пользователь
     */
    isAuthenticated() {
        return this.dataRepository.getCurrentUser() !== null;
    }

    /**
     * Получить текущего пользователя
     */
    getCurrentUser() {
        return this.dataRepository.getCurrentUser();
    }

    /**
     * Проверить, является ли текущий пользователь администратором
     */
    isCurrentUserAdmin() {
        const user = this.getCurrentUser();
        return user && user.isAdmin;
    }

    /**
     * Проверить права доступа к процессу
     */
    hasAccessToProcess(processId) {
        const user = this.getCurrentUser();
        return user && user.hasAccessToProcess(processId);
    }

    /**
     * Проверить права на создание заказов
     */
    canCreateOrders() {
        const user = this.getCurrentUser();
        return user && (user.isAdmin || user.canCreateOrders);
    }

    /**
     * Сменить пароль
     */
    changePassword(currentPassword, newPassword) {
        const user = this.getCurrentUser();
        if (!user) {
            throw new Error('Пользователь не авторизован');
        }

        if (!user.checkPassword(currentPassword)) {
            throw new Error('Неверный текущий пароль');
        }

        user.setPassword(newPassword);
        this.dataRepository.save();

        console.log(`Пароль пользователя ${user.name} успешно изменен`);
        return true;
    }

    /**
     * Валидация данных для входа
     */
    validateLoginData(phone, password) {
        const errors = [];

        if (!phone || phone.trim().length === 0) {
            errors.push('Номер телефона обязателен');
        } else {
            const phoneObj = new Phone(phone);
            if (!phoneObj.isValid()) {
                errors.push('Некорректный номер телефона');
            }
        }

        if (!password || password.length === 0) {
            errors.push('Пароль обязателен');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

window.AuthService = AuthService;
