// Отображение доски процессов
function showProcessBoard() {
    console.log('Показываем доску процессов');
    
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) {
        console.error('mainContent не найден');
        return;
    }

    const user = data.currentUser;
    if (!user) {
        console.error('Текущий пользователь не найден');
        return;
    }

    const canCreate = user.isAdmin || user.canCreateOrders;
    
    try {
        mainContent.innerHTML = `
            <div class="board-container">
                ${canCreate ? `
                    <div class="board-header">
                        <button class="btn btn-primary" onclick="showAddOrderModal()">Добавить заказ</button>
                        <button class="btn btn-warning" onclick="if(typeof window.testDefectFunction === 'function') { window.testDefectFunction(); } else { alert('Тестовая функция не найдена'); }">🗋 Тест брака</button>
                        <div class="board-stats">
                            <span>Всего заказов: ${data.orders.length}</span>
                            <span>В работе: ${data.orders.filter(o => o.currentProcessId).length}</span>
                            <span>Завершено: ${data.orders.filter(o => !o.currentProcessId).length}</span>
                        </div>
                    </div>
                ` : ''}
                <div class="process-board" id="processBoard">
                    <div style="padding: 20px;">Загрузка процессов...</div>
                </div>
            </div>
        `;
        
        // Рендерим доску процессов с задержкой
        setTimeout(() => {
            try {
                renderProcessBoard();
            } catch (error) {
                console.error('Ошибка рендеринга доски процессов:', error);
                document.getElementById('processBoard').innerHTML = `
                    <div style="padding: 20px; color: red;">
                        <h3>Ошибка загрузки процессов</h3>
                        <p>${error.message}</p>
                        <button onclick="renderProcessBoard()">Попробовать снова</button>
                    </div>
                `;
            }
        }, 100);
        
    } catch (error) {
        console.error('Ошибка создания доски процессов:', error);
        mainContent.innerHTML = `
            <div style="padding: 20px; color: red;">
                <h3>Ошибка создания доски</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function renderProcessBoard() {
    console.log('Рендерим доску процессов');
    
    const processBoard = document.getElementById('processBoard');
    if (!processBoard) {
        console.error('processBoard не найден');
        return;
    }
    
    const user = data.currentUser;
    const isAdmin = user.isAdmin;
    
    try {
        // Получаем процессы, доступные пользователю
        const availableProcesses = isAdmin 
            ? data.processes 
            : data.processes.filter(p => user.processes.includes(p.id));
        
        console.log('Доступные процессы:', availableProcesses);
        
        // Сортируем процессы по порядку
        const sortedProcesses = availableProcesses.sort((a, b) => a.order - b.order);
        
        // Добавляем колонку "Завершено" в конец
        const allColumns = [...sortedProcesses];
        
        // Показываем колонку "Завершено" только если есть доступ к последнему процессу или если админ
        const hasAccessToLastProcess = isAdmin || data.processes.some(p => 
            user.processes.includes(p.id) && 
            data.products.some(prod => 
                prod.processes.length > 0 && 
                prod.processes[prod.processes.length - 1] === p.id
            )
        );
        
        if (hasAccessToLastProcess || isAdmin) {
            allColumns.push({ id: 0, name: 'Завершено', order: 9999 });
        }
        
        if (allColumns.length === 0) {
            processBoard.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #666;">
                    <h3>У вас нет доступа к процессам</h3>
                    <p>Обратитесь к администратору для настройки прав доступа</p>
                </div>
            `;
            return;
        }
        
        processBoard.innerHTML = allColumns.map(process => {
            // Получаем заказы для этого процесса
            let orders = data.orders.filter(order => {
                if (process.id === 0) {
                    return !order.currentProcessId;
                }
                return order.currentProcessId === process.id;
            });
            
            // Фильтруем заказы для обычных пользователей
            if (!isAdmin) {
                orders = orders.filter(order => {
                    const product = data.products.find(p => p.id === order.productId);
                    if (!product) return false;
                    
                    if (process.id === 0) {
                        const lastProcessId = product.processes[product.processes.length - 1];
                        return user.processes.includes(lastProcessId);
                    }
                    
                    return product.processes.includes(process.id);
                });
            }
            
            return `
                <div class="process-column" data-process-id="${process.id}">
                    <div class="process-header">
                        <div class="process-title">${process.name}</div>
                        <div class="process-count">${orders.length} заказов</div>
                    </div>
                    <div class="process-items" id="process-${process.id}">
                        ${orders.length > 0 ? 
                            orders.map(order => renderOrderCard(order, isAdmin)).join('') :
                            '<div class="empty-state">Нет заказов</div>'
                        }
                    </div>
                </div>
            `;
        }).join('');
        
        // Добавляем drag and drop для админа
        if (isAdmin) {
            try {
                initDragAndDrop();
            } catch (error) {
                console.error('Ошибка инициализации drag and drop:', error);
            }
        }
        
    } catch (error) {
        console.error('Ошибка рендеринга процессов:', error);
        processBoard.innerHTML = `
            <div style="padding: 20px; color: red;">
                <h3>Ошибка отображения процессов</h3>
                <p>${error.message}</p>
                <button onclick="renderProcessBoard()">Попробовать снова</button>
            </div>
        `;
    }
}

