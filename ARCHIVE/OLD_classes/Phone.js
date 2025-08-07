/**
 * Класс для работы с телефонными номерами
 */
class Phone {
    constructor(phoneString) {
        this.raw = phoneString || '';
        this.clean = this._cleanPhone(phoneString);
        this.formatted = this._formatPhone(this.clean);
        this.valid = this._validate(this.clean);
    }

    /**
     * Очистка телефона от символов
     */
    _cleanPhone(phone) {
        if (!phone) return '';
        return phone.replace(/\D/g, '');
    }

    /**
     * Форматирование телефона
     */
    _formatPhone(clean) {
        if (!clean) return '';
        if (clean.length === 11 && clean.startsWith('7')) {
            return `+7-(${clean.slice(1, 4)})-${clean.slice(4, 7)}-${clean.slice(7, 9)}-${clean.slice(9, 11)}`;
        }
        return clean;
    }

    /**
     * Валидация телефона
     */
    _validate(clean) {
        return clean.length === 11 && clean.startsWith('7');
    }

    /**
     * Получить номер для набора
     */
    getDialable() {
        return this.clean ? `+${this.clean}` : '';
    }

    /**
     * Получить форматированный номер
     */
    getFormatted() {
        return this.formatted;
    }

    /**
     * Получить очищенный номер
     */
    getClean() {
        return this.clean;
    }

    /**
     * Проверить валидность
     */
    isValid() {
        return this.valid;
    }

    /**
     * Применить маску к input элементу
     */
    static applyMask(inputElement) {
        if (!inputElement) return;

        inputElement.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            
            if (value.startsWith('8')) {
                value = '7' + value.slice(1);
            }
            
            if (value.startsWith('7') && value.length <= 11) {
                let formatted = '+7';
                if (value.length > 1) formatted += '-(' + value.slice(1, 4);
                if (value.length > 4) formatted += ')-' + value.slice(4, 7);
                if (value.length > 7) formatted += '-' + value.slice(7, 9);
                if (value.length > 9) formatted += '-' + value.slice(9, 11);
                
                e.target.value = formatted;
            }
        });
    }

    /**
     * Создать Phone из различных форматов
     */
    static fromString(phoneString) {
        return new Phone(phoneString);
    }

    toString() {
        return this.getFormatted();
    }

    toJSON() {
        return {
            raw: this.raw,
            clean: this.clean,
            formatted: this.formatted,
            valid: this.valid
        };
    }

    static fromJSON(data) {
        const phone = new Phone();
        Object.assign(phone, data);
        return phone;
    }
}

window.Phone = Phone;
