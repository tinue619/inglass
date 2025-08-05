// Главный модуль приложения
const AppModule = {
    // Показать главное приложение
    showMainApp() {
        console.log('Показываем главное приложение для пользователя:', DataManager.getCurrentUser().name);
        
        const app = document.getElementById('app');
        if (!app) {
            console.error('Элемент app не найден');
            return;
        }
        
        try {
            const currentUser = DataManager.getCurrentUser();
            
            app.innerHTML = `
                <div id="mainApp" style="display: block;">
                    <header class="header">
                        <div class="header-logo">
                            <img src="assets/logo.svg" alt="Logo" onerror="this.src='assets/logo-placeholder.svg'">
                            <img src="assets/name.svg" alt="Company Name" onerror="this.src='assets/name-placeholder.svg'" style="height: 24px;">
                        </div>
                        <div class="header-actions">
                            <div class="sync-status" id="syncStatus">
                                <button class="btn btn-secondary btn-small" onclick="APIService.forceSync()" title="Ручная синхронизация">
                                    🔄 Синхронизация
                                </button>
                            </div>
                            <div class="user-info">
                                <span>👤 ${currentUser.name}</span>
                            </div>
                            ${currentUser.isAdmin ? 
                            `<button class="btn btn-secondary btn-small" onclick="AdminModule.showAdminPanel()">
                            Админ панель
                            </button>` : ''
                        }
                            <button class="btn btn-secondary btn-small" onclick="AppModule.showProcessBoard()">
                                Процессы
                            </button>
                            <button class="btn btn-danger btn-small" onclick="AuthModule.logout()">
                                Выйти
                            </button>
                        </div>
                    </header>
                    <main id="mainContent">
                        <div style="padding: 20px;">
                            <h3>Загрузка...</h3>
                        </div>
                    </main>
                </div>
            `;
            
            // По умолчанию показываем доску процессов только после загрузки данных
            setTimeout(() => {
                try {
                    // Проверяем что данные действительно загружены
                    const processes = DataManager.getProcesses();
                    const orders = DataManager.getOrders();
                    
                    console.log(`Данные для UI: процессов=${processes.length}, заказов=${orders.length}`);
                    
                    if (processes !== undefined && orders !== undefined) {
                        this.showProcessBoard();
                    } else {
                        console.warn('Данные ещё не загружены, ждём...');
                        // Пробуем ещё раз через секунду
                        setTimeout(() => {
                            this.showProcessBoard();
                        }, 1000);
                    }
                } catch (error) {
                    console.error('Ошибка при показе доски процессов:', error);
                    document.getElementById('mainContent').innerHTML = `
                        <div style="padding: 20px;">
                            <h3>Ошибка загрузки доски процессов</h3>
                            <p>${error.message}</p>
                            <button onclick="AppModule.showProcessBoard()">Попробовать снова</button>
                        </div>
                    `;
                }
            }, 500); // Увеличиваем задержку до 500ms
            
        } catch (error) {
            console.error('Ошибка при создании интерфейса:', error);
            app.innerHTML = `
                <div style="padding: 20px; color: red;">
                    <h2>Ошибка интерфейса</h2>
                    <p>${error.message}</p>
                    <button onclick="AuthModule.logout()">Выйти</button>
                </div>
            `;
        }
    },

    // Метод для показа доски процессов (через AppModule)
    showProcessBoard() {
        console.log('📋 Показываем доску процессов через AppModule');
        
        if (typeof BoardModule !== 'undefined' && BoardModule.showProcessBoard) {
            try {
                BoardModule.showProcessBoard();
            } catch (error) {
                console.error('❌ Ошибка показа доски:', error);
                alert('Ошибка показа доски процессов: ' + error.message);
            }
        } else {
            console.error('❌ BoardModule не загружен!');
            alert('Модуль доски не загружен. Перезагрузите страницу.');
        }
    },

    // Инициализация приложения
    async init() {
        console.log('App started');
        
        try {
            // Загружаем данные (асинхронно с сервера или из кэша)
            await DataManager.load();
            
            // Пытаемся загрузить текущего пользователя
            if (DataManager.loadCurrentUser()) {
                console.log('Пользователь найден, показываем главное приложение');
                this.showMainApp();
            } else {
                console.log('Пользователь не найден, показываем экран входа');
                AuthModule.showLoginScreen();
            }
        } catch (error) {
            console.error('Ошибка при запуске приложения:', error);
            document.getElementById('app').innerHTML = `
                <div style="padding: 20px; color: red;">
                    <h2>Ошибка запуска</h2>
                    <p>${error.message}</p>
                    <button onclick="location.reload()">Перезагрузить</button>
                </div>
            `;
        }
    },

    // Обработчики событий окна
    initWindowEvents() {
        // Обработка изменения размера окна
        window.addEventListener('resize', () => {
            try {
                if (document.getElementById('processBoard')) {
                    BoardModule.renderProcessBoard();
                }
            } catch (error) {
                console.error('Ошибка при изменении размера:', error);
            }
        });

        // Автосохранение при закрытии окна
        window.addEventListener('beforeunload', () => {
            try {
                DataManager.save();
            } catch (error) {
                console.error('Ошибка при сохранении:', error);
            }
        });
    }
};

window.AppModule = AppModule;

// Совместимость с legacy кодом
window.showMainApp = () => AppModule.showMainApp();
