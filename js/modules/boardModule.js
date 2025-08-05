// Простая тестовая версия BoardModule для отладки
console.log('🚀 Начинаем загрузку BoardModule...');

const BoardModule = {
    // Простая функция для тестирования
    test() {
        console.log('✅ BoardModule.test() работает!');
        return 'BoardModule работает';
    },

    // Показать доску процессов (упрощенная версия)
    showProcessBoard() {
        console.log('📋 BoardModule.showProcessBoard() вызвана');
        
        const mainContent = document.getElementById('mainContent');
        if (!mainContent) {
            console.error('❌ mainContent не найден');
            return;
        }

        try {
            // Проверяем что данные загружены
            const orders = DataManager.getOrders();
            const processes = DataManager.getProcesses();
            const products = DataManager.getProducts();
            
            console.log(`📊 Данные: процессов=${processes.length}, заказов=${orders.length}, изделий=${products.length}`);
            
            if (!orders || !processes || !products) {
                mainContent.innerHTML = `
                    <div class="board-container" style="padding: 40px; text-align: center;">
                        <div style="font-size: 24px; margin-bottom: 10px;">🔄</div>
                        <div>Загрузка данных...</div>
                        <div style="margin-top: 10px; font-size: 12px; color: #666;">
                            Ожидание синхронизации с сервером...
                        </div>
                    </div>
                `;
                return;
            }

            const user = DataManager.getCurrentUser();
            if (!user) {
                console.error('❌ Текущий пользователь не найден');
                return;
            }

            const canCreate = user.isAdmin || user.canCreateOrders;
            
            // Простая доска процессов
            mainContent.innerHTML = `
                <div class="board-container">
                    ${canCreate ? `
                        <div class="board-header" style="padding: 20px; background: #f8f9fa; margin-bottom: 20px;">
                            <button class="btn btn-primary" onclick="alert('Функция создания заказов временно недоступна')">
                                Добавить заказ
                            </button>
                            <div class="board-stats" style="margin-top: 10px;">
                                <span>Всего заказов: ${orders.length}</span>
                                <span style="margin-left: 20px;">В работе: ${orders.filter(o => o.currentProcessId).length}</span>
                                <span style="margin-left: 20px;">Завершено: ${orders.filter(o => !o.currentProcessId).length}</span>
                            </div>
                        </div>
                    ` : ''}
                    <div class="process-board" style="padding: 20px;">
                        <h3>🏗️ Доска процессов (упрощенная версия)</h3>
                        <p>Пользователь: <strong>${user.name}</strong> ${user.isAdmin ? '(Администратор)' : ''}</p>
                        <p>Процессов в системе: <strong>${processes.length}</strong></p>
                        <p>Заказов в системе: <strong>${orders.length}</strong></p>
                        <p>Изделий в системе: <strong>${products.length}</strong></p>
                        
                        ${processes.length > 0 ? `
                            <div style="margin-top: 30px;">
                                <h4>Процессы:</h4>
                                <ul>
                                    ${processes.map(p => `<li>${p.name} (ID: ${p.id})</li>`).join('')}
                                </ul>
                            </div>
                        ` : `
                            <div style="margin-top: 30px; padding: 20px; background: #fff3cd; border-radius: 5px;">
                                <p><strong>⚠️ Нет процессов</strong></p>
                                <p>Создайте процессы в админ панели для отображения полной доски.</p>
                            </div>
                        `}
                        
                        ${orders.length > 0 ? `
                            <div style="margin-top: 30px;">
                                <h4>Заказы:</h4>
                                <ul>
                                    ${orders.slice(0, 5).map(o => `<li>№${o.number} - ${o.customerName}</li>`).join('')}
                                    ${orders.length > 5 ? `<li>... и еще ${orders.length - 5} заказов</li>` : ''}
                                </ul>
                            </div>
                        ` : `
                            <div style="margin-top: 30px; padding: 20px; background: #d1ecf1; border-radius: 5px;">
                                <p><strong>📋 Нет заказов</strong></p>
                                <p>Создайте первый заказ для начала работы.</p>
                            </div>
                        `}
                        
                        <div style="margin-top: 30px; padding: 15px; background: #f1f3f4; border-radius: 5px; font-size: 14px;">
                            <strong>ℹ️ Информация:</strong> Это упрощенная версия доски процессов для отладки. 
                            Полная версия будет восстановлена после устранения ошибок.
                        </div>
                    </div>
                </div>
            `;
            
            console.log('✅ Упрощенная доска процессов отображена');
            
        } catch (error) {
            console.error('❌ Ошибка в showProcessBoard:', error);
            mainContent.innerHTML = `
                <div style="padding: 20px; color: red; text-align: center;">
                    <h3>❌ Ошибка отображения доски процессов</h3>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" style="margin-top: 15px; padding: 10px 15px;">
                        Перезагрузить страницу
                    </button>
                </div>
            `;
        }
    },

    // Показать детали заказа (заглушка)
    showOrderDetails(orderId) {
        console.log('📄 showOrderDetails вызвана для заказа:', orderId);
        alert(`Детали заказа ${orderId} (функция в разработке)`);
    }
};

console.log('✅ BoardModule определен, экспортируем в window...');
window.BoardModule = BoardModule;
console.log('🎉 BoardModule успешно загружен!');

// Тестируем сразу после загрузки
if (typeof window.BoardModule !== 'undefined') {
    console.log('✅ window.BoardModule доступен');
    console.log('✅ BoardModule.showProcessBoard:', typeof BoardModule.showProcessBoard);
} else {
    console.error('❌ window.BoardModule НЕ доступен после экспорта!');
}
