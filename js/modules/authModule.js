// Модуль авторизации
const AuthModule = {
    // Показать экран входа
    showLoginScreen() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div id="loginScreen">
                <div class="login-container">
                    <div class="logo-container">
                        <img src="assets/logo.svg" alt="Logo" onerror="this.src='assets/logo-placeholder.svg'">
                    </div>
                    <h2 class="text-center mb-3">Выберите пользователя</h2>
                    <div class="user-grid" id="userGrid"></div>
                    <input type="password" class="password-input" id="passwordInput" placeholder="Введите пароль" style="display:none;">
                    <button class="btn btn-primary w-100" id="loginBtn" style="display:none;">Войти</button>
                </div>
            </div>
        `;
        
        this.renderUsers();
    },

    // Отрисовка списка пользователей
    renderUsers() {
        const userGrid = document.getElementById('userGrid');
        userGrid.innerHTML = DataManager.getUsers().map(user => `
            <div class="user-card" data-user-id="${user.id}">
                <div class="user-name">${user.name}</div>
                <div class="user-phone">${user.phone}</div>
            </div>
        `).join('');
        
        // Обработчики кликов по пользователям
        document.querySelectorAll('.user-card').forEach(card => {
            card.addEventListener('click', function() {
                document.querySelectorAll('.user-card').forEach(c => c.classList.remove('selected'));
                this.classList.add('selected');
                document.getElementById('passwordInput').style.display = 'block';
                document.getElementById('loginBtn').style.display = 'block';
                document.getElementById('passwordInput').focus();
            });
        });
        
        // Обработчик кнопки входа
        document.getElementById('loginBtn').addEventListener('click', () => this.handleLogin());
        document.getElementById('passwordInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
    },

    // Обработка входа
    async handleLogin() {
        const selectedCard = document.querySelector('.user-card.selected');
        if (!selectedCard) return;
        
        const userId = parseInt(selectedCard.dataset.userId);
        const password = document.getElementById('passwordInput').value;
        
        if (!password) {
            alert('Введите пароль');
            return;
        }
        
        const user = DataManager.findUser(userId);
        if (!user) {
            alert('Пользователь не найден');
            return;
        }
        
        try {
            // Отправляем запрос на сервер для аутентификации
            const apiUrl = window.APP_CONFIG ? window.APP_CONFIG.getApiUrl() : '/api';
            const response = await fetch(`${apiUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    phone: user.phone,
                    password: password
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Успешная аутентификация
                DataManager.setCurrentUser(result.user);
                DataManager.saveCurrentUser();
                AppModule.showMainApp();
            } else {
                // Ошибка аутентификации
                alert(result.error || 'Ошибка входа');
                document.getElementById('passwordInput').value = '';
            }
        } catch (error) {
            console.error('Ошибка аутентификации:', error);
            alert('Ошибка соединения с сервером');
            document.getElementById('passwordInput').value = '';
        }
    },

    // Выход из системы
    logout() {
        DataManager.setCurrentUser(null);
        DataManager.saveCurrentUser();
        DataManager.save();
        this.showLoginScreen();
    }
};

window.AuthModule = AuthModule;

// Совместимость с legacy кодом
window.showLoginScreen = () => AuthModule.showLoginScreen();
window.logout = () => AuthModule.logout();
