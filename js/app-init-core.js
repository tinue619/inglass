// Инициализация приложения - новое архитектурное ядро
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Инициализация CRM системы...');
    
    try {
        // Инициализируем приложение
        const success = await App.init();
        
        if (!success) {
            throw new Error('Ошибка инициализации приложения');
        }
        
        // Проверяем авторизацию
        if (App.isLoggedIn()) {
            console.log('👤 Пользователь найден:', App.getCurrentUser().name);
            
            // Показываем главное приложение
            AppModule.showMainApp();
        } else {
            // Показываем экран авторизации
            console.log('🔐 Показываем экран авторизации');
            AuthModule.showLoginScreen();
        }
        
    } catch (error) {
        console.error('❌ Критическая ошибка инициализации:', error);
        
        // Показываем экран ошибки
        const app = document.getElementById('app');
        app.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #dc3545;">
                <h2>❌ Ошибка инициализации системы</h2>
                <p>Не удается запустить CRM систему.</p>
                <p>Проверьте подключение к интернету и попробуйте снова.</p>
                <button onclick="location.reload()" class="btn btn-primary">
                    🔄 Перезагрузить
                </button>
                <br><br>
                <details style="text-align: left;">
                    <summary>Техническая информация</summary>
                    <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; overflow: auto;">${error.stack || error.message}</pre>
                </details>
            </div>
        `;
    }
});

console.log('🔧 App Init (новое ядро) загружен');
