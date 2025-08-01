// Главный файл приложения
document.addEventListener('DOMContentLoaded', () => {
    console.log('App started');
    
    try {
        // Загружаем данные
        loadData();
        
        // Пытаемся загрузить текущего пользователя
        if (loadCurrentUser()) {
            console.log('Пользователь найден, показываем главное приложение');
            showMainApp();
        } else {
            console.log('Пользователь не найден, показываем экран входа');
            showLoginScreen();
        }
    } catch (error) {
        console.error('Ошибка при запуске приложения:', error);
        document.getElementById('app').innerHTML = `
            <div style="padding: 20px; color: red;">
                <h2>Ошибка запуска</h2>
                <p>${error.message}</p>
                <button onclick="location.reload()">Перезагрузить</button>
            </div>
        `;
    }
});

// Показать главное приложение
function showMainApp() {
    console.log('Показываем главное приложение для пользователя:', data.currentUser.name);
    
    const app = document.getElementById('app');
    if (!app) {
        console.error('Элемент app не найден');
        return;
    }
    
    try {
        app.innerHTML = `
            <div id="mainApp" style="display: block;">
                <header class="header">
                    <div class="header-logo">
                        <img src="assets/logo.svg" alt="Logo" onerror="this.src='assets/logo-placeholder.svg'">
                        <img src="assets/name.svg" alt="Company Name" onerror="this.src='assets/name-placeholder.svg'" style="height: 24px;">
                    </div>
                    <div class="header-actions">
                        <div class="user-info">
                            <span>👤 ${data.currentUser.name}</span>
                        </div>
                        ${data.currentUser.isAdmin ? 
                        `<button class="btn btn-secondary btn-small" onclick="showAdminPanel()">
                        Админ панель
                        </button>` : ''
                    }
                        <button class="btn btn-secondary btn-small" onclick="showProcessBoard()">
                            Процессы
                        </button>
                        <button class="btn btn-danger btn-small" onclick="logout()">
                            Выйти
                        </button>
                    </div>
                </header>
                <main id="mainContent">
                    <div style="padding: 20px;">
                        <h3>Загрузка...</h3>
                    </div>
                </main>
            </div>
        `;
        
        // По умолчанию показываем доску процессов
        setTimeout(() => {
            try {
                showProcessBoard();
            } catch (error) {
                console.error('Ошибка при показе доски процессов:', error);
                document.getElementById('mainContent').innerHTML = `
                    <div style="padding: 20px;">
                        <h3>Ошибка загрузки доски процессов</h3>
                        <p>${error.message}</p>
                        <button onclick="showProcessBoard()">Попробовать снова</button>
                    </div>
                `;
            }
        }, 100);
        
    } catch (error) {
        console.error('Ошибка при создании интерфейса:', error);
        app.innerHTML = `
            <div style="padding: 20px; color: red;">
                <h2>Ошибка интерфейса</h2>
                <p>${error.message}</p>
                <button onclick="logout()">Выйти</button>
            </div>
        `;
    }
}

// Обработка изменения размера окна
window.addEventListener('resize', () => {
    try {
        if (document.getElementById('processBoard')) {
            renderProcessBoard();
        }
    } catch (error) {
        console.error('Ошибка при изменении размера:', error);
    }
});

// Автосохранение при закрытии окна
window.addEventListener('beforeunload', () => {
    try {
        saveData();
    } catch (error) {
        console.error('Ошибка при сохранении:', error);
    }
});
