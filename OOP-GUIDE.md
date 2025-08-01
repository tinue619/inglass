# ООП Архитектура CRM Системы

## Обзор

Система управления заказами переделана в объектно-ориентированную архитектуру с четким разделением ответственности между классами и сервисами.

## Структура проекта

```
js/
├── classes/           # Модели данных
│   ├── BaseEntity.js     # Базовый класс для всех сущностей
│   ├── Phone.js          # Класс для работы с телефонами
│   ├── User.js           # Модель пользователя
│   ├── Process.js        # Модель процесса производства
│   ├── Product.js        # Модель изделия
│   ├── Order.js          # Модель заказа
│   ├── OrderHistoryEvent.js # События в истории заказа
│   └── DefectInfo.js     # Информация о браке
└── services/          # Бизнес-логика и сервисы
    ├── StorageService.js    # Работа с localStorage/sessionStorage
    ├── DataRepository.js    # Управление данными
    ├── AuthService.js       # Аутентификация
    ├── OrderService.js      # Управление заказами
    └── CRMApplication.js    # Главный класс приложения
```

## Основные классы

### BaseEntity
Базовый класс для всех сущностей с общими свойствами:
- `id` - уникальный идентификатор
- `createdAt` - дата создания
- `updatedAt` - дата последнего обновления
- `validate()` - валидация данных
- `toJSON()` / `fromJSON()` - сериализация/десериализация

### Phone
Класс для работы с телефонными номерами:
```javascript
const phone = new Phone('+7 123 456 7890');
console.log(phone.getFormatted()); // +7-(123)-456-78-90
console.log(phone.getDialable());  // +71234567890
console.log(phone.isValid());      // true
```

### User
Модель пользователя системы:
```javascript
const user = new User({
    name: 'Иван Иванов',
    phone: '+7 123 456 7890',
    password: '1234',
    isAdmin: false,
    canCreateOrders: true,
    processes: [1, 2, 3] // ID доступных процессов
});

console.log(user.hasAccessToProcess(1)); // true
user.addProcess(4);
user.setPassword('newPassword');
```

### Process
Модель процесса производства:
```javascript
const process = new Process({
    name: 'Резка стекла',
    order: 2,
    description: 'Резка стекла по размерам',
    estimatedTimeHours: 2
});
```

### Product
Модель изделия с цепочкой процессов:
```javascript
const product = new Product({
    name: 'Стекло',
    processes: [1, 2, 3, 4] // ID процессов в порядке выполнения
});

console.log(product.getFirstProcess()); // 1
console.log(product.getNextProcess(2)); // 3
console.log(product.isLastProcess(4));  // true
```

### Order
Модель заказа с историей и управлением браком:
```javascript
const order = new Order({
    number: '250801-001',
    productId: 1,
    customerName: 'Иван Петров',
    customerPhone: '+7 123 456 7890',
    currentProcessId: 1
});

// Перемещение заказа
order.moveToNextProcess(product, user, 'Заказ выполнен');

// Отправка в брак
order.sendToDefect(2, 'Неправильный размер', user, 'Резка', false);

// Устранение брака
order.fixDefect('Размер исправлен', user);

console.log(order.isDefective()); // false
console.log(order.getSortedHistory()); // История событий
```

## Основные сервисы

### DataRepository
Центральное хранилище данных с типизированными методами:
```javascript
const repo = new DataRepository();

// Пользователи
const users = repo.getUsers();
const user = repo.getUserById(1);
const newUser = repo.addUser(userData);
repo.updateUser(userId, updates);
repo.deleteUser(userId);

// Заказы
const orders = repo.getOrders();
const completedOrders = repo.getCompletedOrders();
const defectiveOrders = repo.getDefectiveOrders();
const ordersByProcess = repo.getOrdersByProcess(processId);

// Сохранение/загрузка
repo.save();
repo.load();
repo.createTestData();
```

### AuthService
Управление аутентификацией и авторизацией:
```javascript
const authService = new AuthService(dataRepository);

// Вход/выход
const user = await authService.login(phone, password);
authService.logout();

// Проверки
const isAuth = authService.isAuthenticated();
const isAdmin = authService.isCurrentUserAdmin();
const canCreate = authService.canCreateOrders();
const hasAccess = authService.hasAccessToProcess(processId);

// Смена пароля
authService.changePassword(currentPassword, newPassword);
```

