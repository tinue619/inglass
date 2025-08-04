// Скрипт для создания тестовых данных на сервере
const testData = {
    users: [
        {
            id: 1,
            name: "Администратор",
            phone: "+7 777 777 7777",
            password: "1488",
            isAdmin: true,
            processes: [],
            canCreateOrders: true
        },
        {
            id: 2,
            name: "Менеджер Анна",
            phone: "+7 111 111 1111",
            password: "1111",
            isAdmin: false,
            canCreateOrders: true,
            processes: [1]
        },
        {
            id: 3,
            name: "Мастер Иван",
            phone: "+7 222 222 2222",
            password: "2222",
            isAdmin: false,
            canCreateOrders: false,
            processes: [2, 3]
        }
    ],
    processes: [
        { id: 1, name: 'Прием заказа', order: 1 },
        { id: 2, name: 'Замер', order: 2 },
        { id: 3, name: 'Резка стекла', order: 3 },
        { id: 4, name: 'Обработка кромки', order: 4 },
        { id: 5, name: 'Упаковка', order: 5 }
    ],
    products: [
        { 
            id: 1, 
            name: 'Стекло прозрачное', 
            processes: [1, 2, 3, 4, 5] 
        },
        { 
            id: 2, 
            name: 'Зеркало', 
            processes: [1, 2, 3, 5] 
        },
        { 
            id: 3, 
            name: 'Стеклопакет', 
            processes: [1, 2, 3, 4, 5] 
        }
    ],
    orders: [
        {
            id: 1001,
            client: {
                name: "ООО Строй-Комплект",
                contacts: [
                    { type: "phone", value: "+7 123 456 7890", isPrimary: true },
                    { type: "email", value: "info@stroy.ru", isPrimary: false }
                ]
            },
            product: { id: 1, name: "Стекло прозрачное" },
            quantity: "2 шт",
            size: "1000x800 мм",
            thickness: "6 мм",
            comment: "Срочный заказ, нужно до пятницы",
            currentProcessId: 2,
            status: "status-process",
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 дня назад
            history: [
                {
                    id: 1,
                    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    type: "created",
                    user: { name: "Менеджер Анна" },
                    data: {
                        fromProcess: null,
                        toProcess: { id: 1, name: "Прием заказа" },
                        reason: null,
                        comment: "Заказ создан",
                        isDefect: false
                    }
                },
                {
                    id: 2,
                    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                    type: "moved",
                    user: { name: "Менеджер Анна" },
                    data: {
                        fromProcess: { id: 1, name: "Прием заказа" },
                        toProcess: { id: 2, name: "Замер" },
                        reason: null,
                        comment: "Переведен на замер",
                        isDefect: false
                    }
                }
            ]
        },
        {
            id: 1002,
            client: {
                name: "Петров Алексей",
                contacts: [
                    { type: "phone", value: "+7 987 654 3210", isPrimary: true }
                ]
            },
            product: { id: 2, name: "Зеркало" },
            quantity: "1 шт",
            size: "600x800 мм",
            thickness: "4 мм",
            comment: "Для ванной комнаты",
            currentProcessId: 1,
            status: "status-process",
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // вчера
            history: [
                {
                    id: 3,
                    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                    type: "created",
                    user: { name: "Менеджер Анна" },
                    data: {
                        fromProcess: null,
                        toProcess: { id: 1, name: "Прием заказа" },
                        reason: null,
                        comment: "Заказ создан",
                        isDefect: false
                    }
                }
            ]
        },
        {
            id: 1003,
            client: {
                name: "ИП Сидоров",
                contacts: [
                    { type: "phone", value: "+7 555 123 4567", isPrimary: true },
                    { type: "email", value: "sidorov@mail.ru", isPrimary: false }
                ]
            },
            product: { id: 3, name: "Стеклопакет" },
            quantity: "4 шт",
            size: "1200x1500 мм",
            thickness: "двухкамерный",
            comment: "Для офиса, энергосберегающий",
            currentProcessId: null,
            status: "status-done",
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 дней назад
            history: [
                {
                    id: 4,
                    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                    type: "created",
                    user: { name: "Менеджер Анна" },
                    data: {
                        fromProcess: null,
                        toProcess: { id: 1, name: "Прием заказа" },
                        reason: null,
                        comment: "Заказ создан",
                        isDefect: false
                    }
                },
                {
                    id: 5,
                    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
                    type: "moved",
                    user: { name: "Мастер Иван" },
                    data: {
                        fromProcess: { id: 5, name: "Упаковка" },
                        toProcess: { id: 0, name: "Завершено" },
                        reason: null,
                        comment: "Заказ выполнен",
                        isDefect: false
                    }
                }
            ]
        }
    ],
    lastSync: new Date().toISOString()
};

// Функция для отправки тестовых данных на сервер
async function createTestData() {
    try {
        console.log('🔄 Отправляем тестовые данные на сервер...');
        
        const response = await fetch('http://localhost:3001/api/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Тестовые данные успешно созданы!');
            console.log(`👥 Пользователей: ${testData.users.length}`);
            console.log(`⚙️ Процессов: ${testData.processes.length}`);
            console.log(`📦 Изделий: ${testData.products.length}`);
            console.log(`📋 Заказов: ${testData.orders.length}`);
            
            alert('✅ Тестовые данные созданы!\n\nДанные для входа:\n\nАдминистратор:\nТелефон: +7 777 777 7777\nПароль: 1488\n\nМенеджер:\nТелефон: +7 111 111 1111\nПароль: 1111\n\nМастер:\nТелефон: +7 222 222 2222\nПароль: 2222');
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('❌ Ошибка создания тестовых данных:', error);
        alert(`❌ Ошибка: ${error.message}\n\nУбедитесь что сервер запущен на http://localhost:3001`);
    }
}

// Проверка статуса сервера
async function checkServer() {
    try {
        const response = await fetch('http://localhost:3001/api/health');
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Сервер доступен:', result);
            return true;
        }
    } catch (error) {
        console.error('❌ Сервер недоступен:', error);
        return false;
    }
}

// Автоматический запуск если запущен в браузере
if (typeof window !== 'undefined') {
    window.createTestData = createTestData;
    window.checkServer = checkServer;
    window.testData = testData;
    
    console.log('🧪 Модуль тестовых данных загружен');
    console.log('Команды:');
    console.log('- createTestData() - создать тестовые данные');
    console.log('- checkServer() - проверить сервер');
}

// Экспорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testData,
        createTestData,
        checkServer
    };
}
