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
        
        // Статический хостинг (GitHub Pages, Netlify, Vercel и др.)
        if (this.isStaticHosting()) {
            const apiUrl = this.getExternalApiUrl();
            console.log('📖 Режим статического хостинга, внешний API:', apiUrl);
            return apiUrl;
        }
        
        // Полноценный хостинг с серверной частью
        console.log('☁️ Режим полноценного хостинга');
        return `${currentDomain}/api`;
    },
    
    // Определение статического хостинга
    isStaticHosting() {
        const domain = window.location.hostname;
        const staticHostings = [
            'github.io',           // GitHub Pages
            'netlify.app',         // Netlify
            'vercel.app',          // Vercel
            'surge.sh',            // Surge
            'firebase.app',        // Firebase Hosting
            'web.app',             // Firebase
            'pages.dev',           // Cloudflare Pages
            'onrender.com',        // Render Static
            'gitlab.io'            // GitLab Pages
        ];
        
        return staticHostings.some(hosting => domain.includes(hosting));
    },
    
    // Получение URL внешнего API
    getExternalApiUrl() {
        // Порядок приоритета для получения API URL:
        
        // 1. Из переменных окружения (если поддерживается хостингом)
        if (typeof process !== 'undefined' && process.env && process.env.API_URL) {
            return process.env.API_URL;
        }
        
        // 2. Из мета-тега в HTML
        const apiMeta = document.querySelector('meta[name="api-url"]');
        if (apiMeta && apiMeta.content) {
            return apiMeta.content;
        }
        
        // 3. Из глобальной переменной JavaScript
        if (window.API_URL) {
            return window.API_URL;
        }
        
        // 4. Из localStorage (может быть установлен вручную)
        const storedApiUrl = localStorage.getItem('api-url');
        if (storedApiUrl) {
            return storedApiUrl;
        }
        
        // 5. Автоматическое определение по паттернам домена
        const domain = window.location.hostname;
        
        // GitHub Pages: username.github.io/repo -> username-repo-api.herokuapp.com
        if (domain.includes('github.io')) {
            const parts = domain.split('.');
            const username = parts[0];
            const repo = window.location.pathname.split('/')[1] || 'app';
            return `https://${username}-${repo}-api.herokuapp.com/api`;
        }
        
        // Netlify: app-name.netlify.app -> app-name-api.herokuapp.com
        if (domain.includes('netlify.app')) {
            const appName = domain.split('.')[0];
            return `https://${appName}-api.herokuapp.com/api`;
        }
        
        // Vercel: app-name.vercel.app -> app-name-api.herokuapp.com
        if (domain.includes('vercel.app')) {
            const appName = domain.split('.')[0];
            return `https://${appName}-api.herokuapp.com/api`;
        }
        
        // Fallback: пробуем найти API на том же домене с суффиксом -api
        const baseDomain = domain.split('.')[0];
        return `https://${baseDomain}-api.herokuapp.com/api`;
    },
    
    // Проверка правильности URL
    validateApiUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },
    
    // Настройка API URL вручную (для отладки)
    setApiUrl(url) {
        if (this.validateApiUrl(url)) {
            localStorage.setItem('api-url', url);
            console.log('🔧 API URL установлен вручную:', url);
            return true;
        } else {
            console.error('❌ Некорректный API URL:', url);
            return false;
        }
    },
    
    // Очистка настроек
    clearApiUrl() {
        localStorage.removeItem('api-url');
        console.log('🗑️ Настройки API URL очищены');
    },
    
    // Информация о текущей конфигурации
    getInfo() {
        const domain = window.location.hostname;
        const apiUrl = this.getApiUrl();
        
        return {
            domain: domain,
            isLocal: domain.includes('localhost') || domain.includes('127.0.0.1'),
            isStatic: this.isStaticHosting(),
            apiUrl: apiUrl,
            valid: this.validateApiUrl(apiUrl)
        };
    }
};

// Добавляем глобальные функции для удобства отладки
window.setApiUrl = (url) => APP_CONFIG.setApiUrl(url);
window.clearApiUrl = () => APP_CONFIG.clearApiUrl();
window.getApiInfo = () => {
    const info = APP_CONFIG.getInfo();
    console.table(info);
    return info;
};

window.APP_CONFIG = APP_CONFIG;
