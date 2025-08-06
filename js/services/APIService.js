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
                        
                        // При восстановлении соединения загружаем данные с сервера
                        await this.loadFromServer();
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
                headers: { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    const serverData = result.data;
                    
                    console.log('📊 Данные с сервера:', {
                        users: serverData.users?.length || 0,
                        processes: serverData.processes?.length || 0,
                        products: serverData.products?.length || 0,
                        orders: serverData.orders?.length || 0
                    });
                    
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
            console.log('Сервер недоступен, не можем создать сущность');
            return false;
        }
        
        try {
            console.log(`📤 Создаем ${entityType} на сервере:`, data);
            
            // Получаем текущие данные с сервера
            const currentDataResponse = await fetch(`${this.baseUrl}/${entityType}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!currentDataResponse.ok) {
                throw new Error(`Ошибка получения данных: ${currentDataResponse.status}`);
            }
            
            const currentResult = await currentDataResponse.json();
            let currentEntities = currentResult.success ? currentResult.data : [];
            
            // Добавляем новую сущность
            currentEntities.push(data);
            
            // Отправляем обновленные данные
            const response = await fetch(`${this.baseUrl}/${entityType}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentEntities)
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.log(`✅ ${entityType} создан на сервере`);
                    return data.id;
                }
            }
            
            console.warn(`⚠️ Не удалось создать ${entityType} на сервере`);
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
