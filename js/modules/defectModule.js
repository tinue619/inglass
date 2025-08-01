// Глобальная функция для устранения брака
window.fixDefectOrderGlobal = function(orderId, comment) {
    console.log('🔧 fixDefectOrderGlobal вызвана:', { orderId, comment });
    
    try {
        const order = DataManager.findOrder(orderId);
        if (!order || !order.defectInfo || !order.defectInfo.isDefective) {
            console.error('❌ Заказ не найден или не в браке:', order);
            alert('Заказ не найден или не в браке');
            return;
        }
        
        console.log('📋 Начинаем устранение брака для заказа:', order.number);
        
        const currentProcess = DataManager.findProcess(order.currentProcessId);
        const originalProcess = DataManager.findProcess(order.defectInfo.originalProcessId);
        
        console.log('🔄 Перемещаем с:', {
            от: currentProcess?.name || 'Неизвестно',
            к: originalProcess?.name || 'Неизвестно',
            currentProcessId: order.currentProcessId,
            originalProcessId: order.defectInfo.originalProcessId
        });
        
        // Возвращаем на исходный этап
        order.currentProcessId = order.defectInfo.originalProcessId;
        
        // Обновляем информацию о браке
        order.defectInfo.isDefective = false;
        order.defectInfo.fixedDate = new Date().toISOString();
        order.defectInfo.fixedUser = DataManager.getCurrentUser() ? DataManager.getCurrentUser().name : 'Неизвестный пользователь';
        order.defectInfo.fixComment = comment;
        
        console.log('💾 Обновленная информация о браке:', order.defectInfo);
        
        // Добавляем событие в историю
        DataManager.addOrderHistoryEvent(orderId, APP_CONSTANTS.EVENT_TYPES.DEFECT_FIXED, {
            currentUser: DataManager.getCurrentUser(),
            fromProcess: currentProcess ? { id: currentProcess.id, name: currentProcess.name } : null,
            toProcess: originalProcess ? { id: originalProcess.id, name: originalProcess.name } : null,
            comment: comment // Комментарий об устранении
        });
        
        // Принудительно сохраняем данные
        DataManager.save();
        
        console.log('✅ Брак устранен для заказа:', order.number);
        
        alert(`✅ Брак устранен. Заказ №${order.number} возвращен на этап "${originalProcess ? originalProcess.name : 'Неизвестно'}".`);
        
        // Обновляем доску
        if (typeof BoardModule.renderProcessBoard === 'function') {
            BoardModule.renderProcessBoard();
        }
        
    } catch (error) {
        console.error('❌ Ошибка устранения брака:', error);
        alert('Ошибка устранения брака: ' + error.message);
    }
};

