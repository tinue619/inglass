// Авторизация
function showLoginScreen() {
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
    
    renderUsers();
}

function renderUsers() {
    const userGrid = document.getElementById('userGrid');
    userGrid.innerHTML = data.users.map(user => `
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
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('passwordInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
}

function handleLogin() {
    const selectedCard = document.querySelector('.user-card.selected');
    if (!selectedCard) return;
    
    const userId = parseInt(selectedCard.dataset.userId);
    const password = document.getElementById('passwordInput').value;
    
    const user = data.users.find(u => u.id === userId);
    if (user && user.password === password) {
        data.currentUser = user;
        saveCurrentUser(); // Сохраняем в sessionStorage
        saveData();
        showMainApp();
    } else {
        alert('Неверный пароль');
        document.getElementById('passwordInput').value = '';
    }
}

function logout() {
    data.currentUser = null;
    saveCurrentUser(); // Удаляем из sessionStorage
    saveData();
    showLoginScreen();
}