// Административные функции
function showAdminPanel() {
    console.log('Показываем админ панель');
    
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) {
        console.error('mainContent не найден');
        return;
    }
    
    mainContent.innerHTML = `
        <div class="admin-panel">
            <h2>Панель администратора</h2>
            <div style="margin-bottom: 20px;">
                <button class="btn btn-success" onclick="createTestData()">🎭 Создать тестовые данные</button>
                <button class="btn btn-warning" onclick="clearAllData()">🗑️ Очистить все</button>
            </div>
            
            <div class="admin-tabs">
                <button class="tab-btn active" onclick="switchTab('users')">Пользователи</button>
                <button class="tab-btn" onclick="switchTab('processes')">Процессы</button>
                <button class="tab-btn" onclick="switchTab('products')">Изделия</button>
                <button class="tab-btn" onclick="switchTab('orders')">Заказы</button>
            </div>
            
            <div id="tab-users" class="tab-content active">
                <h3>Пользователи</h3>
                <button class="btn btn-primary" onclick="addUser()">Добавить пользователя</button>
                <div id="users-table"></div>
            </div>
            
            <div id="tab-processes" class="tab-content">
                <h3>Процессы</h3>
                <button class="btn btn-primary" onclick="addProcess()">Добавить процесс</button>
                <div id="processes-table"></div>
            </div>
            
            <div id="tab-products" class="tab-content">
                <h3>Изделия</h3>
                <button class="btn btn-primary" onclick="addProduct()">Добавить изделие</button>
                <div id="products-table"></div>
            </div>
            
            <div id="tab-orders" class="tab-content">
                <h3>Заказы</h3>
                <button class="btn btn-primary" onclick="addOrder()">Добавить заказ</button>
                <div id="orders-table"></div>
            </div>
        </div>
    `;
    
    // Рендерим содержимое с задержкой
    setTimeout(() => {
        renderAllTables();
    }, 100);
}

// Переключение вкладок
function switchTab(tabName) {
    console.log('Переключаем на:', tabName);
    
    // Убираем активные классы
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Добавляем активные классы
    if (event && event.target) {
        event.target.classList.add('active');
    }
    document.getElementById('tab-' + tabName).classList.add('active');
}

// Рендеринг всех таблиц
function renderAllTables() {
    console.log('Рендерим все таблицы');
    renderUsersTable();
    renderProcessesTable();
    renderProductsTable();
    renderOrdersTable();
}