// Модуль управления браком
const DefectModule = {
    // Тестовая функция
    testDefectFunction() {
        console.log('✅ Тестовая функция работает!');
        alert('Тестовая функция вызвана успешно!');
    },

    // Показать модальное окно отправки в брак (для админов)
    showDefectModal(orderId) {
        console.log('🎯 showDefectModal вызвана для заказа:', orderId);
        
        try {
            const order = DataManager.findOrder(orderId);
            if (!order) {
                alert('❌ Заказ не найден с ID: ' + orderId);
                return;
            }
            
            console.log('📋 Найден заказ:', order);
            
            const product = DataManager.findProduct(order.productId);
            if (!product) {
                alert('❌ Изделие не найдено для заказа');
                return;
            }
            
            console.log('🔨 Найдено изделие:', product);
            
            // Получаем доступные процессы
            const availableProcesses = product.processes
                .filter(processId => processId !== order.currentProcessId)
                .map(processId => DataManager.findProcess(processId))
                .filter(process => process)
                .sort((a, b) => a.order - b.order);
            
            console.log('⚙️ Доступные процессы для брака:', availableProcesses);
            
            if (availableProcesses.length === 0) {
                alert('❌ Нет доступных этапов для отправки в брак');
                return;
            }
            
            const currentProcess = DataManager.findProcess(order.currentProcessId);
            
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
            
            ModalModule.show('Отправка в брак', form, () => {
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
                
                this.sendOrderToDefect(orderId, targetProcessId, reason, false);
                
                // Обновляем доску если функция доступна
                if (typeof BoardModule.renderProcessBoard === 'function') {
                    BoardModule.renderProcessBoard();
                }
                
                return true;
            });
            
        } catch (error) {
            console.error('❌ Ошибка в showDefectModal:', error);
            alert('Ошибка: ' + error.message);
        }
    },

    // Отправка заказа в брак
    sendOrderToDefect(orderId, targetProcessId, reason, isReject = false) {
        console.log('📤 sendOrderToDefect вызвана:', { orderId, targetProcessId, reason, isReject });
        console.log('🔍 Подробная отладка:', {
            targetProcessIdType: typeof targetProcessId,
            targetProcessIdValue: targetProcessId,
            isTargetProcessIdValid: targetProcessId && !isNaN(targetProcessId) && targetProcessId > 0
        });
        
        try {
            const order = DataManager.findOrder(orderId);
            if (!order) {
                alert('Заказ не найден');
                return;
            }
            
            const currentProcess = DataManager.findProcess(order.currentProcessId);
            
            // Если это отбраковка (reject) - перемещаем на предыдущий этап
            // Если это отправка в брак для исправления - перемещаем на другой этап
            let targetProcess;
            let newProcessId;
            
            if (isReject) {
                // При отбраковке перемещаем на выбранный этап
                newProcessId = targetProcessId;
                targetProcess = DataManager.findProcess(targetProcessId);
                console.log('🚫 Отбраковка: перемещаем на этап "' + (targetProcess?.name || 'Неизвестно') + '"');
            } else {
                newProcessId = targetProcessId;
                targetProcess = DataManager.findProcess(targetProcessId);
            }
            
            // Сохраняем информацию о браке
            if (!order.defectInfo) {
                order.defectInfo = {};
            }
            
            // При отбраковке сохраняем ИСХОДНЫЙ процесс (тот, на котором был заказ ДО отбраковки)
            if (isReject) {
                // При отбраковке originalProcessId должен быть процессом, с которого отбраковали
                // НО только если мы еще не в браке
                if (!order.defectInfo.isDefective) {
                    order.defectInfo.originalProcessId = order.currentProcessId;
                    console.log('💾 Сохраняем originalProcessId при отбраковке:', order.currentProcessId);
                } else {
                    console.log('⚠️ Заказ уже в браке, не изменяем originalProcessId:', order.defectInfo.originalProcessId);
                }
            } else {
                // При отправке в брак для исправления тоже сохраняем текущий процесс
                if (!order.defectInfo.isDefective) {
                    order.defectInfo.originalProcessId = order.currentProcessId;
                    console.log('💾 Сохраняем originalProcessId при отправке в брак:', order.currentProcessId);
                }
            }
            
            order.defectInfo.isDefective = true;
            order.defectInfo.defectReason = reason;
            order.defectInfo.defectDate = new Date().toISOString();
            order.defectInfo.defectUser = DataManager.getCurrentUser() ? DataManager.getCurrentUser().name : 'Неизвестный пользователь';
            order.defectInfo.defectFromProcess = currentProcess ? currentProcess.name : 'Неизвестно';
            order.defectInfo.isRejected = isReject; // Флаг отбраковки
            
            console.log('💾 Информация о браке сохранена:', order.defectInfo);
            
            // Перемещаем заказ на нужный этап
            const oldProcessId = order.currentProcessId;
            order.currentProcessId = newProcessId;
            
            console.log('🔄 Перемещение заказа:', {
                заказ: order.number,
                старый_этап: oldProcessId,
                новый_этап: newProcessId,
                имя_старого_этапа: currentProcess?.name,
                имя_нового_этапа: targetProcess?.name,
                заказ_после_изменения: {
                    id: order.id,
                    currentProcessId: order.currentProcessId,
                    isDefective: order.defectInfo?.isDefective
                }
            });
            
            // Добавляем событие в историю с соответствующим типом
            const eventType = isReject ? APP_CONSTANTS.EVENT_TYPES.DEFECT_SENT : APP_CONSTANTS.EVENT_TYPES.DEFECT_SENT;
            DataManager.addOrderHistoryEvent(orderId, eventType, {
                currentUser: DataManager.getCurrentUser(),
                fromProcess: currentProcess ? { id: currentProcess.id, name: currentProcess.name } : null,
                toProcess: targetProcess ? { id: targetProcess.id, name: targetProcess.name } : null,
                reason: reason,
                isDefect: true
            });
            
            console.log('✅ Заказ отправлен в брак:', order);
            
            // Принудительно сохраняем данные
            DataManager.save();
            
            // Не показываем alert здесь, это делается в вызывающей функции
            
        } catch (error) {
            console.error('❌ Ошибка в sendOrderToDefect:', error);
            alert('Ошибка отправки в брак: ' + error.message);
        }
    },

    // Показать модальное окно устранения брака
    showDefectFixModal(orderId) {
        console.log('🔧 showDefectFixModal вызвана для заказа:', orderId);
        
        const order = DataManager.findOrder(orderId);
        if (!order || !order.defectInfo || !order.defectInfo.isDefective) {
            alert('Заказ не найден или не в браке');
            return;
        }
        
        console.log('📋 Найден заказ в браке:', order);
        
        const form = `
            <div style="margin-bottom: 16px; padding: 12px; background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px;">
                <strong>🔧 Устранение брака</strong><br>
                <small>Заказ вернется на этап "${order.defectInfo.defectFromProcess}" после устранения</small>
            </div>
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 4px; font-weight: bold;">Первоначальная проблема:</label>
                <div style="padding: 8px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; color: #6c757d;">
                    ${order.defectInfo.defectReason || 'Не указана'}
                </div>
            </div>
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 4px; font-weight: bold;">Комментарий об устранении:</label>
                <textarea id="fix-comment" style="width: 100%; height: 80px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; resize: vertical;" placeholder="Опишите что было сделано для устранения проблемы..." required></textarea>
            </div>
            <div style="text-align: center; margin-top: 20px;">
                <button type="button" class="btn btn-success" onclick="
                    const comment = document.getElementById('fix-comment').value.trim();
                    if (!comment) {
                        alert('Опишите что было сделано для устранения');
                        return;
                    }
                    console.log('🚀 Нажата кнопка устранения брака');
                    window.fixDefectOrderGlobal(${orderId}, comment);
                    ModalModule.close();
                " style="padding: 10px 20px;">
                    🔧 Устранить брак
                </button>
                <button type="button" class="btn btn-secondary" onclick="ModalModule.close();" style="padding: 10px 20px; margin-left: 10px;">
                    Отмена
                </button>
            </div>
        `;
        
        console.log('🎨 Показываем модальное окно устранения брака...');
        
        // Просто показываем модальное окно без callback
        ModalModule.show('Устранение брака', form);
    },

    // Устранение брака заказа
    fixDefectOrder(orderId, comment) {
        console.log('🔧 fixDefectOrder вызвана:', { orderId, comment });
        
        try {
            const order = DataManager.findOrder(orderId);
            if (!order || !order.defectInfo || !order.defectInfo.isDefective) {
                console.error('❌ Заказ не найден или не в браке:', order);
                alert('Заказ не найден или не в браке');
                return;
            }
            
            console.log('📋 Начинаем устранение брака для заказа:', order.number);
            
            const currentProcess = DataManager.findProcess(order.currentProcessId);
            const originalProcess = DataManager.findProcess(order.defectInfo.originalProcessId);
            
            console.log('🔄 Перемещаем с:', {
                от: currentProcess?.name || 'Неизвестно',
                к: originalProcess?.name || 'Неизвестно',
                currentProcessId: order.currentProcessId,
                originalProcessId: order.defectInfo.originalProcessId,
                равны_ли: order.currentProcessId === order.defectInfo.originalProcessId
            });
            
            // Если процессы одинаковые - не перемещаем
            if (order.currentProcessId === order.defectInfo.originalProcessId) {
                console.log('⚠️ Предупреждение: Заказ уже на целевом этапе, перемещение не требуется');
            } else {
                // Возвращаем на исходный этап
                order.currentProcessId = order.defectInfo.originalProcessId;
                console.log('✅ Заказ перемещен на этап:', order.currentProcessId);
            }
            
            // Обновляем информацию о браке
            order.defectInfo.isDefective = false;
            order.defectInfo.fixedDate = new Date().toISOString();
            order.defectInfo.fixedUser = DataManager.getCurrentUser() ? DataManager.getCurrentUser().name : 'Неизвестный пользователь';
            order.defectInfo.fixComment = comment;
            
            console.log('💾 Обновленная информация о браке:', order.defectInfo);
            
            // Добавляем событие в историю
            DataManager.addOrderHistoryEvent(orderId, APP_CONSTANTS.EVENT_TYPES.DEFECT_FIXED, {
                currentUser: DataManager.getCurrentUser(),
                fromProcess: currentProcess ? { id: currentProcess.id, name: currentProcess.name } : null,
                toProcess: originalProcess ? { id: originalProcess.id, name: originalProcess.name } : null,
                comment: comment // Комментарий об устранении
            });
            
            // Принудительно сохраняем данные
            DataManager.save();
            
            console.log('✅ Брак устранен для заказа:', order);
            console.log('🔄 Финальное состояние заказа:', {
                id: order.id,
                number: order.number,
                currentProcessId: order.currentProcessId,
                isDefective: order.defectInfo.isDefective
            });
            alert(`✅ Брак устранен. Заказ №${order.number} возвращен на этап "${originalProcess ? originalProcess.name : 'Неизвестно'}".`);
            
        } catch (error) {
            console.error('❌ Ошибка устранения брака:', error);
            alert('Ошибка устранения брака: ' + error.message);
        }
    }
};

window.DefectModule = DefectModule;

// Совместимость с legacy кодом
window.showDefectModal = (orderId) => DefectModule.showDefectModal(orderId);
window.sendOrderToDefectSimple = (orderId, targetProcessId, reason) => DefectModule.sendOrderToDefect(orderId, targetProcessId, reason);
window.showDefectFixModal = (orderId) => DefectModule.showDefectFixModal(orderId);
window.testDefectFunction = () => DefectModule.testDefectFunction();
