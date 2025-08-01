// ОТЛАДОЧНАЯ ВЕРСИЯ ФУНКЦИЙ БРАКА

console.log('🔧 Начинаем загрузку board_defect.js...');

// Тестовая функция для проверки
window.testDefectFunction = function() {
    console.log('✅ Тестовая функция работает!');
    alert('Тестовая функция вызвана успешно!');
};

// Упрощенная версия функции отправки в брак
window.showDefectModal = function(orderId) {
    console.log('🎯 showDefectModal вызвана для заказа:', orderId);
    
    try {
        // Проверяем данные - ищем data в разных местах
        let appData = null;
        if (window.data) {
            appData = window.data;
        } else if (typeof data !== 'undefined') {
            appData = data;
        } else {
            alert('❌ Ошибка: данные не найдены. Проверьте, что система инициализирована.');
            console.error('Данные недоступны. window.data:', typeof window.data, 'data:', typeof data);
            return;
        }
        
        const order = appData.orders.find(o => o.id === orderId);
        if (!order) {
            alert('❌ Заказ не найден с ID: ' + orderId);
            return;
        }
        
        console.log('📋 Найден заказ:', order);
        
        const product = appData.products.find(p => p.id === order.productId);
        if (!product) {
            alert('❌ Изделие не найдено для заказа');
            return;
        }
        
        console.log('🔨 Найдено изделие:', product);
        
        // Получаем доступные процессы
        const availableProcesses = product.processes
            .filter(processId => processId !== order.currentProcessId)
            .map(processId => appData.processes.find(p => p.id === processId))
            .filter(process => process)
            .sort((a, b) => a.order - b.order);
        
        console.log('⚙️ Доступные процессы для брака:', availableProcesses);
        
        if (availableProcesses.length === 0) {
            alert('❌ Нет доступных этапов для отправки в брак');
            return;
        }
        
        // Проверяем, есть ли функция showModal
        if (typeof window.showModal !== 'function' && typeof showModal !== 'function') {
            alert('❌ Функция showModal не найдена! Используем простой prompt...');
            
            // Упрощенный ввод данных
            const reason = prompt('Опишите проблему с заказом:');
            if (!reason) {
                alert('Описание проблемы обязательно');
                return;
            }
            
            const processNames = availableProcesses.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
            const processChoice = prompt(`Выберите этап для отправки (введите номер):\n${processNames}`);
            
            const processIndex = parseInt(processChoice) - 1;
            if (processIndex < 0 || processIndex >= availableProcesses.length) {
                alert('Неверный выбор этапа');
                return;
            }
            
            const targetProcess = availableProcesses[processIndex];
            
            // Вызываем отправку в брак
            window.sendOrderToDefectSimple(orderId, targetProcess.id, reason, appData);
            return;
        }
        
        // Если showModal доступен, используем его
        const currentProcess = appData.processes.find(p => p.id === order.currentProcessId);
        
        const form = `
            <div style="margin-bottom: 16px; padding: 12px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px;">
                <strong>⚠️ Отправка в брак</strong><br>
                <small>Заказ будет отправлен на выбранный этап для устранения проблемы</small>
            </div>
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 4px; font-weight: bold;">Описание проблемы:</label>
                <textarea id="defect-reason" style="width: 100%; height: 80px; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" placeholder="Подробно опишите что не так с заказом..."></textarea>
            </div>
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 4px; font-weight: bold;">Отправить на этап:</label>
                <select id="defect-process" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                    <option value="">Выберите этап...</option>
                    ${availableProcesses.map(process => 
                        `<option value="${process.id}">${process.name}</option>`
                    ).join('')}
                </select>
                <small style="color: #666; margin-top: 4px; display: block;">
                    💡 Заказ вернется на текущий этап "${currentProcess ? currentProcess.name : 'Неизвестно'}" после устранения
                </small>
            </div>
        `;
        
        console.log('🎨 Показываем модальное окно...');
        
        const modalFunction = window.showModal || showModal;
        modalFunction('Отправка в брак', form, () => {
            const reason = document.getElementById('defect-reason').value.trim();
            const targetProcessId = parseInt(document.getElementById('defect-process').value);
            
            console.log('💾 Попытка сохранения:', { reason, targetProcessId });
            
            if (!reason) {
                alert('Опишите проблему с заказом');
                return false;
            }
            
            if (!targetProcessId) {
                alert('Выберите этап для отправки');
                return false;
            }
            
            window.sendOrderToDefectSimple(orderId, targetProcessId, reason, appData);
            
            // Обновляем доску если функция доступна
            if (typeof renderProcessBoard === 'function') {
                renderProcessBoard();
            }
            
            return true;
        });
        
    } catch (error) {
        console.error('❌ Ошибка в showDefectModal:', error);
        alert('Ошибка: ' + error.message);
    }
};