function renderOrderCard(order, isAdmin) {
    try {
        const product = data.products.find(p => p.id === order.productId);
        const isDefective = order.defectInfo && order.defectInfo.isDefective;
        
        let statusClass = 'status-process';
        if (!order.currentProcessId) {
            statusClass = 'status-done';
        } else if (isDefective) {
            statusClass = 'status-problem';
        }
        
        return `
            <div class="order-card ${statusClass}" 
                 data-order-id="${order.id}"
                 onclick="showOrderDetails(${order.id})"
                 ${isAdmin ? 'draggable="true"' : ''}>
                <div class="order-number">№${order.number}</div>
                <div class="order-customer">${order.customerName}</div>
                ${isDefective ? `
                    <div style="font-size: 12px; color: #dc3545; font-weight: 600; margin: 4px 0;">
                        БРАК: ${order.defectInfo.defectReason}
                    </div>
                ` : ''}
                <div class="order-created">
                    <small>${new Date(order.createdAt).toLocaleDateString('ru-RU')}</small>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Ошибка рендеринга карточки заказа:', error);
        return `
            <div class="order-card" style="border-left: 4px solid red;">
                <div>Ошибка отображения заказа №${order?.number || 'неизвестно'}</div>
            </div>
        `;
    }
}

function canUserMoveOrderForward(order, user) {
    if (!order.currentProcessId) return false;
    const product = data.products.find(p => p.id === order.productId);
    if (!product) return false;
    if (!user.processes.includes(order.currentProcessId)) return false;
    const currentIndex = product.processes.indexOf(order.currentProcessId);
    return currentIndex < product.processes.length - 1 || currentIndex === product.processes.length - 1;
}

function canUserMoveOrderBack(order, user) {
    if (!order.currentProcessId) {
        const product = data.products.find(p => p.id === order.productId);
        if (!product) return false;
        const lastProcessId = product.processes[product.processes.length - 1];
        return user.processes.includes(lastProcessId);
    }
    const product = data.products.find(p => p.id === order.productId);
    if (!product) return false;
    if (!user.processes.includes(order.currentProcessId)) return false;
    const currentIndex = product.processes.indexOf(order.currentProcessId);
    return currentIndex > 0;
}

function moveOrderForward(orderId) {
    try {
        const order = data.orders.find(o => o.id === orderId);
        if (!order) return;
        
        const product = data.products.find(p => p.id === order.productId);
        if (!product) return;
        
        const user = data.currentUser;
        
        if (!user.isAdmin && !canUserMoveOrderForward(order, user)) {
            alert('У вас нет прав для перемещения этого заказа');
            return;
        }
        
        const currentIndex = product.processes.indexOf(order.currentProcessId);
        let newProcessId;
        
        if (currentIndex < product.processes.length - 1) {
            newProcessId = product.processes[currentIndex + 1];
        } else {
            newProcessId = null;
        }
        
        moveOrderToProcess(orderId, newProcessId || 0);
        renderProcessBoard();
    } catch (error) {
        console.error('Ошибка перемещения заказа вперед:', error);
    }
}

function moveOrderBack(orderId) {
    try {
        const order = data.orders.find(o => o.id === orderId);
        if (!order) return;
        
        const product = data.products.find(p => p.id === order.productId);
        if (!product) return;
        
        const user = data.currentUser;
        
        if (!user.isAdmin && !canUserMoveOrderBack(order, user)) {
            alert('У вас нет прав для перемещения этого заказа');
            return;
        }
        
        let newProcessId;
        if (!order.currentProcessId) {
            newProcessId = product.processes[product.processes.length - 1];
        } else {
            const currentIndex = product.processes.indexOf(order.currentProcessId);
            if (currentIndex > 0) {
                newProcessId = product.processes[currentIndex - 1];
            } else {
                return; // Нельзя переместить дальше назад
            }
        }
        
        moveOrderToProcess(orderId, newProcessId);
        renderProcessBoard();
    } catch (error) {
        console.error('Ошибка перемещения заказа назад:', error);
    }
}

// Модальное окно добавления заказа
function showAddOrderModal() {
    console.log('Показываем модальное окно добавления заказа');
    
    if (data.products.length === 0) {
        alert('Сначала создайте изделия в админ панели');
        return;
    }
    
    const form = `
        <div class="form-group">
            <label>Номер заказа:</label>
            <input type="text" id="order-number" class="form-input" value="${generateOrderNumber()}">
        </div>
        <div class="form-group">
            <label>Изделие:</label>
            <select id="order-product" class="form-input">
                <option value="">Выберите изделие</option>
                ${data.products.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>Имя клиента:</label>
            <input type="text" id="order-customer" class="form-input">
        </div>
        <div class="form-group">
            <label>Телефон клиента:</label>
            <input type="text" id="order-phone" class="form-input">
        </div>
        <div id="custom-fields"></div>
        <button type="button" class="btn btn-secondary btn-small" onclick="addCustomField()">+ Добавить поле</button>
    `;
    
    showModal('Добавить заказ', form, () => {
        const number = document.getElementById('order-number').value.trim();
        const productId = parseInt(document.getElementById('order-product').value);
        const customerName = document.getElementById('order-customer').value.trim();
        const customerPhone = document.getElementById('order-phone').value.trim();
        
        if (!number || !productId || !customerName || !customerPhone) {
            alert('Заполните все обязательные поля');
            return false;
        }
        
        // Проверяем уникальность номера
        if (data.orders.some(o => o.number === number)) {
            alert('Заказ с таким номером уже существует');
            return false;
        }
        
        const product = data.products.find(p => p.id === productId);
        if (!product || product.processes.length === 0) {
            alert('У выбранного изделия нет процессов');
            return false;
        }
        
        // Собираем кастомные поля
        const customFields = {};
        document.querySelectorAll('.custom-field-row').forEach(row => {
            const key = row.querySelector('.custom-field-key').value.trim();
            const value = row.querySelector('.custom-field-value').value.trim();
            if (key && value) {
                customFields[key] = value;
            }
        });
        
        const newOrder = {
            id: Date.now(),
            number: number,
            productId: productId,
            customerName: customerName,
            customerPhone: customerPhone,
            currentProcessId: product.processes[0], // Первый процесс
            customFields: customFields,
            createdAt: new Date().toISOString(),
            history: []
        };
        
        data.orders.push(newOrder);
        
        // Добавляем событие создания в историю
        const firstProcess = data.processes.find(p => p.id === product.processes[0]);
        addOrderHistoryEvent(newOrder.id, 'created', {
            currentUser: data.currentUser,
            toProcess: { id: product.processes[0], name: firstProcess?.name || 'Неизвестный процесс' }
        });
        saveData();
        renderProcessBoard();
        
        console.log('Заказ добавлен:', newOrder);
        return true;
    });
}

// Генерация номера заказа
function generateOrderNumber() {
    const today = new Date();
    const dateStr = today.getFullYear().toString().substr(-2) + 
                   (today.getMonth() + 1).toString().padStart(2, '0') + 
                   today.getDate().toString().padStart(2, '0');
    
    const existingNumbers = data.orders
        .map(o => o.number)
        .filter(n => n.startsWith(dateStr))
        .map(n => parseInt(n.split('-')[1]) || 0);
    
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    
    return `${dateStr}-${nextNumber.toString().padStart(3, '0')}`;
}

// Добавление кастомного поля
function addCustomField() {
    const container = document.getElementById('custom-fields');
    if (!container) {
        console.error('Контейнер custom-fields не найден');
        return;
    }
    
    const fieldRow = document.createElement('div');
    fieldRow.className = 'custom-field-row';
    fieldRow.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
    
    fieldRow.innerHTML = `
        <input type="text" class="custom-field-key form-input" placeholder="Название поля" style="flex: 1;">
        <input type="text" class="custom-field-value form-input" placeholder="Значение" style="flex: 1;">
        <button type="button" class="btn btn-danger btn-small" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(fieldRow);
    console.log('Кастомное поле добавлено');
}

// Показать детали заказа
function showOrderDetails(orderId) {
    const order = data.orders.find(o => o.id === orderId);
    if (!order) {
        alert('Заказ не найден');
        return;
    }
    
    const product = data.products.find(p => p.id === order.productId);
    const currentProcess = order.currentProcessId ? 
        data.processes.find(p => p.id === order.currentProcessId) : null;
    
    // Создаем информацию о заказе
    const orderInfo = `
        <div class="order-details">
            <div class="order-detail-section">
                <h4>Основная информация</h4>
                <div class="detail-row">
                    <span class="detail-label">Номер заказа:</span>
                    <span class="detail-value"><strong>${order.number}</strong></span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Изделие:</span>
                    <span class="detail-value">${product ? product.name : 'Неизвестно'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Клиент:</span>
                    <span class="detail-value">${order.customerName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Телефон:</span>
                    <span class="detail-value"><a href="tel:${order.customerPhone}" style="color: #007bff; text-decoration: none;">${order.customerPhone}</a></span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Текущий процесс:</span>
                    <span class="detail-value status-indicator ${order.currentProcessId ? 'status-process' : 'status-done'}">
                        ${currentProcess ? currentProcess.name : 'Завершен'}
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Создан:</span>
                    <span class="detail-value">${new Date(order.createdAt).toLocaleDateString('ru-RU')} ${new Date(order.createdAt).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}</span>
                </div>
            </div>
            
            ${Object.keys(order.customFields || {}).length > 0 ? `
                <div class="order-detail-section">
                    <h4>Дополнительные поля</h4>
                    ${Object.entries(order.customFields || {}).map(([key, value]) => `
                        <div class="detail-row">
                            <span class="detail-label">${key}:</span>
                            <span class="detail-value">${value}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            <div class="order-detail-section">
                <h4>История заказа</h4>
                <div class="order-history">
                    ${order.history && order.history.length > 0 ? 
                        order.history
                            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                            .map(event => {
                                const date = new Date(event.timestamp);
                                const timeStr = date.toLocaleDateString('ru-RU') + ' ' + 
                                              date.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
                                
                                let eventText = '';
                                let eventClass = '';
                                
                                switch (event.type) {
                                    case 'created':
                                        eventText = `Заказ создан в процессе "${event.toProcess?.name || 'Неизвестно'}"`;
                                        eventClass = 'history-created';
                                        break;
                                    case 'moved':
                                        eventText = `Перемещен из "${event.fromProcess?.name || 'Неизвестно'}" в "${event.toProcess?.name || 'Завершен'}"`;
                                        eventClass = 'history-moved';
                                        break;
                                    case 'defect_sent':
                                        eventText = `Отправлен в брак с этапа "${event.fromProcess?.name || 'Неизвестно'}" на этап "${event.toProcess?.name || 'Неизвестно'}"`;
                                        if (event.reason) eventText += `<br><em>Причина: ${event.reason}</em>`;
                                        eventClass = 'history-defect';
                                        break;
                                    case 'defect_fixed':
                                        eventText = `Брак устранен, заказ возвращен с этапа "${event.fromProcess?.name || 'Неизвестно'}" на этап "${event.toProcess?.name || 'Неизвестно'}"`;
                                        if (event.reason) eventText += `<br><em>Комментарий: ${event.reason}</em>`;
                                        eventClass = 'history-fixed';
                                        break;
                                    default:
                                        eventText = 'Неизвестное событие';
                                        eventClass = 'history-unknown';
                                }
                                
                                return `
                                    <div class="history-event ${eventClass}">
                                        <div class="history-content">
                                            <div class="history-text">${eventText}</div>
                                            <div class="history-meta">
                                                ${timeStr} • ${event.user || 'Система'}
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('') :
                        '<div class="history-empty">История пуста</div>'
                    }
                </div>
            </div>
            
            ${data.currentUser.isAdmin || canUserMoveOrderForward(order, data.currentUser) || canUserMoveOrderBack(order, data.currentUser) || (order.defectInfo && order.defectInfo.isDefective) ? `
                <div class="order-detail-section">
                    <h4>Действия</h4>
                    <div class="order-actions">
                        ${order.defectInfo && order.defectInfo.isDefective ? 
                            `<button class="btn btn-success btn-small" onclick="showDefectFixModal(${order.id}); closeModal();">Устранить брак</button>` : 
                            `${data.currentUser.isAdmin || canUserMoveOrderBack(order, data.currentUser) ? 
                                `<button class="btn btn-secondary btn-small" onclick="moveOrderBack(${order.id}); closeModal(); renderProcessBoard();">Назад</button>` : ''}
                            ${data.currentUser.isAdmin || canUserMoveOrderForward(order, data.currentUser) ? 
                                `<button class="btn btn-primary btn-small" onclick="moveOrderForward(${order.id}); closeModal(); renderProcessBoard();">Вперед</button>` : ''}
                            ${order.currentProcessId && (data.currentUser.isAdmin || data.currentUser.processes.includes(order.currentProcessId)) ? 
                                `<button class="btn btn-warning btn-small" onclick="console.log('Кнопка брак нажата для заказа', ${order.id}); if(typeof window.showDefectModal === 'function') { window.showDefectModal(${order.id}); } else { alert('Функция showDefectModal не найдена! Тип: ' + typeof window.showDefectModal); } closeModal();">Брак</button>` : ''}`
                        }
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    showModal(`Заказ №${order.number}`, orderInfo, null);
}

function initDragAndDrop() {
    let draggedOrder = null;
    
    document.querySelectorAll('.order-card[draggable="true"]').forEach(card => {
        card.addEventListener('dragstart', (e) => {
            draggedOrder = parseInt(e.target.dataset.orderId);
            e.target.classList.add('dragging');
        });
        
        card.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
        });
    });
    
    document.querySelectorAll('.process-items').forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
            column.style.backgroundColor = '#f0f0f0';
        });
        
        column.addEventListener('dragleave', (e) => {
            column.style.backgroundColor = '';
        });
        
        column.addEventListener('drop', (e) => {
            e.preventDefault();
            column.style.backgroundColor = '';
            
            const processId = parseInt(column.parentElement.dataset.processId);
            
            if (draggedOrder) {
                const order = data.orders.find(o => o.id === draggedOrder);
                if (order) {
                    const product = data.products.find(p => p.id === order.productId);
                    
                    if (processId === 0 || product.processes.includes(processId)) {
                        moveOrderToProcess(draggedOrder, processId === 0 ? null : processId);
                        renderProcessBoard();
                    } else {
                        alert('Этот заказ не может быть перемещен в данный процесс согласно маршруту изделия');
                    }
                }
            }
        });
    });
}
