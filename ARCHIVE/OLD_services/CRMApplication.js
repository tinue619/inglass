/**
 * Главный класс приложения CRM системы
 */
class CRMApplication {
    constructor() {
        this.dataRepository = new DataRepository();
        this.authService = new AuthService(this.dataRepository);
        this.orderService = new OrderService(this.dataRepository);
        
        this.isInitialized = false;
        this.currentView = null;
        this.draggedOrderId = null;
        this.appContainer = null;
    }

    async init() {
        try {
            console.log('🚀 Инициализация CRM системы...');
            
            this.appContainer = document.getElementById('app');
            if (!this.appContainer) {
                throw new Error('Контейнер приложения #app не найден');
            }

            this.dataRepository.load();
            this._setupEventHandlers();
            await this._determineInitialView();

            this.isInitialized = true;
            console.log('✅ CRM система инициализирована успешно');

        } catch (error) {
            console.error('❌ Ошибка инициализации приложения:', error);
            this._showError('Ошибка инициализации', error.message);
        }
    }

    _setupEventHandlers() {
        window.addEventListener('beforeunload', () => {
            this.dataRepository.save();
        });

        window.addEventListener('resize', () => {
            this._handleWindowResize();
        });

        window.addEventListener('error', (event) => {
            console.error('Глобальная ошибка:', event.error);
        });
    }

    async _determineInitialView() {
        if (this.authService.isAuthenticated()) {
            console.log('Пользователь авторизован, показываем главное приложение');
            await this.showMainApp();
        } else {
            console.log('Пользователь не авторизован, показываем экран входа');
            await this.showLoginScreen();
        }
    }

    async showLoginScreen() {
        try {
            this.currentView = 'login';
            
            this.appContainer.innerHTML = `
                <div class="login-container">
                    <div class="login-form">
                        <div class="login-logo">
                            <img src="assets/logo.svg" alt="Logo" onerror="this.src='assets/logo-placeholder.svg'">
                            <img src="assets/name.svg" alt="Company Name" onerror="this.src='assets/name-placeholder.svg'" style="height: 24px;">
                        </div>
                        <h2>Вход в систему</h2>
                        <form id="loginForm">
                            <div class="form-group">
                                <label>Номер телефона:</label>
                                <input type="tel" id="loginPhone" class="form-input" placeholder="+7-(xxx)-xxx-xxxx" required>
                            </div>
                            <div class="form-group">
                                <label>Пароль:</label>
                                <input type="password" id="loginPassword" class="form-input" required>
                            </div>
                            <button type="submit" class="btn btn-primary btn-full">Войти</button>
                        </form>
                        <div id="loginError" class="error-message" style="display: none;"></div>
                    </div>
                </div>
            `;

            const phoneInput = document.getElementById('loginPhone');
            Phone.applyMask(phoneInput);

            document.getElementById('loginForm').addEventListener('submit', (e) => {
                this._handleLogin(e);
            });

        } catch (error) {
            console.error('Ошибка показа экрана входа:', error);
            this._showError('Ошибка интерфейса', error.message);
        }
    }

    async showMainApp() {
        try {
            const currentUser = this.authService.getCurrentUser();
            if (!currentUser) {
                throw new Error('Пользователь не авторизован');
            }

            this.currentView = 'main';
            
            this.appContainer.innerHTML = `
                <div id="mainApp">
                    <header class="header">
                        <div class="header-logo">
                            <img src="assets/logo.svg" alt="Logo" onerror="this.src='assets/logo-placeholder.svg'">
                            <img src="assets/name.svg" alt="Company Name" onerror="this.src='assets/name-placeholder.svg'" style="height: 24px;">
                        </div>
                        <div class="header-actions">
                            <div class="user-info">
                                <span>👤 ${currentUser.name}</span>
                            </div>
                            ${currentUser.isAdmin ? 
                                '<button class="btn btn-secondary btn-small" onclick="app.showAdminPanel()">Админ панель</button>' : ''
                            }
                            <button class="btn btn-secondary btn-small" onclick="app.showProcessBoard()">Процессы</button>
                            <button class="btn btn-danger btn-small" onclick="app.logout()">Выйти</button>
                        </div>
                    </header>
                    <main id="mainContent">
                        <div style="padding: 20px;">
                            <h3>Загрузка...</h3>
                        </div>
                    </main>
                </div>
            `;

            setTimeout(() => {
                this.showProcessBoard();
            }, 100);

        } catch (error) {
            console.error('Ошибка показа главного приложения:', error);
            this._showError('Ошибка интерфейса', error.message);
        }
    }

