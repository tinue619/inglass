// Сервис для работы с API сервера
class APIService {
    constructor() {
        this.baseUrl = 'http://localhost:3001/api';
        this.isOnline = false;
        this.syncInProgress = false;
        this.lastSyncTime = null;
        
        // Проверяем доступность сервера при инициализации
        this.checkServerStatus();
        
        // Периодически проверяем статус сервера
        setInterval(() => this.checkServerStatus(), 30000); // каждые 30 секунд
    }
    
    // Проверка доступности сервера
    async checkServerStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    if (!this.isOnline) {
                        console.log('🟢 Сервер доступен, подключение установлено');
                        this.isOnline = true;
                        this.showConnectionStatus(true);
                        
                        // Автоматическая синхронизация при восстановлении соединения
                        this.autoSync();
                    }
                    return true;
                }
            }
        } catch (error) {
            if (this.isOnline) {
                console.log('🔴 Сервер недоступен, работаем в автономном режиме');
                this.isOnline = false;
                this.showConnectionStatus(false);
            }
        }
        return false;
    }
    
    // Показать статус соединения в UI
    showConnectionStatus(online) {
        // Удаляем предыдущий индикатор если есть
        const existingIndicator = document.querySelector('.connection-status');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Создаем новый индикатор
        const indicator = document.createElement('div');
        indicator.className = `connection-status ${online ? 'online' : 'offline'}`;
        indicator.textContent = online ? '🟢 Онлайн' : '🟡 Автономно';
        
        document.body.appendChild(indicator);
        
        // Автоматически скрываем через 3 секунды если онлайн
        if (online) {
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.style.opacity = '0';
                    setTimeout(() => indicator.remove(), 300);
                }
            }, 3000);
        }
    }
    
    // Автоматическая синхронизация
    async autoSync() {
        if (this.isOnline && !this.syncInProgress) {
            try {
                // Получаем данные с сервера
                const serverData = await this.getData();
                if (serverData) {
                    // Проверяем нужна ли синхронизация
                    const localLastSync = localStorage.getItem('lastSyncTime');
                    const serverLastSync = serverData.lastSync;
                    
                    if (!localLastSync || new Date(serverLastSync) > new Date(localLastSync)) {
                        console.log('📥 Загружаем данные с сервера...');
                        await this.loadFromServer();
                    } else {
                        console.log('📤 Отправляем локальные данные на сервер...');
                        await this.saveToServer();
                    }
                }
            } catch (error) {
                console.error('Ошибка автосинхронизации:', error);
            }
        }
    }
    
    // Получить все данные с сервера
    async getData() {
        if (!this.isOnline) return null;
        
        try {
            const response = await fetch(`${this.baseUrl}/data`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                return result.success ? result.data : null;
            }
        } catch (error) {
            console.error('Ошибка получения данных:', error);
            this.isOnline = false;
        }
        return null;
    }
    
    // Сохранить все данные на сервер
    async saveData(data) {
        if (!this.isOnline) return false;
        
        try {
            const response = await fetch(`${this.baseUrl}/data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.lastSyncTime = new Date().toISOString();
                    localStorage.setItem('lastSyncTime', this.lastSyncTime);
                    return true;
                }
            }
        } catch (error) {
            console.error('Ошибка сохранения данных:', error);
            this.isOnline = false;
        }
        return false;
    }
    
    // Загрузить данные с сервера в DataManager
    async loadFromServer() {
        if (this.syncInProgress) return false;
        
        this.syncInProgress = true;
        
        try {
            const serverData = await this.getData();
            if (serverData) {
                // Обновляем DataManager
                DataManager._data.users = serverData.users || [APP_CONSTANTS.DEFAULTS.ADMIN_USER];
                DataManager._data.processes = serverData.processes || [];
                DataManager._data.products = serverData.products || [];
                DataManager._data.orders = serverData.orders || [];
                
                // Проверяем админа
                const admin = DataManager._data.users.find(u => u.isAdmin);
                if (!admin) {
                    DataManager._data.users.unshift(APP_CONSTANTS.DEFAULTS.ADMIN_USER);
                }
                
                // Сохраняем в localStorage
                DataManager.save();
                this.lastSyncTime = serverData.lastSync;
                localStorage.setItem('lastSyncTime', this.lastSyncTime);
                
                console.log('✅ Данные загружены с сервера');
                
                // Обновляем UI если нужно
                if (window.BoardModule && typeof BoardModule.renderBoard === 'function') {
                    BoardModule.renderBoard();
                }
                
                return true;
            }
        } catch (error) {
            console.error('Ошибка загрузки с сервера:', error);
        } finally {
            this.syncInProgress = false;
        }
        
        return false;
    }
    
    // Отправить локальные данные на сервер
    async saveToServer() {
        if (this.syncInProgress) return false;
        
        this.syncInProgress = true;
        
        try {
            const localData = {
                users: DataManager._data.users,
                processes: DataManager._data.processes,
                products: DataManager._data.products,
                orders: DataManager._data.orders
            };
            
            const success = await this.saveData(localData);
            if (success) {
                console.log('✅ Данные сохранены на сервер');
                return true;
            }
        } catch (error) {
            console.error('Ошибка отправки на сервер:', error);
        } finally {
            this.syncInProgress = false;
        }
        
        return false;
    }
    
    // Принудительная синхронизация
    async forceSync() {
        if (!this.isOnline) {
            alert('Сервер недоступен. Работаем в автономном режиме.');
            return false;
        }
        
        if (this.syncInProgress) {
            alert('Синхронизация уже выполняется...');
            return false;
        }
        
        try {
            // Показываем индикатор загрузки
            const indicator = document.createElement('div');
            indicator.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10001;
            `;
            indicator.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 24px; margin-bottom: 10px;">🔄</div>
                    <div>Синхронизация данных...</div>
                </div>
            `;
            document.body.appendChild(indicator);
            
            // Отправляем данные на сервер
            const success = await this.saveToServer();
            
            // Убираем индикатор
            indicator.remove();
            
            if (success) {
                alert('✅ Синхронизация завершена успешно');
                return true;
            } else {
                alert('❌ Ошибка синхронизации');
                return false;
            }
        } catch (error) {
            console.error('Ошибка принудительной синхронизации:', error);
            alert('❌ Ошибка синхронизации');
            return false;
        }
    }
    
    // Получить статус соединения
    getConnectionStatus() {
        return {
            online: this.isOnline,
            lastSync: this.lastSyncTime,
            syncInProgress: this.syncInProgress
        };
    }
}

// Создаем глобальный экземпляр сервиса
window.APIService = new APIService();
