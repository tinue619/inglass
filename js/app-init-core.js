// Инициализация приложения - новое архитектурное ядро с диагностикой
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Инициализация CRM системы...');
    
    // Проверяем наличие всех необходимых компонентов
    const requiredComponents = ['App', 'DataManager', 'AuthModule', 'AppModule'];
    const missingComponents = requiredComponents.filter(comp => typeof window[comp] === 'undefined');
    
    if (missingComponents.length > 0) {
        console.error('❌ Отсутствуют компоненты:', missingComponents);
        const app = document.getElementById('app');
        app.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #dc3545;">
                <h2>❌ Ошибка загрузки модулей</h2>
                <p>Не найдены следующие компоненты:</p>
                <ul style="text-align: left; display: inline-block;">
                    ${missingComponents.map(comp => `<li>${comp}</li>`).join('')}
                </ul>
                <p>Откройте консоль браузера для детальной диагностики.</p>
                <button onclick="location.reload()" class="btn btn-primary">
                    🔄 Перезагрузить
                </button>
            </div>
        `;
        return;
    }
    
    try {
        console.log('✅ Все компоненты найдены, начинаем инициализацию...');
        
        // Инициализируем приложение
        console.log('📥 Инициализация App...');
        const success = await App.init();
        
        if (!success) {
            throw new Error('Ошибка инициализации приложения');
        }
        
        console.log('✅ App инициализирован успешно');
        
        // Проверяем авторизацию
        console.log('🔍 Проверка авторизации...');
        if (App.isLoggedIn()) {
            const currentUser = App.getCurrentUser();
            console.log('👤 Пользователь найден:', currentUser ? currentUser.name : 'Неизвестен');
            
            // Показываем главное приложение
            console.log('🖥️ Показываем главное приложение...');
            AppModule.showMainApp();
        } else {
            // Показываем экран авторизации
            console.log('🔐 Показываем экран авторизации');
            AuthModule.showLoginScreen();
        }
        
        console.log('✅ CRM система успешно инициализирована');
        
    } catch (error) {
        console.error('❌ Критическая ошибка инициализации:', error);
        
        // Показываем экран ошибки с диагностикой
        const app = document.getElementById('app');
        app.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #dc3545;">
                <h2>❌ Ошибка инициализации системы</h2>
                <p>Не удается запустить CRM систему.</p>
                <p><strong>Ошибка:</strong> ${error.message}</p>
                
                <div style="margin: 20px 0;">
                    <h3>🔍 Диагностика компонентов:</h3>
                    <div style="text-align: left; display: inline-block;">
                        <div>App: ${typeof window.App !== 'undefined' ? '✅ OK' : '❌ Не найден'}</div>
                        <div>DataManager: ${typeof window.DataManager !== 'undefined' ? '✅ OK' : '❌ Не найден'}</div>
                        <div>AuthModule: ${typeof window.AuthModule !== 'undefined' ? '✅ OK' : '❌ Не найден'}</div>
                        <div>AppModule: ${typeof window.AppModule !== 'undefined' ? '✅ OK' : '❌ Не найден'}</div>
                        <div>APIService: ${typeof window.APIService !== 'undefined' ? '✅ OK' : '❌ Не найден'}</div>
                    </div>
                </div>
                
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

console.log('🔧 App Init (новое ядро с диагностикой) загружен');