    async showProcessBoard() {
        try {
            const mainContent = document.getElementById('mainContent');
            if (!mainContent) {
                throw new Error('Контейнер mainContent не найден');
            }

            const currentUser = this.authService.getCurrentUser();
            const canCreate = this.authService.canCreateOrders();
            const stats = this.orderService.getOrderStatistics();
            
            mainContent.innerHTML = `
                <div class="board-container">
                    ${canCreate ? `
                        <div class="board-header">
                            <button class="btn btn-primary" onclick="app.showAddOrderModal()">Добавить заказ</button>
                            <div class="board-stats">
                                <span>Всего заказов: ${stats.total}</span>
                                <span>В работе: ${stats.inProgress}</span>
                                <span>Завершено: ${stats.completed}</span>
                                ${stats.defective > 0 ? `<span style="color: #dc3545;">В браке: ${stats.defective}</span>` : ''}
                            </div>
                        </div>
                    ` : ''}
                    <div class="process-board" id="processBoard">
                        <div style="padding: 20px;">Загрузка процессов...</div>
                    </div>
                </div>
            `;
            
            setTimeout(() => {
                this._renderProcessBoard();
            }, 100);

        } catch (error) {
            console.error('Ошибка показа доски процессов:', error);
            this._showError('Ошибка интерфейса', error.message);
        }
    }

    _renderProcessBoard() {
        try {
            const processBoard = document.getElementById('processBoard');
            if (!processBoard) return;
            
            const currentUser = this.authService.getCurrentUser();
            const isAdmin = currentUser.isAdmin;
            
            const availableProcesses = isAdmin 
                ? this.dataRepository.getProcesses() 
                : this.dataRepository.getProcesses().filter(p => currentUser.hasAccessToProcess(p.id));
            
            const allColumns = [...availableProcesses];
            
            const hasAccessToComplete = isAdmin || this._userCanSeeCompletedOrders(currentUser);
            if (hasAccessToComplete) {
                allColumns.push({ id: 0, name: 'Завершено', order: 9999 });
            }
            
            if (allColumns.length === 0) {
                processBoard.innerHTML = `
                    <div style="padding: 40px; text-align: center; color: #666;">
                        <h3>У вас нет доступа к процессам</h3>
                        <p>Обратитесь к администратору для настройки прав доступа</p>
                    </div>
                `;
                return;
            }
            
            processBoard.innerHTML = allColumns.map(process => {
                const orders = this._getOrdersForProcess(process.id, currentUser);
                
                return `
                    <div class="process-column" data-process-id="${process.id}"
                         ${isAdmin ? 'ondrop="app.handleDrop(event)" ondragover="app.handleDragOver(event)"' : ''}>
                        <div class="process-header">
                            <div class="process-title">${process.name}</div>
                            <div class="process-count">${orders.length} заказов</div>
                        </div>
                        <div class="process-items" id="process-${process.id}">
                            ${orders.length > 0 ? 
                                orders.map(order => this._renderOrderCard(order, isAdmin)).join('') :
                                '<div class="empty-state">Нет заказов</div>'
                            }
                        </div>
                    </div>
                `;
            }).join('');
            
            this._setupOrderCardListeners();
            
        } catch (error) {
            console.error('Ошибка рендеринга процессов:', error);
            const processBoard = document.getElementById('processBoard');
            if (processBoard) {
                processBoard.innerHTML = `
                    <div style="padding: 20px; color: red;">
                        <h3>Ошибка отображения процессов</h3>
                        <p>${error.message}</p>
                        <button onclick="app.showProcessBoard()">Попробовать снова</button>
                    </div>
                `;
            }
        }
    }