// Упрощенная функция отправки в брак
window.sendOrderToDefectSimple = function(orderId, targetProcessId, reason, appData = null) {
    console.log('📤 sendOrderToDefectSimple вызвана:', { orderId, targetProcessId, reason });
    
    try {
        // Получаем данные
        if (!appData) {
            if (window.data) {
                appData = window.data;
            } else if (typeof data !== 'undefined') {
                appData = data;
            } else {
                alert('Данные не найдены');
                return;
            }
        }
        const order = appData.orders.find(o => o.id === orderId);
        if (!order) {
            alert('Заказ не найден');
            return;
        }
        
        const currentProcess = appData.processes.find(p => p.id === order.currentProcessId);
        const targetProcess = appData.processes.find(p => p.id === targetProcessId);
        
        // Сохраняем информацию о браке
        if (!order.defectInfo) {
            order.defectInfo = {};
        }
        
        order.defectInfo.originalProcessId = order.currentProcessId;
        order.defectInfo.isDefective = true;
        order.defectInfo.defectReason = reason;
        order.defectInfo.defectDate = new Date().toISOString();
        order.defectInfo.defectUser = appData.currentUser ? appData.currentUser.name : 'Неизвестный пользователь';
        order.defectInfo.defectFromProcess = currentProcess ? currentProcess.name : 'Неизвестно';
        
        // Перемещаем на указанный этап
        order.currentProcessId = targetProcessId;
        
        // Добавляем событие в историю если функция доступна
        if (typeof addOrderHistoryEvent === 'function') {
            addOrderHistoryEvent(orderId, 'defect_sent', {
                currentUser: appData.currentUser,
                fromProcess: currentProcess ? { id: currentProcess.id, name: currentProcess.name } : null,
                toProcess: targetProcess ? { id: targetProcess.id, name: targetProcess.name } : null,
                reason: reason
            });
        }
        
        // Сохраняем данные если функция доступна
        if (typeof saveData === 'function') {
            saveData();
        }
        
        console.log('✅ Заказ отправлен в брак:', order);
        alert(`✅ Заказ №${order.number} отправлен в брак на этап "${targetProcess ? targetProcess.name : 'Неизвестно'}" для устранения проблемы.`);
        
    } catch (error) {
        console.error('❌ Ошибка в sendOrderToDefectSimple:', error);
        alert('Ошибка отправки в брак: ' + error.message);
    }
};

console.log('✅ board_defect.js загружен успешно!');
console.log('🔍 Доступные функции брака:', {
    showDefectModal: typeof window.showDefectModal,
    sendOrderToDefectSimple: typeof window.sendOrderToDefectSimple,
    testDefectFunction: typeof window.testDefectFunction
});

// Тест автозапуска
setTimeout(() => {
    console.log('🚀 Проверка через 2 секунды...');
    console.log('Data доступна через window.data:', !!window.data);
    console.log('Data доступна как data:', typeof data !== 'undefined');
    console.log('showModal доступна:', typeof window.showModal, typeof showModal);
    
    // Пробуем найти данные
    let foundData = null;
    if (window.data) {
        foundData = 'window.data';
    } else if (typeof data !== 'undefined') {
        foundData = 'data';
    }
    console.log('🔍 Данные найдены в:', foundData);
}, 2000);