// === ПОЛЬЗОВАТЕЛИ ===
function renderUsersTable() {
    const container = document.getElementById('users-table');
    if (!container) return;
    
    console.log('Рендерим пользователей, количество:', data.users.length);
    
    if (data.users.length === 0) {
        container.innerHTML = '<p>Нет пользователей</p>';
        return;
    }
    
    const tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Имя</th>
                    <th>Телефон</th>
                    <th>Тип</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
                ${data.users.map(user => `
                    <tr>
                        <td>${user.name}</td>
                        <td>${user.phone}</td>
                        <td>${user.isAdmin ? 'Админ' : 'Пользователь'}</td>
                        <td>
                            <button class="btn btn-small btn-secondary" onclick="editUser(${user.id})">Изменить</button>
                            ${!user.isAdmin ? `<button class="btn btn-small btn-danger" onclick="deleteUser(${user.id})">Удалить</button>` : ''}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
}

function addUser() {
    console.log('Добавляем пользователя');
    
    const form = `
        <div class="form-group">
            <label>Имя:</label>
            <input type="text" id="user-name" class="form-input">
        </div>
        <div class="form-group">
            <label>Телефон:</label>
            <input type="text" id="user-phone" class="form-input">
        </div>
        <div class="form-group">
            <label>Пароль:</label>
            <input type="password" id="user-password" class="form-input">
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" id="user-can-create"> Может создавать заказы
            </label>
        </div>
        <div class="form-group">
            <label>Доступные процессы:</label>
            ${data.processes.map(p => `
                <label>
                    <input type="checkbox" value="${p.id}" class="process-checkbox"> ${p.name}
                </label>
            `).join('')}
        </div>
    `;
    
    showModal('Добавить пользователя', form, () => {
        const name = document.getElementById('user-name').value.trim();
        const phone = document.getElementById('user-phone').value.trim();
        const password = document.getElementById('user-password').value.trim();
        const canCreate = document.getElementById('user-can-create').checked;
        const processes = Array.from(document.querySelectorAll('.process-checkbox:checked')).map(cb => parseInt(cb.value));
        
        if (!name || !phone || !password) {
            alert('Заполните все поля');
            return false;
        }
        
        const newUser = {
            id: Date.now(),
            name: name,
            phone: phone,
            password: password,
            isAdmin: false,
            canCreateOrders: canCreate,
            processes: processes
        };
        
        data.users.push(newUser);
        saveData();
        renderUsersTable();
        console.log('Пользователь добавлен:', newUser);
        return true;
    });
}

function editUser(userId) {
    const user = data.users.find(u => u.id === userId);
    if (!user) return;
    
    const form = `
        <div class="form-group">
            <label>Имя:</label>
            <input type="text" id="user-name" class="form-input" value="${user.name}">
        </div>
        <div class="form-group">
            <label>Телефон:</label>
            <input type="text" id="user-phone" class="form-input" value="${user.phone}">
        </div>
        <div class="form-group">
            <label>Новый пароль (оставьте пустым для сохранения текущего):</label>
            <input type="password" id="user-password" class="form-input">
        </div>
        ${!user.isAdmin ? `
        <div class="form-group">
            <label>
                <input type="checkbox" id="user-can-create" ${user.canCreateOrders ? 'checked' : ''}> Может создавать заказы
            </label>
        </div>
        <div class="form-group">
            <label>Доступные процессы:</label>
            ${data.processes.map(p => `
                <label>
                    <input type="checkbox" value="${p.id}" class="process-checkbox" ${user.processes.includes(p.id) ? 'checked' : ''}> ${p.name}
                </label>
            `).join('')}
        </div>
        ` : ''}
    `;
    
    showModal('Редактировать пользователя', form, () => {
        user.name = document.getElementById('user-name').value.trim();
        user.phone = document.getElementById('user-phone').value.trim();
        
        const newPassword = document.getElementById('user-password').value.trim();
        if (newPassword) {
            user.password = newPassword;
        }
        
        if (!user.isAdmin) {
            user.canCreateOrders = document.getElementById('user-can-create').checked;
            user.processes = Array.from(document.querySelectorAll('.process-checkbox:checked')).map(cb => parseInt(cb.value));
        }
        
        saveData();
        renderUsersTable();
        return true;
    });
}

function deleteUser(userId) {
    if (confirm('Удалить пользователя?')) {
        data.users = data.users.filter(u => u.id !== userId);
        saveData();
        renderUsersTable();
    }
}

// === ПРОЦЕССЫ ===
function renderProcessesTable() {
    const container = document.getElementById('processes-table');
    if (!container) return;
    
    console.log('Рендерим процессы, количество:', data.processes.length);
    
    if (data.processes.length === 0) {
        container.innerHTML = '<p>Нет процессов</p>';
        return;
    }
    
    const sortedProcesses = data.processes.sort((a, b) => a.order - b.order);
    
    const tableHTML = `
        <div class="table-header" style="margin-bottom: 16px; color: var(--gray-600); font-size: 0.875rem;">
            📝 Перетаскивайте строки для изменения порядка
        </div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 40px;">Порядок</th>
                    <th>Название</th>
                    <th style="width: 140px;">Действия</th>
                </tr>
            </thead>
            <tbody id="processes-tbody">
                ${sortedProcesses.map((process, index) => `
                    <tr class="draggable-process-row" draggable="true" data-process-id="${process.id}" data-index="${index}">
                        <td>
                            <div class="drag-handle" style="cursor: move; color: var(--gray-400); font-size: 1.2em;">☰</div>
                        </td>
                        <td>${process.name}</td>
                        <td>
                            <button class="btn btn-small btn-secondary" onclick="editProcess(${process.id})">Изменить</button>
                            <button class="btn btn-small btn-danger" onclick="deleteProcess(${process.id})">Удалить</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
    
    // Инициализируем drag and drop
    initProcessDragAndDrop();
}

function addProcess() {
    const maxOrder = data.processes.length > 0 ? Math.max(...data.processes.map(p => p.order)) + 1 : 1;
    
    const form = `
        <div class="form-group">
            <label>Название процесса:</label>
            <input type="text" id="process-name" class="form-input">
        </div>
        <div class="form-group">
            <label>Порядок:</label>
            <input type="number" id="process-order" class="form-input" value="${maxOrder}">
        </div>
    `;
    
    showModal('Добавить процесс', form, () => {
        const name = document.getElementById('process-name').value.trim();
        const order = parseInt(document.getElementById('process-order').value);
        
        if (!name) {
            alert('Введите название процесса');
            return false;
        }
        
        const newProcess = {
            id: Date.now(),
            name: name,
            order: order
        };
        
        data.processes.push(newProcess);
        saveData();
        renderProcessesTable();
        renderProductsTable(); // Обновляем изделия тоже
        renderUsersTable(); // Обновляем пользователей тоже
        console.log('Процесс добавлен:', newProcess);
        return true;
    });
}

function editProcess(processId) {
    const process = data.processes.find(p => p.id === processId);
    if (!process) return;
    
    const form = `
        <div class="form-group">
            <label>Название процесса:</label>
            <input type="text" id="process-name" class="form-input" value="${process.name}">
        </div>
        <div class="form-group">
            <label>Порядок:</label>
            <input type="number" id="process-order" class="form-input" value="${process.order}">
        </div>
    `;
    
    showModal('Редактировать процесс', form, () => {
        process.name = document.getElementById('process-name').value.trim();
        process.order = parseInt(document.getElementById('process-order').value);
        
        saveData();
        renderProcessesTable();
        renderProductsTable(); // Обновляем изделия тоже
        renderUsersTable(); // Обновляем пользователей тоже
        return true;
    });
}

function deleteProcess(processId) {
    if (confirm('Удалить процесс? Он также будет удален из всех изделий и пользователей.')) {
        data.processes = data.processes.filter(p => p.id !== processId);
        
        // Удаляем из изделий
        data.products.forEach(product => {
            product.processes = product.processes.filter(pid => pid !== processId);
        });
        
        // Удаляем из пользователей
        data.users.forEach(user => {
            user.processes = user.processes.filter(pid => pid !== processId);
        });
        
        saveData();
        renderAllTables();
    }
}

// === ИЗДЕЛИЯ ===
function renderProductsTable() {
    const container = document.getElementById('products-table');
    if (!container) return;
    
    console.log('Рендерим изделия, количество:', data.products.length);
    
    if (data.products.length === 0) {
        container.innerHTML = '<p>Нет изделий</p>';
        return;
    }
    
    const tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Название</th>
                    <th>Процессы</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
                ${data.products.map(product => `
                    <tr>
                        <td>${product.name}</td>
                        <td>${product.processes.map(pid => {
                            const process = data.processes.find(p => p.id === pid);
                            return process ? process.name : 'Неизвестный';
                        }).join(' → ')}</td>
                        <td>
                            <button class="btn btn-small btn-secondary" onclick="editProduct(${product.id})">Изменить</button>
                            <button class="btn btn-small btn-danger" onclick="deleteProduct(${product.id})">Удалить</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
}

function addProduct() {
    if (data.processes.length === 0) {
        alert('Сначала создайте процессы');
        return;
    }
    
    const form = `
        <div class="form-group">
            <label>Название изделия:</label>
            <input type="text" id="product-name" class="form-input">
        </div>
        <div class="form-group">
            <label>Процессы (выберите в нужном порядке):</label>
            ${data.processes.sort((a, b) => a.order - b.order).map(p => `
                <label>
                    <input type="checkbox" value="${p.id}" class="product-process-checkbox"> ${p.name}
                </label>
            `).join('')}
        </div>
    `;
    
    showModal('Добавить изделие', form, () => {
        const name = document.getElementById('product-name').value.trim();
        const processes = Array.from(document.querySelectorAll('.product-process-checkbox:checked')).map(cb => parseInt(cb.value));
        
        if (!name) {
            alert('Введите название изделия');
            return false;
        }
        
        if (processes.length === 0) {
            alert('Выберите хотя бы один процесс');
            return false;
        }
        
        const newProduct = {
            id: Date.now(),
            name: name,
            processes: processes
        };
        
        data.products.push(newProduct);
        saveData();
        renderProductsTable();
        console.log('Изделие добавлено:', newProduct);
        return true;
    });
}

function editProduct(productId) {
    const product = data.products.find(p => p.id === productId);
    if (!product) return;
    
    const form = `
        <div class="form-group">
            <label>Название изделия:</label>
            <input type="text" id="product-name" class="form-input" value="${product.name}">
        </div>
        <div class="form-group">
            <label>Процессы:</label>
            ${data.processes.sort((a, b) => a.order - b.order).map(p => `
                <label>
                    <input type="checkbox" value="${p.id}" class="product-process-checkbox" ${product.processes.includes(p.id) ? 'checked' : ''}> ${p.name}
                </label>
            `).join('')}
        </div>
    `;
    
    showModal('Редактировать изделие', form, () => {
        product.name = document.getElementById('product-name').value.trim();
        product.processes = Array.from(document.querySelectorAll('.product-process-checkbox:checked')).map(cb => parseInt(cb.value));
        
        if (product.processes.length === 0) {
            alert('Выберите хотя бы один процесс');
            return false;
        }
        
        saveData();
        renderProductsTable();
        return true;
    });
}

function deleteProduct(productId) {
    if (confirm('Удалить изделие?')) {
        data.products = data.products.filter(p => p.id !== productId);
        saveData();
        renderProductsTable();
    }
}

// === ЗАКАЗЫ ===
function renderOrdersTable() {
    const container = document.getElementById('orders-table');
    if (!container) return;
    
    console.log('Рендерим заказы, количество:', data.orders.length);
    
    if (data.orders.length === 0) {
        container.innerHTML = '<p>Нет заказов</p>';
        return;
    }
    
    const tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Номер</th>
                    <th>Изделие</th>
                    <th>Клиент</th>
                    <th>Телефон</th>
                    <th>Процесс</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
                ${data.orders.map(order => {
                    const product = data.products.find(p => p.id === order.productId);
                    const process = data.processes.find(p => p.id === order.currentProcessId);
                    return `
                        <tr>
                            <td>${order.number}</td>
                            <td>${product ? product.name : 'Неизвестно'}</td>
                            <td>${order.customerName}</td>
                            <td>${order.customerPhone}</td>
                            <td>${process ? process.name : 'Завершен'}</td>
                            <td>
                                <button class="btn btn-small btn-secondary" onclick="editOrder(${order.id})">Изменить</button>
                                <button class="btn btn-small btn-danger" onclick="deleteOrder(${order.id})">Удалить</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
}

function addOrder() {
    if (data.products.length === 0) {
        alert('Сначала создайте изделия');
        return;
    }
    
    const form = `
        <div class="form-group">
            <label>Номер заказа:</label>
            <input type="text" id="order-number" class="form-input" value="${generateOrderNumber()}">
        </div>
        <div class="form-group">
            <label>Изделие:</label>
            <select id="order-product" class="form-input">
                <option value="">Выберите изделие</option>
                ${data.products.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>Имя клиента:</label>
            <input type="text" id="order-customer" class="form-input">
        </div>
        <div class="form-group">
            <label>Телефон клиента:</label>
            <input type="text" id="order-phone" class="form-input">
        </div>
        <div id="custom-fields"></div>
        <button type="button" class="btn btn-secondary btn-small" onclick="addCustomField()">+ Добавить поле</button>
    `;
    
    showModal('Добавить заказ', form, () => {
        const number = document.getElementById('order-number').value.trim();
        const productId = parseInt(document.getElementById('order-product').value);
        const customerName = document.getElementById('order-customer').value.trim();
        const customerPhone = document.getElementById('order-phone').value.trim();
        
        if (!number || !productId || !customerName || !customerPhone) {
            alert('Заполните все поля');
            return false;
        }
        
        // Проверяем уникальность номера
        if (data.orders.some(o => o.number === number)) {
            alert('Заказ с таким номером уже существует');
            return false;
        }
        
        const product = data.products.find(p => p.id === productId);
        if (!product || product.processes.length === 0) {
            alert('У выбранного изделия нет процессов');
            return false;
        }
        
        // Собираем кастомные поля
        const customFields = {};
        document.querySelectorAll('.custom-field-row').forEach(row => {
            const key = row.querySelector('.custom-field-key').value.trim();
            const value = row.querySelector('.custom-field-value').value.trim();
            if (key && value) {
                customFields[key] = value;
            }
        });
        
        const newOrder = {
            id: Date.now(),
            number: number,
            productId: productId,
            customerName: customerName,
            customerPhone: customerPhone,
            currentProcessId: product.processes[0], // Первый процесс
            customFields: customFields,
            createdAt: new Date().toISOString()
        };
        
        data.orders.push(newOrder);
        saveData();
        renderOrdersTable();
        
        // Обновляем доску процессов если открыта
        if (typeof renderProcessBoard === 'function' && document.getElementById('processBoard')) {
            renderProcessBoard();
        }
        
        console.log('Заказ добавлен:', newOrder);
        return true;
    });
}

function editOrder(orderId) {
    const order = data.orders.find(o => o.id === orderId);
    if (!order) {
        console.error('Заказ не найден:', orderId);
        return;
    }
    
    console.log('Редактируем заказ:', order);
    
    // Создаём поля для кастомных полей
    const customFieldsHtml = Object.entries(order.customFields || {}).map(([key, value]) => `
        <div class="custom-field-row" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
            <input type="text" class="custom-field-key form-input" value="${key}" style="flex: 1;">
            <input type="text" class="custom-field-value form-input" value="${value}" style="flex: 1;">
            <button type="button" class="btn btn-danger btn-small" onclick="this.parentElement.remove()">×</button>
        </div>
    `).join('');
    
    const form = `
        <div class="form-group">
            <label>Номер заказа:</label>
            <input type="text" id="order-number" class="form-input" value="${order.number}">
        </div>
        <div class="form-group">
            <label>Изделие:</label>
            <select id="order-product" class="form-input">
                ${data.products.map(p => `<option value="${p.id}" ${p.id === order.productId ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>Имя клиента:</label>
            <input type="text" id="order-customer" class="form-input" value="${order.customerName}">
        </div>
        <div class="form-group">
            <label>Телефон клиента:</label>
            <input type="text" id="order-phone" class="form-input" value="${order.customerPhone}">
        </div>
        <div class="form-group">
            <label>Текущий процесс:</label>
            <select id="order-process" class="form-input">
                ${data.processes.map(p => `<option value="${p.id}" ${p.id === order.currentProcessId ? 'selected' : ''}>${p.name}</option>`).join('')}
                <option value="0" ${!order.currentProcessId ? 'selected' : ''}>Завершен</option>
            </select>
        </div>
        <div class="form-group">
            <label>Кастомные поля:</label>
            <div id="custom-fields">${customFieldsHtml}</div>
            <button type="button" class="btn btn-secondary btn-small" onclick="addCustomField()">+ Добавить поле</button>
        </div>
    `;
    
    showModal('Редактировать заказ', form, () => {
        try {
            const newNumber = document.getElementById('order-number').value.trim();
            const newProductId = parseInt(document.getElementById('order-product').value);
            const newCustomerName = document.getElementById('order-customer').value.trim();
            const newCustomerPhone = document.getElementById('order-phone').value.trim();
            
            if (!newNumber || !newProductId || !newCustomerName || !newCustomerPhone) {
                alert('Заполните все обязательные поля');
                return false;
            }
            
            // Проверяем уникальность номера
            if (data.orders.some(o => o.number === newNumber && o.id !== order.id)) {
                alert('Заказ с таким номером уже существует');
                return false;
            }
            
            // Собираем кастомные поля
            const customFields = {};
            document.querySelectorAll('.custom-field-row').forEach(row => {
                const key = row.querySelector('.custom-field-key').value.trim();
                const value = row.querySelector('.custom-field-value').value.trim();
                if (key && value) {
                    customFields[key] = value;
                }
            });
            
            order.number = newNumber;
            order.productId = newProductId;
            order.customerName = newCustomerName;
            order.customerPhone = newCustomerPhone;
            order.customFields = customFields;
            
            const processId = parseInt(document.getElementById('order-process').value);
            order.currentProcessId = processId === 0 ? null : processId;
            
            saveData();
            renderOrdersTable();
            
            if (typeof renderProcessBoard === 'function' && document.getElementById('processBoard')) {
                renderProcessBoard();
            }
            
            console.log('Заказ обновлен:', order);
            return true;
        } catch (error) {
            console.error('Ошибка при обновлении заказа:', error);
            alert('Ошибка: ' + error.message);
            return false;
        }
    });
}

function deleteOrder(orderId) {
    if (confirm('Удалить заказ?')) {
        data.orders = data.orders.filter(o => o.id !== orderId);
        saveData();
        renderOrdersTable();
        
        if (typeof renderProcessBoard === 'function' && document.getElementById('processBoard')) {
            renderProcessBoard();
        }
    }
}

// === МОДАЛЬНЫЕ ОКНА ===
function showModal(title, content, onSave) {
    console.log('Показываем модальное окно:', title);
    
    // Убираем существующие модальные окна
    closeModal();
    
    const modal = document.createElement('div');
    modal.className = 'modal show';
    
    // Если onSave не передан, не показываем кнопку сохранения
    const footerButtons = onSave ? `
        <button class="btn btn-secondary" onclick="closeModal()">Отмена</button>
        <button class="btn btn-primary" id="modal-save-btn">Сохранить</button>
    ` : `
        <button class="btn btn-secondary" onclick="closeModal()">Закрыть</button>
    `;
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                ${footerButtons}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Обработчик сохранения (только если onSave передан)
    if (onSave) {
        const saveBtn = document.getElementById('modal-save-btn');
        if (saveBtn) {
            saveBtn.onclick = () => {
                try {
                    if (onSave()) {
                        closeModal();
                    }
                } catch (error) {
                    console.error('Ошибка при сохранении:', error);
                    alert('Ошибка: ' + error.message);
                }
            };
        }
    }
    
    // Закрытие по клику на фон
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };
    
    // Закрытие по ESC
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    document.addEventListener('keydown', handleKeyDown);
}

function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

// === УТИЛИТЫ ===

// Генерация номера заказа (дублируем из board.js)
function generateOrderNumber() {
    const today = new Date();
    const dateStr = today.getFullYear().toString().substr(-2) + 
                   (today.getMonth() + 1).toString().padStart(2, '0') + 
                   today.getDate().toString().padStart(2, '0');
    
    const existingNumbers = data.orders
        .map(o => o.number)
        .filter(n => n.startsWith(dateStr))
        .map(n => parseInt(n.split('-')[1]) || 0);
    
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    
    return `${dateStr}-${nextNumber.toString().padStart(3, '0')}`;
}

// Добавление кастомного поля (дублируем из board.js)
function addCustomField() {
    const container = document.getElementById('custom-fields');
    if (!container) {
        console.error('Контейнер custom-fields не найден');
        return;
    }
    
    const fieldRow = document.createElement('div');
    fieldRow.className = 'custom-field-row';
    fieldRow.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
    
    fieldRow.innerHTML = `
        <input type="text" class="custom-field-key form-input" placeholder="Название поля" style="flex: 1;">
        <input type="text" class="custom-field-value form-input" placeholder="Значение" style="flex: 1;">
        <button type="button" class="btn btn-danger btn-small" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(fieldRow);
    console.log('Кастомное поле добавлено');
}

// Drag and Drop для процессов
function initProcessDragAndDrop() {
    const tbody = document.getElementById('processes-tbody');
    if (!tbody) return;
    
    let draggedElement = null;
    let draggedIndex = null;
    
    // Обработчики для строк
    const rows = tbody.querySelectorAll('.draggable-process-row');
    
    rows.forEach((row, index) => {
        row.addEventListener('dragstart', (e) => {
            draggedElement = row;
            draggedIndex = index;
            row.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';
        });
        
        row.addEventListener('dragend', (e) => {
            row.style.opacity = '1';
            draggedElement = null;
            draggedIndex = null;
            // Убираем все highlight
            rows.forEach(r => r.style.backgroundColor = '');
        });
        
        row.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        
        row.addEventListener('drop', (e) => {
            e.preventDefault();
            
            if (draggedElement && draggedElement !== row) {
                const targetIndex = parseInt(row.dataset.index);
                const draggedProcessId = parseInt(draggedElement.dataset.processId);
                const targetProcessId = parseInt(row.dataset.processId);
                
                // Переупорядочиваем процессы
                reorderProcesses(draggedProcessId, targetProcessId, draggedIndex, targetIndex);
            }
            
            // Убираем highlight
            row.style.backgroundColor = '';
        });
        
        row.addEventListener('dragenter', (e) => {
            e.preventDefault();
            if (draggedElement !== row) {
                row.style.backgroundColor = 'var(--primary-light)';
            }
        });
        
        row.addEventListener('dragleave', (e) => {
            // Проверяем, что мы действительно покинули элемент
            if (!row.contains(e.relatedTarget)) {
                row.style.backgroundColor = '';
            }
        });
    });
}

// Функция переупорядочивания процессов
function reorderProcesses(draggedId, targetId, draggedIndex, targetIndex) {
    const draggedProcess = data.processes.find(p => p.id === draggedId);
    const targetProcess = data.processes.find(p => p.id === targetId);
    
    if (!draggedProcess || !targetProcess) return;
    
    // Создаем новый порядок
    const sortedProcesses = data.processes.sort((a, b) => a.order - b.order);
    
    // Удаляем перетаскиваемый элемент
    sortedProcesses.splice(draggedIndex, 1);
    
    // Вставляем в новую позицию
    sortedProcesses.splice(targetIndex, 0, draggedProcess);
    
    // Обновляем порядок для всех процессов
    sortedProcesses.forEach((process, index) => {
        process.order = index + 1;
    });
    
    saveData();
    renderProcessesTable();
    renderProductsTable(); // Обновляем изделия тоже
    renderUsersTable(); // Обновляем пользователей тоже
    
    console.log('Порядок процессов обновлен');
}

function createTestData() {
    if (!confirm('Создать тестовые данные? Это добавит процессы, изделия и пользователей.')) return;
    
    // Процессы
    const processes = [
        { id: Date.now() + 1, name: 'Прием заказа', order: 1 },
        { id: Date.now() + 2, name: 'Замер', order: 2 },
        { id: Date.now() + 3, name: 'Резка', order: 3 },
        { id: Date.now() + 4, name: 'Упаковка', order: 4 }
    ];
    
    // Изделия
    const products = [
        { id: Date.now() + 10, name: 'Стекло', processes: [processes[0].id, processes[1].id, processes[2].id, processes[3].id] },
        { id: Date.now() + 11, name: 'Зеркало', processes: [processes[0].id, processes[2].id, processes[3].id] }
    ];
    
    // Пользователи
    const users = [
        {
            id: Date.now() + 20,
            name: 'Менеджер',
            phone: '+7 111 111 1111',
            password: '1111',
            isAdmin: false,
            canCreateOrders: true,
            processes: [processes[0].id]
        },
        {
            id: Date.now() + 21,
            name: 'Мастер резки',
            phone: '+7 222 222 2222',
            password: '2222',
            isAdmin: false,
            canCreateOrders: false,
            processes: [processes[2].id]
        }
    ];
    
    // Добавляем к существующим данным
    data.processes.push(...processes);
    data.products.push(...products);
    data.users.push(...users);
    
    saveData();
    renderAllTables();
    alert('Тестовые данные созданы!');
}

function clearAllData() {
    if (confirm('Удалить ВСЕ данные? Это действие необратимо!')) {
        // Сохраняем только админа
        const admin = data.users.find(u => u.isAdmin);
        data.users = admin ? [admin] : [];
        data.processes = [];
        data.products = [];
        data.orders = [];
        
        saveData();
        renderAllTables();
        alert('Все данные удалены');
    }
}

// === МОДАЛЬНЫЕ ОКНА ===
function showModal(title, content, onSave) {
    console.log('Показываем модальное окно:', title);
    
    // Убираем существующие модальные окна
    closeModal();
    
    const modal = document.createElement('div');
    modal.className = 'modal show';
    
    // Если onSave не передан, не показываем кнопку сохранения
    const footerButtons = onSave ? `
        <button class="btn btn-secondary" onclick="closeModal()">Отмена</button>
        <button class="btn btn-primary" id="modal-save-btn">Сохранить</button>
    ` : `
        <button class="btn btn-secondary" onclick="closeModal()">Закрыть</button>
    `;
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                ${footerButtons}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Обработчик сохранения (только если onSave передан)
    if (onSave) {
        const saveBtn = document.getElementById('modal-save-btn');
        if (saveBtn) {
            saveBtn.onclick = () => {
                try {
                    if (onSave()) {
                        closeModal();
                    }
                } catch (error) {
                    console.error('Ошибка при сохранении:', error);
                    alert('Ошибка: ' + error.message);
                }
            };
        }
    }
    
    // Закрытие по клику на фон
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };
    
    // Закрытие по ESC
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    document.addEventListener('keydown', handleKeyDown);
}

window.showModal = showModal;

function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

window.closeModal = closeModal;