// Универсальная конфигурация для любых хостингов
const APP_CONFIG = {
    // Автоматическое определение API URL
    getApiUrl() {
        const currentDomain = window.location.origin;
        
        // Локальная разработка
        if (currentDomain.includes('localhost') || currentDomain.includes('127.0.0.1')) {
            console.log('🏠 Режим локальной разработки');
            return 'http://localhost:3001/api';
        }
        
        // GitHub Pages
        if (currentDomain.includes('github.io') || currentDomain.includes('githubusercontent')) {
            console.log('🌐 Режим GitHub Pages');
            return 'https://inglass-9be99f83280c.herokuapp.com/api';
        }
        
        // Heroku или другой облачный хостинг
        if (currentDomain.includes('herokuapp.com') || currentDomain.includes('herokucdn.com')) {
            console.log('☁️ Режим Heroku - API на том же домене');
            return `${currentDomain}/api`;
        }
        
        // Любой другой хостинг - API на том же домене
        console.log('🌐 Режим облачного хостинга - API на том же домене');
        return `${currentDomain}/api`;
    },
    
    // Настройки по умолчанию
    DEFAULT_SETTINGS: {
        autoSyncInterval: 30000, // 30 секунд
        maxRetries: 3,
        retryDelay: 1000
    },
    
    // Проверяем режим разработки
    isDevelopment() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1';
    }
};

// Выводим информацию о конфигурации
console.log('⚙️ Config загружен:', {
    domain: window.location.origin,
    apiUrl: APP_CONFIG.getApiUrl(),
    isDev: APP_CONFIG.isDevelopment()
});
