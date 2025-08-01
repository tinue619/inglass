// Класс для работы с номерами телефонов
class Phone {
    constructor(number = '') {
        this.rawNumber = number;
        this.countryCode = '7';
        this.areaCode = '';
        this.firstPart = '';
        this.secondPart = '';
        this.isValid = false;
        
        if (number) {
            this.parseNumber(number);
        }
    }
    
    // Парсинг номера телефона
    parseNumber(number) {
        if (!number) return;
        
        // Удаляем все кроме цифр
        const digits = number.replace(/\D/g, '');
        
        // Если номер начинается с 8, заменяем на 7
        let normalizedDigits = digits;
        if (normalizedDigits.startsWith('8') && normalizedDigits.length === 11) {
            normalizedDigits = '7' + normalizedDigits.slice(1);
        }
        
        // Если номер содержит 10 цифр, добавляем 7
        if (normalizedDigits.length === 10) {
            normalizedDigits = '7' + normalizedDigits;
        }
        
        // Парсим компоненты
        if (normalizedDigits.startsWith('7') && normalizedDigits.length === 11) {
            this.countryCode = '7';
            this.areaCode = normalizedDigits.slice(1, 4);
            this.firstPart = normalizedDigits.slice(4, 7);
            this.secondPart = normalizedDigits.slice(7, 11);
            this.isValid = true;
        }
    }
    
    // Форматированный номер
    getFormatted() {
        if (!this.isValid) return this.rawNumber;
        return `+7-(${this.areaCode})-${this.firstPart}-${this.secondPart}`;
    }
    
    // Чистый номер (только цифры)
    getClean() {
        if (!this.isValid) return this.rawNumber.replace(/\D/g, '');
        return `7${this.areaCode}${this.firstPart}${this.secondPart}`;
    }
    
    // Номер для набора (tel: ссылка)
    getDialable() {
        return `+${this.getClean()}`;
    }
    
    // Проверка валидности
    validate() {
        return this.isValid && this.areaCode.length === 3 && this.firstPart.length === 3 && this.secondPart.length === 4;
    }
    
    // Статический метод для создания из строки
    static fromString(number) {
        return new Phone(number);
    }
    
    // Статический метод для создания пустого российского номера
    static createRussian() {
        const phone = new Phone();
        phone.countryCode = '7';
        return phone;
    }
}

// Утилита для работы с номерами телефонов (совместимость)
const PhoneUtils = {
    // Создание экземпляра Phone
    createPhone(number = '') {
        return new Phone(number);
    },
    
    // Форматирование номера телефона в формат +7-(7хх)-ххх-хххх
    formatPhone(phone) {
        if (phone instanceof Phone) {
            return phone.getFormatted();
        }
        if (typeof phone === 'string') {
            return Phone.fromString(phone).getFormatted();
        }
        // Если передан объект с методом getFormatted или другие свойства
        if (phone && typeof phone === 'object') {
            if (phone.getFormatted && typeof phone.getFormatted === 'function') {
                return phone.getFormatted();
            }
            // Пытаемся преобразовать в строку
            return Phone.fromString(String(phone)).getFormatted();
        }
        return phone || '';
    },
    
    // Получение чистого номера (только цифры)
    getCleanPhone(phone) {
        if (phone instanceof Phone) {
            return phone.getClean();
        }
        if (typeof phone === 'string') {
            return Phone.fromString(phone).getClean();
        }
        if (phone && typeof phone === 'object') {
            if (phone.getClean && typeof phone.getClean === 'function') {
                return phone.getClean();
            }
            return Phone.fromString(String(phone)).getClean();
        }
        return phone || '';
    },
    
    // Валидация номера телефона
    isValidPhone(phone) {
        if (phone instanceof Phone) {
            return phone.validate();
        }
        
        // Проверяем что в номере 11 цифр и начинается с 7
        const digits = phone.replace(/\D/g, '');
        return digits.length === 11 && digits.startsWith('7');
    },
    
    // Установка маски на поле ввода - МАКСИМАЛЬНО ПРОСТАЯ
    applyMask(inputElement) {
        if (!inputElement) return;
        
        // Устанавливаем базовое значение
        inputElement.value = '+7-(7';
        inputElement.placeholder = '+7-(7xx)-xxx-xxxx';
        
        inputElement.addEventListener('input', (e) => {
            let value = e.target.value;
            
            // Если пользователь как-то удалил базовую часть, восстанавливаем
            if (!value.startsWith('+7-(7')) {
                value = '+7-(7' + value.replace(/[^0-9]/g, '');
            }
            
            // Извлекаем все цифры из значения
            let allDigits = value.replace(/[^0-9]/g, '');
            
            // Убираем первые два символа "77" если они есть в начале
            if (allDigits.startsWith('77')) {
                allDigits = allDigits.slice(2);
            }
            
            // Ограничиваем до 9 цифр (после двух семерок)
            if (allDigits.length > 9) {
                allDigits = allDigits.slice(0, 9);
            }
            
            // Форматируем: базовая часть + введенные цифры
            let formatted = '+7-(7';
            
            for (let i = 0; i < allDigits.length; i++) {
                if (i === 0 || i === 1) {
                    formatted += allDigits[i];
                } else if (i === 2) {
                    formatted += ')-' + allDigits[i];
                } else if (i === 3 || i === 4) {
                    formatted += allDigits[i];
                } else if (i === 5) {
                    formatted += '-' + allDigits[i];
                } else {
                    formatted += allDigits[i];
                }
            }
            
            e.target.value = formatted;
            
            // Курсор в конец
            e.target.setSelectionRange(formatted.length, formatted.length);
        });
        
        inputElement.addEventListener('keydown', (e) => {
            // Не даем удалить только базовую часть +7-(7 (5 символов)
            if (e.key === 'Backspace' && e.target.selectionStart <= 5) {
                e.preventDefault();
            }
        });
        
        inputElement.addEventListener('focus', (e) => {
            // При фокусе курсор после базовой части +7-(7
            if (e.target.value.length <= 5) {
                e.target.setSelectionRange(5, 5); // После +7-(7
            } else {
                e.target.setSelectionRange(e.target.value.length, e.target.value.length);
            }
        });
    }
};

// Экспортируем в глобальную область
window.Phone = Phone;
window.PhoneUtils = PhoneUtils;