### OrderService
Управление заказами и бизнес-логикой:
```javascript
const orderService = new OrderService(dataRepository);

// Создание заказа
const newOrder = orderService.createOrder({
    number: orderService.generateOrderNumber(),
    productId: 1,
    customerName: 'Иван Петров',
    customerPhone: '+7 123 456 7890'
});

// Перемещение заказов
orderService.moveOrderForward(orderId, 'Этап завершен');
orderService.moveOrderToProcess(orderId, processId, 'Админ переместил');

// Управление браком
orderService.sendOrderToDefect(orderId, targetProcessId, reason, false);
orderService.fixDefectOrder(orderId, 'Проблема устранена');

// Получение данных
const accessibleOrders = orderService.getAccessibleOrders();
const stats = orderService.getOrderStatistics();
const filtered = orderService.getFilteredOrders({status: 'defective'});
const found = orderService.searchOrders('123');
```

### CRMApplication
Главный класс приложения, управляющий UI и координирующий работу сервисов:
```javascript
const app = new CRMApplication();

// Инициализация
await app.init();

// Навигация
app.showLoginScreen();
app.showMainApp();
app.showProcessBoard();
app.showAdminPanel();

// Модальные окна
app.showAddOrderModal();
app.showOrderDetails(orderId);

// Выход
app.logout();
```

## Преимущества ООП архитектуры

### 1. Инкапсуляция
- Каждый класс отвечает за свою область
- Приватные методы защищены от внешнего использования
- Валидация данных встроена в модели

### 2. Наследование
- Все сущности наследуются от BaseEntity
- Общие методы и свойства переиспользуются
- Легко добавлять новые типы сущностей

### 3. Полиморфизм
- Единый интерфейс для работы с разными типами данных
- toJSON/fromJSON для всех классов
- Валидация через общий интерфейс

### 4. Разделение ответственности
- Модели (classes) - только данные и их валидация
- Сервисы (services) - бизнес-логика
- UI - только отображение и взаимодействие

### 5. Типобезопасность
- Четкие интерфейсы классов
- Валидация на уровне моделей
- Проверки типов в конструкторах

### 6. Тестируемость
- Каждый класс можно тестировать изолированно
- Моки и заглушки легко создавать
- Четкие границы между компонентами

### 7. Расширяемость
- Легко добавлять новые функции
- Модульная архитектура
- Слабое связывание между компонентами

## Запуск ООП версии

1. Откройте файл `index-oop.html` в браузере
2. Система автоматически создаст тестовые данные
3. Войдите с данными:
   - Администратор: +7 777 777 7777 / 1488
   - Менеджер: +7 111 111 1111 / 1111
   - Мастер: +7 222 222 2222 / 2222

## Сравнение с оригинальной версией

| Аспект | Оригинал | ООП версия |
|--------|----------|------------|
| Архитектура | Модульная с глобальными переменными | Классы и сервисы |
| Данные | Объекты в глобальном пространстве | Инкапсулированные модели |
| Валидация | Разбросана по коду | Встроена в модели |
| Бизнес-логика | В модулях UI | В отдельных сервисах |
| Типизация | Слабая | Строгая через классы |
| Тестируемость | Сложная | Простая |
| Расширяемость | Ограниченная | Высокая |

## Дальнейшие улучшения

1. **TypeScript** - добавить статическую типизацию
2. **Модули ES6** - использовать import/export
3. **Dependency Injection** - внедрение зависимостей
4. **Observer Pattern** - для реактивности
5. **Command Pattern** - для отмены операций
6. **Factory Pattern** - для создания объектов
7. **Unit тесты** - для каждого класса
8. **Интеграционные тесты** - для сервисов

## Заключение

ООП архитектура делает код более структурированным, поддерживаемым и расширяемым. Каждый класс имеет четкую ответственность, что упрощает разработку и отладку. Система готова к дальнейшему развитию и добавлению новых функций.
