// Инициализация приложения - только серверный режим
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Инициализация приложения (server-only режим)...');
    
    try {
        // 1. Инициализируем APIService
        if (!window.APIService) {
            throw new Error('APIService не найден');
        }
        
        // 2. Инициализируем DataManager
        console.log('📊 Инициализируем DataManager...');
        const success = await DataManager.init();
        if (!success) {
            throw new Error('Ошибка инициализации DataManager');
        }
        
        // 3. Проверяем авторизацию
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            try {
                const user = JSON.parse(currentUser);
                DataManager.setCurrentUser = (user) => {
                    DataManager.currentUser = user;
                    localStorage.setItem('currentUser', JSON.stringify(user));
                };
                DataManager.getCurrentUser = () => DataManager.currentUser;
                DataManager.clearCurrentUser = () => {
                    DataManager.currentUser = null;
                    localStorage.removeItem('currentUser');
                };
                
                DataManager.setCurrentUser(user);
                console.log('👤 Пользователь найден:', user.name);
                
                // Запускаем автообновление
                DataManager.startAutoRefresh(30000);
                console.log('🔄 Автообновление запущено');
                
                // Показываем главное приложение
                AppModule.showMainApp();
                return;
            } catch (error) {
                console.error('Ошибка восстановления пользователя:', error);
                localStorage.removeItem('currentUser');
            }
        }
        
        // 4. Показываем экран авторизации
        console.log('🔐 Показываем экран авторизации');
        AuthModule.showLoginScreen();
        
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        
        // Показываем сообщение об ошибке
        const app = document.getElementById('app');
        app.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #dc3545;">
                <h2>❌ Ошибка подключения к серверу</h2>
                <p>Не удается подключиться к серверу данных.</p>
                <p>Проверьте подключение к интернету и попробуйте снова.</p>
                <button onclick="location.reload()" class="btn btn-primary">
                    🔄 Попробовать снова
                </button>
                <br><br>
                <details>
                    <summary>Техническая информация</summary>
                    <pre>${error.stack || error.message}</pre>
                </details>
            </div>
        `;
    }
});

console.log('🔧 App init (server-only) загружен');