    _getOrdersForProcess(processId, user) {
        if (processId === 0) {
            return this.orderService.getAccessibleOrders(user).filter(order => order.isCompleted());
        }
        return this.orderService.getOrdersByProcessForUser(processId, user);
    }

    _userCanSeeCompletedOrders(user) {
        return this.dataRepository.getProducts().some(product => {
            const lastProcessId = product.getLastProcess();
            return user.hasAccessToProcess(lastProcessId);
        });
    }

    _renderOrderCard(order, isAdmin) {
        try {
            const formattedDate = order.getFormattedCreatedDate();
            const isDefective = order.isDefective();
            
            return `
                <div class="order-card" 
                     data-order-id="${order.id}"
                     ${isAdmin ? 'draggable="true"' : ''}>
                    <div class="order-number">№${order.number}</div>
                    <div class="order-customer">${order.customerName}</div>
                    ${isDefective ? `
                        <div style="font-size: 12px; color: #dc3545; font-weight: 600; margin: 4px 0;">
                            БРАК: ${order.defectInfo.defectReason}
                        </div>
                    ` : ''}
                    <div class="order-created">
                        <small>${formattedDate.date}</small>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Ошибка рендеринга карточки заказа:', error);
            return `
                <div class="order-card" style="border-left: 4px solid red;">
                    <div>Ошибка отображения заказа №${order?.number || 'неизвестно'}</div>
                </div>
            `;
        }
    }

    _setupOrderCardListeners() {
        document.querySelectorAll('.order-card').forEach(card => {
            card.addEventListener('click', (event) => {
                if (!this.draggedOrderId) {
                    const orderId = parseInt(card.dataset.orderId);
                    if (orderId) {
                        this.showOrderDetails(orderId);
                    }
                }
            });
        });
    }

    async _handleLogin(event) {
        event.preventDefault();
        
        const phone = document.getElementById('loginPhone').value.trim();
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');
        
        try {
            errorDiv.style.display = 'none';
            
            const validation = this.authService.validateLoginData(phone, password);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }
            
            await this.authService.login(phone, password);
            await this.showMainApp();
            
        } catch (error) {
            console.error('Ошибка входа:', error);
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    }

    async logout() {
        try {
            this.authService.logout();
            await this.showLoginScreen();
        } catch (error) {
            console.error('Ошибка выхода:', error);
            this._showError('Ошибка выхода', error.message);
        }
    }

    showAddOrderModal() {
        console.log('Показать модальное окно добавления заказа');
        alert('Функция добавления заказа будет реализована в следующих итерациях');
    }

    showOrderDetails(orderId) {
        console.log('Показать детали заказа:', orderId);
        const order = this.dataRepository.getOrderById(orderId);
        if (order) {
            alert(`Заказ №${order.number}\\nКлиент: ${order.customerName}\\nТелефон: ${order.customerPhone.getFormatted()}`);
        }
    }

    showAdminPanel() {
        console.log('Показать админ панель');
        alert('Админ панель будет реализована в следующих итерациях');
    }

    _handleWindowResize() {
        if (this.currentView === 'main' && document.getElementById('processBoard')) {
            this._renderProcessBoard();
        }
    }

    _showError(title, message) {
        if (this.appContainer) {
            this.appContainer.innerHTML = `
                <div style="padding: 20px; color: red; text-align: center;">
                    <h2>❌ ${title}</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn btn-primary">Перезагрузить</button>
                </div>
            `;
        } else {
            alert(`${title}: ${message}`);
        }
    }

    // Drag & Drop заглушки
    handleDragStart(event) { console.log('Drag start - будет реализовано позже'); }
    handleDragEnd(event) { console.log('Drag end - будет реализовано позже'); }
    handleDragOver(event) { event.preventDefault(); }
    handleDragEnter(event) { console.log('Drag enter - будет реализовано позже'); }
    handleDragLeave(event) { console.log('Drag leave - будет реализовано позже'); }
    handleDrop(event) { console.log('Drop - будет реализовано позже'); }
}

// Создаем глобальный экземпляр приложения
window.app = new CRMApplication();
window.CRMApplication = CRMApplication;
