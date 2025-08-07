// Сервис для работы с сервером - совместим с новым архитектурным ядром
class APIService {
    constructor() {
        this.baseUrl = this.getBaseUrl();
        this.isOnline = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        console.log('🌐 API Service инициализирован, базовый URL:', this.baseUrl);
        
        // Проверяем доступность сервера
        this.checkServerStatus();
        setInterval(() => this.checkServerStatus(), 15000); // каждые 15 секунд
    }
    
    getBaseUrl() {
        // Используем универсальную конфигурацию
        if (window.APP_CONFIG && typeof window.APP_CONFIG.getApiUrl === 'function') {
            return window.APP_CONFIG.getApiUrl();
        }
        
        // Fallback на старую логику
        const currentDomain = window.location.origin;
        if (currentDomain.includes('localhost') || currentDomain.includes('127.0.0.1')) {
            return 'http://localhost:3001/api';
        }
        return `${currentDomain}/api`;
    }
    
    async checkServerStatus() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                headers: { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    const wasOffline = !this.isOnline;
                    this.isOnline = true;
                    this.retryCount = 0;
                    
                    if (wasOffline) {
                        console.log('🟢 Сервер доступен, переключаемся в онлайн режим');
                        this.showConnectionStatus(true);
                        
                        // При восстановлении соединения синхронизируемся
                        if (window.App && window.App.initialized) {
                            await window.App.loadData();
                        }
                    }
                }
                return true;
            }
        } catch (error) {
            if (this.isOnline) {
                console.log('🔴 Сервер недоступен, переключаемся в автономный режим');
                this.isOnline = false;
                this.showConnectionStatus(false);
            }
        }
        return false;
    }
    
    showConnectionStatus(online) {
        // Удаляем старый индикатор
        const existingIndicator = document.querySelector('.connection-status');
        if (existingIndicator) existingIndicator.remove();
        
        // Обновляем кнопку синхронизации в шапке
        const syncIcon = document.getElementById('syncIcon');
        const syncText = document.getElementById('syncText');
        const syncButton = syncIcon?.parentElement;
        
        if (syncButton) {
            if (online) {
                syncButton.style.backgroundColor = '#d4edda';
                syncButton.style.borderColor = '#c3e6cb';
                syncButton.style.color = '#155724';
                syncButton.title = 'Подключение к серверу активно';
            } else {
                syncButton.style.backgroundColor = '#fff3cd';
                syncButton.style.borderColor = '#ffeaa7';
                syncButton.style.color = '#856404';
                syncButton.title = 'Автономный режим - сервер недоступен';
            }
        }
        
        // Показываем всплывающее уведомление только при изменении статуса
        if (online && !this.lastNotificationWasOnline) {
            this.showPopupNotification('🟢 Подключение к серверу восстановлено', '#d4edda');
            this.lastNotificationWasOnline = true;
        } else if (!online && this.lastNotificationWasOnline !== false) {
            this.showPopupNotification('🔴 Потеряно подключение к серверу', '#f8d7da');
            this.lastNotificationWasOnline = false;
        }
    }
    
    showPopupNotification(message, bgColor) {
        const notification = document.createElement('div');
        notification.className = 'popup-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed; top: 70px; right: 20px; z-index: 1000;
            padding: 12px 16px; border-radius: 6px; font-size: 14px;
            background: ${bgColor}; border: 1px solid rgba(0,0,0,0.1);
            color: #333; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%); transition: transform 0.3s ease;
        `;
        document.body.appendChild(notification);
        
        // Плавное появление
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Автоматическое скрытие
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
    
    // Принудительная синхронизация - совместимо с новым ядром
    async forceSync() {
        if (!this.isOnline) {
            // Проверяем доступность сервера
            const serverAvailable = await this.checkServerStatus();
            if (!serverAvailable) {
                alert('Сервер недоступен. Данные работают только в автономном режиме.');
                return false;
            }
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
                <div>Синхронизация с сервером...</div>
            `;
            document.body.appendChild(indicator);
            
            let success = false;
            
            // Проверяем какое ядро используется
            if (window.App && window.App.initialized) {
                // Новое ядро
                const loadSuccess = await window.App.loadData();
                const saveSuccess = await window.App.saveData();
                success = loadSuccess || saveSuccess;
            } else if (window.DataManager) {
                // Fallback на старое API
                const loadSuccess = DataManager.loadFromServer ? await DataManager.loadFromServer() : false;
                const saveSuccess = DataManager.saveToServer ? await DataManager.saveToServer() : false;
                success = loadSuccess || saveSuccess;
            }
            
            indicator.remove();
            
            if (success) {
                alert('✅ Синхронизация завершена успешно');
                
                // Обновляем UI
                if (window.BoardModule && typeof BoardModule.renderBoard === 'function') {
                    BoardModule.renderBoard();
                }
                if (window.AdminModule && typeof AdminModule.renderProcesses === 'function') {
                    AdminModule.renderProcesses();
                }
                
                return true;
            } else {
                alert('⚠️ Синхронизация не удалась или данные не изменились');
                return false;
            }
        } catch (error) {
            console.error('Ошибка принудительной синхронизации:', error);
            alert('❌ Ошибка синхронизации');
            return false;
        }
    }
    
    getConnectionStatus() {
        return {
            online: this.isOnline,
            retryCount: this.retryCount,
            maxRetries: this.maxRetries
        };
    }
    
    // Для совместимости со старым кодом
    async loadFromServer() {
        if (window.App && window.App.initialized) {
            return await window.App.loadData();
        }
        return false;
    }
    
    async saveToServer() {
        if (window.App && window.App.initialized) {
            return await window.App.saveData();
        }
        return false;
    }
}

// Создаем глобальный экземпляр сервиса
window.APIService = new APIService();
