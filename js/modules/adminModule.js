// Модуль администрирования - краткий вариант
const AdminModule = {
    showAdminPanel() {
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="admin-panel">
                <h2>Панель администратора</h2>
                <div style="margin-bottom: 20px;">
                    <button class="btn btn-success" onclick="AdminModule.createTestData()">🎭 Создать тестовые данные</button>
                    <button class="btn btn-warning" onclick="AdminModule.clearAllData()">🗑️ Очистить все</button>
                </div>
                
                <div class="admin-tabs">
                    <button class="tab-btn active" onclick="AdminModule.switchTab('users')">Пользователи</button>
                    <button class="tab-btn" onclick="AdminModule.switchTab('processes')">Процессы</button>
                    <button class="tab-btn" onclick="AdminModule.switchTab('products')">Изделия</button>
                    <button class="tab-btn" onclick="AdminModule.switchTab('orders')">Заказы</button>
                </div>
                
                <div id="tab-users" class="tab-content active">
                    <h3>Пользователи</h3>
                    <button class="btn btn-primary" onclick="AdminModule.addUser()">Добавить пользователя</button>
                    <div id="users-table"></div>
                </div>
                
                <div id="tab-processes" class="tab-content">
                    <h3>Процессы</h3>
                    <button class="btn btn-primary" onclick="AdminModule.addProcess()">Добавить процесс</button>
                    <div id="processes-table"></div>
                </div>
                
                <div id="tab-products" class="tab-content">
                    <h3>Изделия</h3>
                    <button class="btn btn-primary" onclick="AdminModule.addProduct()">Добавить изделие</button>
                    <div id="products-table"></div>
                </div>
                
                <div id="tab-orders" class="tab-content">
                    <h3>Заказы</h3>
                    <button class="btn btn-primary" onclick="BoardModule.showAddOrderModal()">Добавить заказ</button>
                    <div id="orders-table"></div>
                </div>
            </div>
        `;
        setTimeout(() => this.renderAllTables(), 100);
    },

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        if (event && event.target) event.target.classList.add('active');
        document.getElementById('tab-' + tabName).classList.add('active');
    },

    renderAllTables() {
        this.renderUsersTable();
        this.renderProcessesTable();
        this.renderProductsTable();
        this.renderOrdersTable();
    },

    renderUsersTable() {
        const container = document.getElementById('users-table');
        if (!container) return;
        
        const users = DataManager.getUsers();
        if (users.length === 0) {
            container.innerHTML = '<p>Нет пользователей</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr><th>Имя</th><th>Телефон</th><th>Тип</th><th>Действия</th></tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.name}</td>
                            <td>${PhoneUtils.formatPhone(user.phone)}</td>
                            <td>${user.isAdmin ? 'Админ' : 'Пользователь'}</td>
                            <td>
                                <button class="btn btn-small btn-secondary" onclick="AdminModule.editUser(${user.id})">Изменить</button>
                                ${!user.isAdmin ? `<button class="btn btn-small btn-danger" onclick="AdminModule.deleteUser(${user.id})">Удалить</button>` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    addUser() {
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
                <label><input type="checkbox" id="user-can-create"> Может создавать заказы</label>
            </div>
            <div class="form-group">
                <label>Доступные процессы:</label>
                ${DataManager.getProcesses().map(p => `
                    <label><input type="checkbox" value="${p.id}" class="process-checkbox"> ${p.name}</label>
                `).join('')}
            </div>
        `;
        
        ModalModule.show('Добавить пользователя', form, () => {
            const name = document.getElementById('user-name').value.trim();
            const phone = document.getElementById('user-phone').value.trim();
            const password = document.getElementById('user-password').value.trim();
            const canCreate = document.getElementById('user-can-create').checked;
            const processes = Array.from(document.querySelectorAll('.process-checkbox:checked')).map(cb => parseInt(cb.value));
            
            if (!name || !phone || !password) {
                alert('Заполните все поля');
                return false;
            }
            
            // Валидация телефона
            if (!PhoneUtils.isValidPhone(phone)) {
                alert('Введите корректный номер телефона');
                return false;
            }
            
            DataManager.addUser({
                id: Date.now(),
                name, 
                phone: PhoneUtils.formatPhone(phone), // Форматируем телефон
                password,
                isAdmin: false,
                canCreateOrders: canCreate,
                processes
            });
            this.renderUsersTable();
            return true;
        });
        
        // Применяем маску телефона
        setTimeout(() => {
            const phoneInput = document.getElementById('user-phone');
            if (phoneInput && typeof PhoneUtils !== 'undefined' && PhoneUtils.applyMask) {
                PhoneUtils.applyMask(phoneInput);
            }
        }, 100);
    },

    editUser(userId) {
        const user = DataManager.findUser(userId);
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
                <label>Новый пароль (оставьте пустым):</label>
                <input type="password" id="user-password" class="form-input">
            </div>
            ${!user.isAdmin ? `
            <div class="form-group">
                <label><input type="checkbox" id="user-can-create" ${user.canCreateOrders ? 'checked' : ''}> Может создавать заказы</label>
            </div>
            <div class="form-group">
                <label>Доступные процессы:</label>
                ${DataManager.getProcesses().map(p => `
                    <label><input type="checkbox" value="${p.id}" class="process-checkbox" ${user.processes.includes(p.id) ? 'checked' : ''}> ${p.name}</label>
                `).join('')}
            </div>
            ` : ''}
        `;
        
        ModalModule.show('Редактировать пользователя', form, () => {
            const newName = document.getElementById('user-name').value.trim();
            const newPhone = document.getElementById('user-phone').value.trim();
            
            if (!newName || !newPhone) {
                alert('Заполните обязательные поля');
                return false;
            }
            
            // Валидация телефона
            if (!PhoneUtils.isValidPhone(newPhone)) {
                alert('Введите корректный номер телефона');
                return false;
            }
            
            user.name = newName;
            user.phone = PhoneUtils.formatPhone(newPhone); // Форматируем телефон
            
            const newPassword = document.getElementById('user-password').value.trim();
            if (newPassword) user.password = newPassword;
            
            if (!user.isAdmin) {
                user.canCreateOrders = document.getElementById('user-can-create').checked;
                user.processes = Array.from(document.querySelectorAll('.process-checkbox:checked')).map(cb => parseInt(cb.value));
            }
            
            DataManager.save();
            this.renderUsersTable();
            return true;
        });
        
        // Применяем маску телефона
        setTimeout(() => {
            const phoneInput = document.getElementById('user-phone');
            if (phoneInput && typeof PhoneUtils !== 'undefined' && PhoneUtils.applyMask) {
                PhoneUtils.applyMask(phoneInput);
            }
        }, 100);
    },

    deleteUser(userId) {
        if (confirm('Удалить пользователя?')) {
            DataManager.removeUser(userId);
            this.renderUsersTable();
        }
    },

    renderProcessesTable() {
        const container = document.getElementById('processes-table');
        if (!container) return;
        
        const processes = DataManager.getProcesses().sort((a, b) => a.order - b.order);
        if (processes.length === 0) {
            container.innerHTML = '<p>Нет процессов</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr><th>Порядок</th><th>Название</th><th>Действия</th></tr>
                </thead>
                <tbody>
                    ${processes.map(process => `
                        <tr>
                            <td>${process.order}</td>
                            <td>${process.name}</td>
                            <td>
                                <button class="btn btn-small btn-secondary" onclick="AdminModule.editProcess(${process.id})">Изменить</button>
                                <button class="btn btn-small btn-danger" onclick="AdminModule.deleteProcess(${process.id})">Удалить</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    addProcess() {
        const maxOrder = DataManager.getProcesses().length > 0 ? Math.max(...DataManager.getProcesses().map(p => p.order)) + 1 : 1;
        
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
        
        ModalModule.show('Добавить процесс', form, () => {
            const name = document.getElementById('process-name').value.trim();
            const order = parseInt(document.getElementById('process-order').value);
            
            if (!name) {
                alert('Введите название процесса');
                return false;
            }
            
            DataManager.addProcess({ id: Date.now(), name, order });
            this.renderAllTables();
            return true;
        });
    },

    editProcess(processId) {
        const process = DataManager.findProcess(processId);
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
        
        ModalModule.show('Редактировать процесс', form, () => {
            process.name = document.getElementById('process-name').value.trim();
            process.order = parseInt(document.getElementById('process-order').value);
            DataManager.save();
            this.renderAllTables();
            return true;
        });
    },

    deleteProcess(processId) {
        if (confirm('Удалить процесс? Он также будет удален из всех изделий и пользователей.')) {
            DataManager.removeProcess(processId);
            this.renderAllTables();
        }
    },

    renderProductsTable() {
        const container = document.getElementById('products-table');
        if (!container) return;
        
        const products = DataManager.getProducts();
        if (products.length === 0) {
            container.innerHTML = '<p>Нет изделий</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr><th>Название</th><th>Процессы</th><th>Действия</th></tr>
                </thead>
                <tbody>
                    ${products.map(product => `
                        <tr>
                            <td>${product.name}</td>
                            <td>${product.processes.map(pid => {
                                const process = DataManager.findProcess(pid);
                                return process ? process.name : 'Неизвестный';
                            }).join(' → ')}</td>
                            <td>
                                <button class="btn btn-small btn-secondary" onclick="AdminModule.editProduct(${product.id})">Изменить</button>
                                <button class="btn btn-small btn-danger" onclick="AdminModule.deleteProduct(${product.id})">Удалить</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    addProduct() {
        if (DataManager.getProcesses().length === 0) {
            alert('Сначала создайте процессы');
            return;
        }
        
        const form = `
            <div class="form-group">
                <label>Название изделия:</label>
                <input type="text" id="product-name" class="form-input">
            </div>
            <div class="form-group">
                <label>Процессы:</label>
                ${DataManager.getProcesses().sort((a, b) => a.order - b.order).map(p => `
                    <label><input type="checkbox" value="${p.id}" class="product-process-checkbox"> ${p.name}</label>
                `).join('')}
            </div>
        `;
        
        ModalModule.show('Добавить изделие', form, () => {
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
            
            DataManager.addProduct({ id: Date.now(), name, processes });
            this.renderProductsTable();
            return true;
        });
    },

    editProduct(productId) {
        const product = DataManager.findProduct(productId);
        if (!product) return;
        
        const form = `
            <div class="form-group">
                <label>Название изделия:</label>
                <input type="text" id="product-name" class="form-input" value="${product.name}">
            </div>
            <div class="form-group">
                <label>Процессы:</label>
                ${DataManager.getProcesses().sort((a, b) => a.order - b.order).map(p => `
                    <label><input type="checkbox" value="${p.id}" class="product-process-checkbox" ${product.processes.includes(p.id) ? 'checked' : ''}> ${p.name}</label>
                `).join('')}
            </div>
        `;
        
        ModalModule.show('Редактировать изделие', form, async () => {
            const newName = document.getElementById('product-name').value.trim();
            const newProcesses = Array.from(document.querySelectorAll('.product-process-checkbox:checked')).map(cb => parseInt(cb.value));
            
            if (!newName) {
                alert('Введите название изделия');
                return false;
            }
            if (newProcesses.length === 0) {
                alert('Выберите хотя бы один процесс');
                return false;
            }
            
            console.log('🔧 Обновляем изделие:', productId, { name: newName, processes: newProcesses });
            
            // Используем безопасный метод обновления
            const success = await DataManager.updateProduct(productId, {
                name: newName,
                processes: newProcesses
            });
            
            if (success) {
                this.renderProductsTable();
                // Обновляем доску если она открыта
                if (typeof BoardModule.renderProcessBoard === 'function' && document.getElementById('processBoard')) {
                    BoardModule.renderProcessBoard();
                }
                console.log('✅ Изделие успешно обновлено');
                return true;
            } else {
                alert('Ошибка обновления изделия');
                return false;
            }
        });
    },

    deleteProduct(productId) {
        if (confirm('Удалить изделие?')) {
            DataManager.removeProduct(productId);
            this.renderProductsTable();
        }
    },

    renderOrdersTable() {
        const container = document.getElementById('orders-table');
        if (!container) return;
        
        const orders = DataManager.getOrders();
        if (orders.length === 0) {
            container.innerHTML = '<p>Нет заказов</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr><th>Номер</th><th>Изделие</th><th>Клиент</th><th>Процесс</th><th>Действия</th></tr>
                </thead>
                <tbody>
                    ${orders.map(order => {
                        const product = DataManager.findProduct(order.productId);
                        const process = DataManager.findProcess(order.currentProcessId);
                        return `
                            <tr>
                                <td>${order.number}</td>
                                <td>${product ? product.name : 'Неизвестно'}</td>
                                <td>${order.customerName}</td>
                                <td>${process ? process.name : 'Завершен'}</td>
                                <td>
                                    <button class="btn btn-small btn-secondary" onclick="BoardModule.showOrderDetails(${order.id})">Детали</button>
                                    <button class="btn btn-small btn-danger" onclick="AdminModule.deleteOrder(${order.id})">Удалить</button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    },

    deleteOrder(orderId) {
        if (confirm('Удалить заказ?')) {
            DataManager.removeOrder(orderId);
            this.renderOrdersTable();
            if (typeof BoardModule.renderProcessBoard === 'function' && document.getElementById('processBoard')) {
                BoardModule.renderProcessBoard();
            }
        }
    },

    createTestData() {
        if (!confirm('Создать тестовые данные?')) return;
        DataManager.createTestData();
        this.renderAllTables();
        alert('Тестовые данные созданы!');
    },

    clearAllData() {
        if (!confirm('Удалить ВСЕ данные? Это действие необратимо!')) return;
        DataManager.clearAll();
        this.renderAllTables();
        alert('Все данные удалены');
    }
};

window.AdminModule = AdminModule;

// Совместимость с legacy кодом
window.showAdminPanel = () => AdminModule.showAdminPanel();
window.switchTab = (tabName) => AdminModule.switchTab(tabName);
window.createTestData = () => AdminModule.createTestData();
window.clearAllData = () => AdminModule.clearAllData();
