// Базовый класс для сущностей с контактной информацией
class ContactEntity {
    constructor(name = '', phoneNumber = '') {
        this.name = name;
        this.phone = phoneNumber ? new Phone(phoneNumber) : new Phone();
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }
    
    // Установить номер телефона
    setPhone(phoneNumber) {
        this.phone = new Phone(phoneNumber);
        this.updatedAt = new Date().toISOString();
        return this;
    }
    
    // Получить форматированный телефон
    getFormattedPhone() {
        return this.phone.getFormatted();
    }
    
    // Получить телефон для набора
    getDialablePhone() {
        return this.phone.getDialable();
    }
    
    // Проверить валидность телефона
    hasValidPhone() {
        return this.phone.validate();
    }
    
    // Обновить имя
    setName(name) {
        this.name = name;
        this.updatedAt = new Date().toISOString();
        return this;
    }
    
    // Получить базовую информацию
    getInfo() {
        return {
            name: this.name,
            phone: this.getFormattedPhone(),
            hasValidPhone: this.hasValidPhone(),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

// Класс для клиентов
class Customer extends ContactEntity {
    constructor(name = '', phoneNumber = '', email = '') {
        super(name, phoneNumber);
        this.email = email;
        this.orders = []; // Массив ID заказов
        this.notes = ''; // Заметки о клиенте
        this.type = 'customer';
    }
    
    // Установить email
    setEmail(email) {
        this.email = email;
        this.updatedAt = new Date().toISOString();
        return this;
    }
    
    // Добавить заказ
    addOrder(orderId) {
        if (!this.orders.includes(orderId)) {
            this.orders.push(orderId);
            this.updatedAt = new Date().toISOString();
        }
        return this;
    }
    
    // Удалить заказ
    removeOrder(orderId) {
        const index = this.orders.indexOf(orderId);
        if (index > -1) {
            this.orders.splice(index, 1);
            this.updatedAt = new Date().toISOString();
        }
        return this;
    }
    
    // Установить заметки
    setNotes(notes) {
        this.notes = notes;
        this.updatedAt = new Date().toISOString();
        return this;
    }
    
    // Получить полную информацию о клиенте
    getFullInfo() {
        return {
            ...this.getInfo(),
            email: this.email,
            ordersCount: this.orders.length,
            notes: this.notes,
            type: this.type
        };
    }
}

// Класс для сотрудников
class Employee extends ContactEntity {
    constructor(name = '', phoneNumber = '', position = '') {
        super(name, phoneNumber);
        this.position = position;
        this.isAdmin = false;
        this.canCreateOrders = false;
        this.processes = []; // Массив ID процессов, к которым есть доступ
        this.isActive = true;
        this.type = 'employee';
    }
    
    // Установить должность
    setPosition(position) {
        this.position = position;
        this.updatedAt = new Date().toISOString();
        return this;
    }
    
    // Установить права администратора
    setAdmin(isAdmin) {
        this.isAdmin = !!isAdmin;
        this.updatedAt = new Date().toISOString();
        return this;
    }
    
    // Установить права создания заказов
    setCanCreateOrders(canCreate) {
        this.canCreateOrders = !!canCreate;
        this.updatedAt = new Date().toISOString();
        return this;
    }
    
    // Добавить доступ к процессу
    addProcess(processId) {
        if (!this.processes.includes(processId)) {
            this.processes.push(processId);
            this.updatedAt = new Date().toISOString();
        }
        return this;
    }
    
    // Удалить доступ к процессу
    removeProcess(processId) {
        const index = this.processes.indexOf(processId);
        if (index > -1) {
            this.processes.splice(index, 1);
            this.updatedAt = new Date().toISOString();
        }
        return this;
    }
    
    // Установить активность
    setActive(isActive) {
        this.isActive = !!isActive;
        this.updatedAt = new Date().toISOString();
        return this;
    }
    
    // Получить полную информацию о сотруднике
    getFullInfo() {
        return {
            ...this.getInfo(),
            position: this.position,
            isAdmin: this.isAdmin,
            canCreateOrders: this.canCreateOrders,
            processesCount: this.processes.length,
            processes: this.processes,
            isActive: this.isActive,
            type: this.type
        };
    }
    
    // Проверить доступ к процессу
    hasProcessAccess(processId) {
        return this.isAdmin || this.processes.includes(processId);
    }
}

// Фабрика для создания контактных сущностей
class ContactFactory {
    static createCustomer(name, phone, email = '') {
        return new Customer(name, phone, email);
    }
    
    static createEmployee(name, phone, position = '') {
        return new Employee(name, phone, position);
    }
    
    static createFromData(data) {
        if (data.type === 'customer') {
            const customer = new Customer(data.name, '', data.email);
            if (data.phone) {
                customer.setPhone(data.phone);
            }
            customer.orders = data.orders || [];
            customer.notes = data.notes || '';
            return customer;
        } else if (data.type === 'employee') {
            const employee = new Employee(data.name, '', data.position);
            if (data.phone) {
                employee.setPhone(data.phone);
            }
            employee.isAdmin = data.isAdmin || false;
            employee.canCreateOrders = data.canCreateOrders || false;
            employee.processes = data.processes || [];
            employee.isActive = data.isActive !== undefined ? data.isActive : true;
            return employee;
        }
        
        // Возвращаем базовую контактную сущность для неизвестных типов
        return new ContactEntity(data.name, data.phone);
    }
}

// Экспортируем в глобальную область
window.ContactEntity = ContactEntity;
window.Customer = Customer;
window.Employee = Employee;
window.ContactFactory = ContactFactory;
