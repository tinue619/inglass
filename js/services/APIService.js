// Сервис для работы с сервером как основным хранилищем данных
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
                    console.log('🟢 Сервер доступен, переключаемся в онлайн режим');
                    this.isOnline = true;
                    this.retryCount = 0;
                    this.showConnectionStatus(true);
                    
                    // При восстановлении соединения загружаем данные с сервера
                    await this.loadFromServer();
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
        const existingIndicator = document.querySelector('.connection-status');
        if (existingIndicator) existingIndicator.remove();
        
        const indicator = document.createElement('div');
        indicator.className = `connection-status ${online ? 'online' : 'offline'}`;
        indicator.textContent = online ? '🟢 Онлайн (Сервер)' : '🟡 Автономно (Кэш)';
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
    
    // Загрузить данные с сервера
    async loadFromServer() {
        try {
            if (!this.isOnline) {
                console.log('Сервер недоступен, используем локальный кэш');
                return false;
            }
            
            console.log('📥 Загружаем данные с сервера...');
            
            const response = await fetch(`${this.baseUrl}/data`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    const serverData = result.data;
                    
                    // Используем безопасный метод DataManager для обновления
                    const success = DataManager.updateFromServer(serverData);
                    
                    if (success) {
                        console.log('✅ Данные загружены с сервера');
                        console.log(`👥 Пользователей: ${DataManager.getUsers().length}`);
                        console.log(`⚙️ Процессов: ${DataManager.getProcesses().length}`);
                        console.log(`📦 Изделий: ${DataManager.getProducts().length}`);
                        console.log(`📋 Заказов: ${DataManager.getOrders().length}`);
                        
                        // Обновляем UI если нужно
                        if (window.BoardModule && typeof BoardModule.renderBoard === 'function') {
                            BoardModule.renderBoard();
                        }
                        
                        return true;
                    }
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки с сервера:', error);
            this.isOnline = false;
        }
        
        return false;
    }
    
    // Отправить данные на сервер
    async saveToServer() {
        if (!this.isOnline) {
            console.log('Сервер недоступен, данные сохранены только в кэш');
            return false;
        }
        
        try {
            console.log('📤 Отправляем данные на сервер...');
            
            const localData = {
                users: DataManager.getUsers(),
                processes: DataManager.getProcesses(),
                products: DataManager.getProducts(),
                orders: DataManager.getOrders()
            };
            
            const response = await fetch(`${this.baseUrl}/data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(localData)
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.log('✅ Данные отправлены на сервер');
                    this.retryCount = 0;
                    
                    // Обновляем кэш после успешной отправки
                    DataManager.saveToCache();
                    return true;
                }
            }
        } catch (error) {
            console.error('Ошибка отправки на сервер:', error);
            this.retryCount++;
            
            if (this.retryCount >= this.maxRetries) {
                this.isOnline = false;
                this.showConnectionStatus(false);
                console.log('Превышено количество попыток, переключаемся в автономный режим');
            }
        }
        
        return false;
    }
    
    // Принудительная синхронизация
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
            
            // Сначала загружаем актуальные данные с сервера
            const loadSuccess = await this.loadFromServer();
            
            // Затем отправляем локальные изменения на сервер
            const saveSuccess = await this.saveToServer();
            
            indicator.remove();
            
            if (loadSuccess && saveSuccess) {
                alert('✅ Синхронизация завершена успешно');
                return true;
            } else if (loadSuccess) {
                alert('✅ Данные загружены с сервера');
                return true;
            } else if (saveSuccess) {
                alert('✅ Данные отправлены на сервер');
                return true;
            } else {
                alert('⚠️ Частичная синхронизация или ошибка');
                return false;
            }
        } catch (error) {
            console.error('Ошибка принудительной синхронизации:', error);
            alert('❌ Ошибка синхронизации');
            return false;
        }
    }
    
    // Создать сущность на сервере
    async createEntity(entityType, data) {
        if (!this.isOnline) {
            return false;
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/${entityType}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                const result = await response.json();
                return result.success ? result.id : false;
            }
        } catch (error) {
            console.error(`Ошибка создания ${entityType}:`, error);
        }
        
        return false;
    }
    
    // Обновить сущность на сервере
    async updateEntity(entityType, id, data) {
        if (!this.isOnline) {
            return false;
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/${entityType}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                const result = await response.json();
                return result.success;
            }
        } catch (error) {
            console.error(`Ошибка обновления ${entityType}:`, error);
        }
        
        return false;
    }
    
    // Переместить заказ
    async moveOrder(orderId, processId, reason, isDefect, userName) {
        if (!this.isOnline) {
            return false;
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/orders/${orderId}/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    processId,
                    reason,
                    isDefect,
                    userName
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                return result.success;
            }
        } catch (error) {
            console.error('Ошибка перемещения заказа:', error);
        }
        
        return false;
    }
    
    getConnectionStatus() {
        return {
            online: this.isOnline,
            retryCount: this.retryCount,
            maxRetries: this.maxRetries
        };
    }
}

// Создаем глобальный экземпляр сервиса
window.APIService = new APIService();
