// Данные системы с историей заказов
let data = {
    users: [
        {
            id: 1,
            name: "Администратор",
            phone: "+7 777 777 7777",
            password: "1488",
            isAdmin: true,
            processes: [],
            canCreateOrders: true
        }
    ],
    processes: [],
    products: [],
    orders: [],
    currentUser: null
};

// Функции для работы с историей заказов
function addOrderHistoryEvent(orderId, eventType, eventData = {}) {
    const order = data.orders.find(o => o.id === orderId);
    if (!order) return;
    
    if (!order.history) {
        order.history = [];
    }
    
    const historyEvent = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        type: eventType, // 'created', 'moved', 'defect_sent', 'defect_fixed'
        user: eventData.currentUser ? eventData.currentUser.name : 'Система',
        userId: eventData.currentUser ? eventData.currentUser.id : null,
        fromProcess: eventData.fromProcess || null,
        toProcess: eventData.toProcess || null,
        reason: eventData.reason || null,
        comment: eventData.comment || null,
        isDefect: eventData.isDefect || false
    };
    
    order.history.push(historyEvent);
    saveData();
    
    console.log('Добавлено событие в историю:', historyEvent);
}

function moveOrderToProcess(orderId, newProcessId, reason = null, isDefect = false) {
    const order = data.orders.find(o => o.id === orderId);
    if (!order) return false;
    
    const oldProcessId = order.currentProcessId;
    const oldProcess = data.processes.find(p => p.id === oldProcessId);
    const newProcess = data.processes.find(p => p.id === newProcessId) || { name: 'Завершен' };
    
    order.currentProcessId = newProcessId === 0 ? null : newProcessId;
    
    // Добавляем событие в историю
    addOrderHistoryEvent(orderId, isDefect ? 'defect_sent' : 'moved', {
        currentUser: data.currentUser,
        fromProcess: oldProcess ? { id: oldProcess.id, name: oldProcess.name } : null,
        toProcess: newProcess ? { id: newProcess.id || 0, name: newProcess.name } : null,
        reason: reason,
        isDefect: isDefect
    });
    
    saveData();
    return true;
}

// Сохранение данных в localStorage
function saveData() {
    try {
        const dataToSave = {
            users: data.users,
            processes: data.processes,
            products: data.products,
            orders: data.orders
        };
        localStorage.setItem('crmData', JSON.stringify(dataToSave));
        console.log('Данные сохранены');
    } catch (error) {
        console.error('Ошибка сохранения данных:', error);
    }
}

// Загрузка данных из localStorage
function loadData() {
    try {
        const savedData = localStorage.getItem('crmData');
        if (savedData) {
            const parsed = JSON.parse(savedData);
            data.users = parsed.users || data.users;
            data.processes = parsed.processes || [];
            data.products = parsed.products || [];
            data.orders = parsed.orders || [];
            
            // Проверяем и восстанавливаем админа если его нет
            const admin = data.users.find(u => u.isAdmin);
            if (!admin) {
                console.log('Админ не найден, создаем заново');
                data.users.unshift({
                    id: 1,
                    name: "Администратор",
                    phone: "+7 777 777 7777", 
                    password: "1488",
                    isAdmin: true,
                    processes: [],
                    canCreateOrders: true
                });
                saveData();
            }
            
            console.log('Данные загружены из localStorage');
        } else {
            console.log('Используются данные по умолчанию');
            saveData();
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        console.log('Используются данные по умолчанию');
        saveData();
    }
}

// Сохранение текущего пользователя в sessionStorage
function saveCurrentUser() {
    if (data.currentUser) {
        sessionStorage.setItem('currentUser', JSON.stringify(data.currentUser));
        console.log('Текущий пользователь сохранен:', data.currentUser.name);
    } else {
        sessionStorage.removeItem('currentUser');
        console.log('Текущий пользователь удален из сессии');
    }
}

// Загрузка текущего пользователя из sessionStorage
function loadCurrentUser() {
    try {
        const savedUser = sessionStorage.getItem('currentUser');
        if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            
            const actualUser = data.users.find(u => u.id === parsedUser.id);
            if (actualUser) {
                data.currentUser = actualUser;
                console.log('Текущий пользователь загружен:', data.currentUser.name, 'Админ:', data.currentUser.isAdmin);
                return true;
            } else {
                console.log('Сохраненный пользователь не найден в базе, очищаем сессию');
                sessionStorage.removeItem('currentUser');
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки текущего пользователя:', error);
        sessionStorage.removeItem('currentUser');
    }
    return false;
}
