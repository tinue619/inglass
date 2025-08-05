// Упрощенный сервис для работы с API сервера
class APIService {
    constructor() {
        this.baseUrl = this.getBaseUrl();
        this.isOnline = false;
        console.log('🌐 API Service инициализирован, базовый URL:', this.baseUrl);
        
        // Проверяем доступность сервера
        this.checkServerStatus();
        setInterval(() => this.checkServerStatus(), 30000);
    }
    
    getBaseUrl() {
        const currentDomain = window.location.origin;
        if (currentDomain.includes('localhost') || currentDomain.includes('127.0.0.1')) {
            return 'http://localhost:3001/api';
        }
        return `${currentDomain}/api`;
    }
    
    async checkServerStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                timeout: 5000
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && !this.isOnline) {
                    console.log('🟢 Сервер доступен');
                    this.isOnline = true;
                    this.showConnectionStatus(true);
                }
                return true;
            }
        } catch (error) {
            if (this.isOnline) {
                console.log('🔴 Сервер недоступен, работаем локально');
                this.isOnline = false;
                this.showConnectionStatus(false);
            }
        }
        return false;
    }
    
    showConnectionStatus(online) {
        const existingIndicator = document.querySelector('.connection-status');
        if (existingIndicator) existingIndicator.remove();
        
        const indicator = document.createElement('div');
        indicator.className = `connection-status ${online ? 'online' : 'offline'}`;
        indicator.textContent = online ? '🟢 Онлайн' : '🟡 Автономно';
        indicator.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 1000;
            padding: 8px 12px; border-radius: 4px; font-size: 12px;
            background: ${online ? '#d4edda' : '#fff3cd'};
            border: 1px solid ${online ? '#c3e6cb' : '#ffeaa7'};
            color: ${online ? '#155724' : '#856404'};
        `;
        document.body.appendChild(indicator);
        
        if (online) {
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.style.opacity = '0';
                    setTimeout(() => indicator.remove(), 300);
                }
            }, 3000);
        }
    }
    
    // Простая отправка данных на сервер (без загрузки обратно)
    async saveToServer() {
        if (!this.isOnline) return false;
        
        try {
            const localData = {
                users: DataManager._data.users,
                processes: DataManager._data.processes,
                products: DataManager._data.products,
                orders: DataManager._data.orders
            };
            
            const response = await fetch(`${this.baseUrl}/data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(localData)
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.log('✅ Данные сохранены на сервер');
                    return true;
                }
            }
        } catch (error) {
            console.error('Ошибка отправки на сервер:', error);
        }
        return false;
    }
    
    // Принудительная синхронизация (только отправка)
    async forceSync() {
        if (!this.isOnline) {
            alert('Сервер недоступен. Работаем в автономном режиме.');
            return false;
        }
        
        try {
            const indicator = document.createElement('div');
            indicator.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: white; padding: 20px; border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10001;
                text-align: center;
            `;
            indicator.innerHTML = `
                <div style="font-size: 24px; margin-bottom: 10px;">🔄</div>
                <div>Отправка данных на сервер...</div>
            `;
            document.body.appendChild(indicator);
            
            const success = await this.saveToServer();
            indicator.remove();
            
            if (success) {
                alert('✅ Данные отправлены на сервер');
                return true;
            } else {
                alert('❌ Ошибка отправки данных');
                return false;
            }
        } catch (error) {
            console.error('Ошибка синхронизации:', error);
            alert('❌ Ошибка синхронизации');
            return false;
        }
    }
    
    getConnectionStatus() {
        return {
            online: this.isOnline,
            syncInProgress: false
        };
    }
}

// Создаем глобальный экземпляр сервиса
window.APIService = new APIService();
