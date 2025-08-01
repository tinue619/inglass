/**
 * Сервис для работы с хранилищем данных
 */
class StorageService {
    constructor() {
        this.STORAGE_KEYS = {
            CRM_DATA: 'crmData',
            CURRENT_USER: 'currentUser'
        };
    }

    /**
     * Сохранить данные в localStorage
     */
    saveToLocal(key, data) {
        try {
            const serialized = JSON.stringify(data);
            localStorage.setItem(key, serialized);
            console.log(`Данные сохранены в localStorage под ключом: ${key}`);
            return true;
        } catch (error) {
            console.error('Ошибка сохранения в localStorage:', error);
            return false;
        }
    }

    /**
     * Загрузить данные из localStorage
     */
    loadFromLocal(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            if (data) {
                return JSON.parse(data);
            }
            return defaultValue;
        } catch (error) {
            console.error('Ошибка загрузки из localStorage:', error);
            return defaultValue;
        }
    }

    /**
     * Сохранить данные в sessionStorage
     */
    saveToSession(key, data) {
        try {
            const serialized = JSON.stringify(data);
            sessionStorage.setItem(key, serialized);
            console.log(`Данные сохранены в sessionStorage под ключом: ${key}`);
            return true;
        } catch (error) {
            console.error('Ошибка сохранения в sessionStorage:', error);
            return false;
        }
    }

    /**
     * Загрузить данные из sessionStorage
     */
    loadFromSession(key, defaultValue = null) {
        try {
            const data = sessionStorage.getItem(key);
            if (data) {
                return JSON.parse(data);
            }
            return defaultValue;
        } catch (error) {
            console.error('Ошибка загрузки из sessionStorage:', error);
            return defaultValue;
        }
    }

    /**
     * Удалить данные из localStorage
     */
    removeFromLocal(key) {
        try {
            localStorage.removeItem(key);
            console.log(`Данные удалены из localStorage: ${key}`);
            return true;
        } catch (error) {
            console.error('Ошибка удаления из localStorage:', error);
            return false;
        }
    }

    /**
     * Удалить данные из sessionStorage
     */
    removeFromSession(key) {
        try {
            sessionStorage.removeItem(key);
            console.log(`Данные удалены из sessionStorage: ${key}`);
            return true;
        } catch (error) {
            console.error('Ошибка удаления из sessionStorage:', error);
            return false;
        }
    }

    /**
     * Очистить все данные
     */
    clearAll() {
        try {
            localStorage.clear();
            sessionStorage.clear();
            console.log('Все данные очищены');
            return true;
        } catch (error) {
            console.error('Ошибка очистки данных:', error);
            return false;
        }
    }

    /**
     * Получить размер данных в localStorage
     */
    getLocalStorageSize() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        return total;
    }

    /**
     * Проверить доступность localStorage
     */
    isLocalStorageAvailable() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Проверить доступность sessionStorage
     */
    isSessionStorageAvailable() {
        try {
            const test = '__sessionStorage_test__';
            sessionStorage.setItem(test, test);
            sessionStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }
}

window.StorageService = StorageService;
