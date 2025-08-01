// Модуль доски процессов
const BoardModule = {
    // Показать доску процессов
    showProcessBoard() {
        console.log('Показываем доску процессов');
        
        const mainContent = document.getElementById('mainContent');
        if (!mainContent) {
            console.error('mainContent не найден');
            return;
        }

        const user = DataManager.getCurrentUser();
        if (!user) {
            console.error('Текущий пользователь не найден');
            return;
        }

        const canCreate = user.isAdmin || user.canCreateOrders;
        
        mainContent.innerHTML = `
            <div class="board-container">
                ${canCreate ? `
                    <div class="board-header">
                        <button class="btn btn-primary" onclick="BoardModule.showAddOrderModal()">Добавить заказ</button>
                        <div class="board-stats">
                            <span>Всего заказов: ${DataManager.getOrders().length}</span>
                            <span>В работе: ${DataManager.getOrders().filter(o => o.currentProcessId).length}</span>
                            <span>Завершено: ${DataManager.getOrders().filter(o => !o.currentProcessId).length}</span>
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
            this.renderProcessBoard();
        }, 100);
        
        // Добавляем глобальное делегирование событий только один раз
        if (!this._clickHandlerAdded) {
            console.log('Добавляем глобальный обработчик кликов...');
            document.addEventListener('click', (event) => {
                console.log('Клик по документу:', event.target);
                const orderCard = event.target.closest('.order-card');
                if (orderCard) {
                    console.log('Найдена карточка заказа:', orderCard);
                    if (!this.draggedOrderId) {
                        const orderId = parseInt(orderCard.dataset.orderId);
                        if (orderId) {
                            console.log('Открываем карточку заказа, ID:', orderId);
                            this.showOrderDetails(orderId);
                        } else {
                            console.log('Не удалось получить ID заказа');
                        }
                    } else {
                        console.log('Перетаскивание в процессе, клик игнорируется');
                    }
                }
            });
            this._clickHandlerAdded = true;
        }
    },

    // Добавление обработчиков кликов на карточки заказов
    addOrderCardListeners() {
        const orderCards = document.querySelectorAll('.order-card');
        console.log('Найдено карточек заказов:', orderCards.length);
        
        orderCards.forEach((card, index) => {
            console.log(`Добавляем обработчик клика на карточку ${index + 1}`);
            
            // Удаляем старые обработчики
            card.removeEventListener('click', this.handleOrderCardClick);
            
            // Добавляем новые
            card.addEventListener('click', this.handleOrderCardClick.bind(this));
        });
    },

    // Обработчик клика на карточку заказа
    handleOrderCardClick(event) {
        console.log('Клик на карточку заказа:', event.target);
        
        // Предотвращаем открытие карточки во время drag & drop
        if (this.draggedOrderId) {
            console.log('Перетаскивание в процессе, клик игнорируется');
            return;
        }
        
        const orderCard = event.target.closest('.order-card');
        console.log('Найденная карточка:', orderCard);
        
        if (orderCard) {
            const orderId = parseInt(orderCard.dataset.orderId);
            console.log('ID заказа:', orderId);
            this.showOrderDetails(orderId);
        } else {
            console.log('Карточка заказа не найдена');
        }
    },

    // Рендеринг истории заказа
    renderOrderHistory(order) {
        if (!order.history || order.history.length === 0) {
            return '<p style="color: #666; font-style: italic;">История пуста</p>';
        }
        
        return order.history
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) // Новые сверху
            .map(event => {
                try {
                    const date = OrderUtils.formatDate(event.timestamp);
                    const user = event.user || { name: 'Система' };
                    
                    let eventText = '';
                    switch (event.type) {
                        case APP_CONSTANTS.EVENT_TYPES.CREATED:
                            eventText = `🎆 Заказ создан и помещен в "${event.data?.toProcess?.name || 'Неизвестный процесс'}"`;
                            break;
                        case APP_CONSTANTS.EVENT_TYPES.MOVED:
                            eventText = `➡️ Перемещен с "${event.data?.fromProcess?.name || 'Неизвестно'}" в "${event.data?.toProcess?.name || 'Завершено'}"`;
                            break;
                        case APP_CONSTANTS.EVENT_TYPES.DEFECT_SENT:
                            eventText = `❌ Отправлен в брак: ${event.data?.reason || 'Причина не указана'}`;
                            break;
                        case APP_CONSTANTS.EVENT_TYPES.DEFECT_FIXED:
                            eventText = `🔧 Брак устранен: ${event.data?.comment || 'Комментарий отсутствует'}`;
                            break;
                        default:
                            eventText = `📝 ${event.comment || 'Неизвестное событие'}`;
                    }
                    
                    return `
                        <div style="margin-bottom: 8px; padding: 8px; background: white; border-radius: 4px; border-left: 3px solid #007bff;">
                            <div style="font-size: 14px; margin-bottom: 2px;">${eventText}</div>
                            <div style="font-size: 12px; color: #666;">
                                ${date.full} • ${user.name}
                            </div>
                        </div>
                    `;
                } catch (error) {
                    console.error('Ошибка рендеринга события:', error, event);
                    return `<div style="color: red; font-size: 12px;">Ошибка отображения события</div>`;
                }
            })
            .join('');
    },

    // Рендеринг доски процессов  
    renderProcessBoard() {
        console.log('Рендерим доску процессов');
        
        const processBoard = document.getElementById('processBoard');
        if (!processBoard) {
            console.error('processBoard не найден');
            return;
        }
        
        const user = DataManager.getCurrentUser();
        const isAdmin = user.isAdmin;
        
        try {
            // Получаем процессы, доступные пользователю
            const availableProcesses = isAdmin 
                ? DataManager.getProcesses() 
                : DataManager.getProcesses().filter(p => user.processes.includes(p.id));
            
            // Сортируем процессы по порядку
            const sortedProcesses = availableProcesses.sort((a, b) => a.order - b.order);
            
            // Добавляем колонку "Завершено" в конец
            const allColumns = [...sortedProcesses];
            
            // Показываем колонку "Завершено" только если есть доступ к последнему процессу или если админ
            const hasAccessToLastProcess = isAdmin || DataManager.getProcesses().some(p => 
                user.processes.includes(p.id) && 
                DataManager.getProducts().some(prod => 
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
                let orders = DataManager.getOrders().filter(order => {
                    if (process.id === 0) {
                        return !order.currentProcessId;
                    }
                    return order.currentProcessId === process.id;
                });
                
                // Фильтруем заказы для обычных пользователей
                if (!isAdmin) {
                    orders = orders.filter(order => {
                        const product = DataManager.findProduct(order.productId);
                        if (!product) return false;
                        
                        if (process.id === 0) {
                            const lastProcessId = product.processes[product.processes.length - 1];
                            return user.processes.includes(lastProcessId);
                        }
                        
                        return product.processes.includes(process.id);
                    });
                }
                
                return `
                    <div class="process-column" data-process-id="${process.id}"
                         ${isAdmin ? 'ondrop="BoardModule.handleDrop(event)" ondragover="BoardModule.handleDragOver(event)" ondragenter="BoardModule.handleDragEnter(event)" ondragleave="BoardModule.handleDragLeave(event)"' : ''}>
                        <div class="process-header">
                            <div class="process-title">${process.name}</div>
                            <div class="process-count">${orders.length} заказов</div>
                        </div>
                        <div class="process-items" id="process-${process.id}">
                            ${orders.length > 0 ? 
                                orders.map(order => this.renderOrderCard(order, isAdmin)).join('') :
                                '<div class="empty-state">Нет заказов</div>'
                            }
                        </div>
                    </div>
                `;
            }).join('');
            
            // Добавляем обработчики кликов на карточки заказов
            setTimeout(() => {
                this.addOrderCardListeners();
            }, 50);
            
        } catch (error) {
            console.error('Ошибка рендеринга процессов:', error);
            processBoard.innerHTML = `
                <div style="padding: 20px; color: red;">
                    <h3>Ошибка отображения процессов</h3>
                    <p>${error.message}</p>
                    <button onclick="BoardModule.renderProcessBoard()">Попробовать снова</button>
                </div>
            `;
        }
    },

    // Рендеринг карточки заказа
    renderOrderCard(order, isAdmin) {
        try {
            const formattedDate = OrderUtils.formatDate(order.createdAt);
            const isDefective = order.defectInfo && order.defectInfo.isDefective;
            
            return `
                <div class="order-card" 
                     data-order-id="${order.id}"
                     ${isAdmin ? 'draggable="true"' : ''}
                     ${isAdmin ? 'ondragstart="BoardModule.handleDragStart(event)" ondragend="BoardModule.handleDragEnd(event)"' : ''}>
                    <div class="order-number">№${order.number}</div>
                    <div class="order-customer">${order.customerName}</div>
                    ${isDefective ? `
                        <div style="font-size: 12px; color: #dc3545; font-weight: 600; margin: 4px 0;">
                            БРАК: ${order.defectInfo.defectReason}
                        </div>
                    ` : ''}
                    <div class="order-created">
                        <small>${formattedDate.date}</small>
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
    },

    // Модальное окно добавления заказа
    showAddOrderModal() {
        console.log('Показываем модальное окно добавления заказа');
        
        if (DataManager.getProducts().length === 0) {
            alert('Сначала создайте изделия в админ панели');
            return;
        }
        
        const form = `
            <div class="form-group">
                <label>Номер заказа:</label>
                <input type="text" id="order-number" class="form-input" value="${OrderUtils.generateOrderNumber()}">
            </div>
            <div class="form-group">
                <label>Изделие:</label>
                <select id="order-product" class="form-input">
                    <option value="">Выберите изделие</option>
                    ${DataManager.getProducts().map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Имя клиента:</label>
                <input type="text" id="order-customer" class="form-input">
            </div>
            <div class="form-group">
                <label>Телефон клиента:</label>
                <input type="text" id="order-phone" class="form-input" placeholder="+7-(xxx)-xxx-xxxx">
            </div>
            <div id="custom-fields"></div>
            <button type="button" class="btn btn-secondary btn-small" onclick="ModalModule.addCustomField && ModalModule.addCustomField()">+ Добавить поле</button>
        `;
        
        ModalModule.show('Добавить заказ', form, () => {
            const number = document.getElementById('order-number').value.trim();
            const productId = parseInt(document.getElementById('order-product').value);
            const customerName = document.getElementById('order-customer').value.trim();
            const customerPhone = document.getElementById('order-phone').value.trim();
            
            if (!number || !productId || !customerName || !customerPhone) {
                alert('Заполните все обязательные поля');
                return false;
            }
            
            // Валидация телефона
            if (!PhoneUtils.isValidPhone(customerPhone)) {
                alert('Введите корректный номер телефона в формате +7-(xxx)-xxx-xxxx');
                return false;
            }
            
            // Проверяем уникальность номера
            if (DataManager.getOrders().some(o => o.number === number)) {
                alert('Заказ с таким номером уже существует');
                return false;
            }
            
            const product = DataManager.findProduct(productId);
            if (!product || product.processes.length === 0) {
                alert('У выбранного изделия нет процессов');
                return false;
            }
            
            // Собираем кастомные поля (если функция существует)
            const customFields = (typeof OrderUtils.collectCustomFields === 'function') 
                ? OrderUtils.collectCustomFields() 
                : {};
            
            const newOrder = {
                id: Date.now(),
                number: number,
                productId: productId,
                customerName: customerName,
                customerPhone: new Phone(customerPhone), // Создаем экземпляр Phone
                currentProcessId: product.processes[0], // Первый процесс
                customFields: customFields,
                createdAt: new Date().toISOString(),
                history: []
            };
            
            DataManager.addOrder(newOrder);
            
            // Добавляем событие создания в историю
            const firstProcess = DataManager.findProcess(product.processes[0]);
            DataManager.addOrderHistoryEvent(newOrder.id, APP_CONSTANTS.EVENT_TYPES.CREATED, {
                currentUser: DataManager.getCurrentUser(),
                toProcess: { id: product.processes[0], name: firstProcess?.name || 'Неизвестный процесс' }
            });
            
            this.renderProcessBoard();
            
            console.log('Заказ добавлен:', newOrder);
            alert(`✅ Заказ №${newOrder.number} создан!`);
            return true;
        });
        
        // Применяем маску телефона после показа модального окна
        setTimeout(() => {
            const phoneInput = document.getElementById('order-phone');
            if (phoneInput && typeof PhoneUtils !== 'undefined' && PhoneUtils.applyMask) {
                PhoneUtils.applyMask(phoneInput);
            }
        }, 100);
    },

    // Показать детали заказа
    showOrderDetails(orderId) {
        const order = DataManager.findOrder(orderId);
        if (!order) {
            alert('Заказ не найден');
            return;
        }
        
        const product = DataManager.findProduct(order.productId);
        const currentProcess = order.currentProcessId ? 
            DataManager.findProcess(order.currentProcessId) : null;
        
        const isDefective = order.defectInfo && order.defectInfo.isDefective;
        
        let actionsHTML = '';
        if (isDefective) {
            actionsHTML = `
                <div style="margin-top: 20px; padding: 15px; background: #fee; border: 1px solid #fcc; border-radius: 8px;">
                    <h4>🔧 Заказ в браке</h4>
                    <p><strong>Причина:</strong> ${order.defectInfo.defectReason}</p>
                    <button class="btn btn-success" onclick="
                        const comment = prompt('Опишите что было сделано для устранения брака:');
                        if (comment && comment.trim()) {
                            window.fixDefectOrderGlobal(${order.id}, comment.trim());
                            ModalModule.close();
                        } else {
                            alert('Комментарий обязателен');
                        }
                    ">🔧 Устранить брак</button>
                </div>
            `;
        } else {
            actionsHTML = `
                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button class="btn btn-success" onclick="BoardModule.approveOrder(${order.id}); ModalModule.close();">
                        ✅ Выполнено
                    </button>
                    <button class="btn btn-danger" onclick="BoardModule.rejectOrder(${order.id});">
                        ❌ Отбраковать
                    </button>
                </div>
            `;
        }
        
        const phoneDisplay = (order.customerPhone instanceof Phone) 
            ? order.customerPhone.getFormatted() 
            : (typeof order.customerPhone === 'string' ? PhoneUtils.formatPhone(order.customerPhone) : order.customerPhone);
        const phoneDialable = (order.customerPhone instanceof Phone) 
            ? order.customerPhone.getDialable() 
            : (typeof order.customerPhone === 'string' ? `+${PhoneUtils.getCleanPhone(order.customerPhone)}` : order.customerPhone);
        
        const orderInfo = `
            <div style="line-height: 1.6;">
                <p><strong>Изделие:</strong> ${product ? product.name : 'Неизвестно'}</p>
                <p><strong>Клиент:</strong> ${order.customerName}</p>
                <p><strong>Телефон:</strong> <a href="tel:${phoneDialable}">${phoneDisplay}</a></p>
                <p><strong>Текущий процесс:</strong> ${currentProcess ? currentProcess.name : 'Завершен'}</p>
                <p><strong>Создан:</strong> ${OrderUtils.formatDate(order.createdAt).full}</p>
                
                <div style="margin-top: 20px;">
                    <h4>История заказа:</h4>
                    <div style="max-height: 200px; overflow-y: auto; background: #f9f9f9; padding: 10px; border-radius: 5px;">
                        ${this.renderOrderHistory(order)}
                    </div>
                </div>
                
                ${actionsHTML}
            </div>
        `;
        
        ModalModule.show(`Заказ №${order.number}`, orderInfo, null);
    },

    // Принятие заказа
    approveOrder(orderId) {
        try {
            const order = DataManager.findOrder(orderId);
            if (!order) return;
            
            const newProcessId = OrderUtils.getNextProcess(order);
            DataManager.moveOrderToProcess(orderId, newProcessId || 0, 'Заказ принят и передан на следующий этап');
            this.renderProcessBoard();
            
            const nextProcess = newProcessId ? DataManager.findProcess(newProcessId) : null;
            const message = nextProcess 
                ? `Заказ №${order.number} передан на этап "${nextProcess.name}"`
                : `Заказ №${order.number} завершен`;
            
            alert(`✅ ${message}`);
        } catch (error) {
            console.error('Ошибка принятия заказа:', error);
            alert('Ошибка при принятии заказа');
        }
    },

    // Отбраковка заказа
    rejectOrder(orderId) {
        const order = DataManager.findOrder(orderId);
        if (!order) {
            alert('Заказ не найден');
            return;
        }
        
        const product = DataManager.findProduct(order.productId);
        if (!product) {
            alert('Изделие не найдено для заказа');
            return;
        }
        
        // Получаем доступные процессы (кроме текущего)
        console.log('📝 Отладка процессов:', {
            изделие: product.name,
            все_процессы_изделия: product.processes,
            текущий_процесс: order.currentProcessId
        });
        
        const availableProcesses = product.processes
            .filter(processId => processId !== order.currentProcessId)
            .map(processId => DataManager.findProcess(processId))
            .filter(process => process)
            .sort((a, b) => a.order - b.order);
        
        console.log('🔍 Доступные процессы:', availableProcesses);
        
        if (availableProcesses.length === 0) {
            alert('Нет доступных этапов для отправки в брак');
            return;
        }
        
        const currentProcess = DataManager.findProcess(order.currentProcessId);
        
        const form = `
            <div style="margin-bottom: 16px; padding: 12px; background: #ffe6e6; border: 1px solid #ffcccc; border-radius: 8px;">
                <strong>❌ Отбраковка заказа №${order.number}</strong><br>
                <small>Заказ будет отправлен на выбранный этап для исправления</small>
            </div>
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 4px; font-weight: bold;">Причина отбраковки:</label>
                <textarea id="reject-reason" style="width: 100%; height: 80px; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" placeholder="Подробно опишите что не так с заказом..." required></textarea>
            </div>
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 4px; font-weight: bold;">Отправить на этап:</label>
                <select id="reject-process" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" required>
                    <option value="">Выберите этап...</option>
                    ${availableProcesses.map((process, index) => {
                        console.log(`📝 Процесс ${index}:`, { id: process.id, name: process.name });
                        return `<option value="${process.id}">${process.name} (ID: ${process.id})</option>`;
                    }).join('')}
                </select>
                <small style="color: #666; margin-top: 4px; display: block;">
                    💡 Заказ вернется на текущий этап "${currentProcess ? currentProcess.name : 'Неизвестно'}" после устранения
                </small>
                <div style="margin-top: 8px; font-size: 12px; color: #999;">
                    Отладка: Доступно этапов: ${availableProcesses.length}
                </div>
            </div>
        `;
        
        ModalModule.show('Отбраковка заказа', form, () => {
            const reason = document.getElementById('reject-reason').value.trim();
            const targetProcessIdValue = document.getElementById('reject-process').value;
            const targetProcessId = targetProcessIdValue ? parseInt(targetProcessIdValue) : null;
            
            console.log('🔍 Проверяем значения:', {
                targetProcessIdValue: targetProcessIdValue,
                targetProcessId: targetProcessId,
                isValid: targetProcessId && !isNaN(targetProcessId) && targetProcessId > 0
            });
            
            if (!reason) {
                alert('Укажите причину отбраковки');
                return false;
            }
            
            if (!targetProcessId || isNaN(targetProcessId) || targetProcessId <= 0) {
                alert('Выберите этап для отправки');
                return false;
            }
            
            try {
                console.log('📝 Отладка отбраковки:', {
                    orderId: orderId,
                    targetProcessId: targetProcessId,
                    reason: reason,
                    targetProcessIdType: typeof targetProcessId,
                    isNaN: isNaN(targetProcessId)
                });
                
                DefectModule.sendOrderToDefect(orderId, targetProcessId, reason, true);
                this.renderProcessBoard();
                
                const targetProcess = DataManager.findProcess(targetProcessId);
                alert(`❌ Заказ №${order.number} отбракован и отправлен на этап "${targetProcess ? targetProcess.name : 'Неизвестно'}". Причина: ${reason}`);
                return true;
            } catch (error) {
                console.error('Ошибка отбраковки:', error);
                alert('Ошибка при отбраковке заказа');
                return false;
            }
        });
    },

    // Отбраковка заказа
    rejectOrder(orderId) {
        const reason = prompt('Укажите причину отбраковки:');
        if (!reason || !reason.trim()) {
            alert('Причина отбраковки обязательна');
            return;
        }
        
        try {
            DefectModule.sendOrderToDefect(orderId, null, reason.trim(), true);
            this.renderProcessBoard();
            alert(`❌ Заказ отбракован. Причина: ${reason.trim()}`);
        } catch (error) {
            console.error('Ошибка отбраковки:', error);
            alert('Ошибка при отбраковке заказа');
        }
    },

    // Drag & Drop для админа
    draggedOrderId: null,

    handleDragStart(event) {
        const orderCard = event.target.closest('.order-card');
        if (orderCard) {
            this.draggedOrderId = parseInt(orderCard.dataset.orderId);
            orderCard.style.opacity = '0.5';
            event.dataTransfer.effectAllowed = 'move';
        }
    },

    handleDragEnd(event) {
        const orderCard = event.target.closest('.order-card');
        if (orderCard) {
            orderCard.style.opacity = '1';
        }
        this.draggedOrderId = null;
        // Убираем все визуальные индикации
        document.querySelectorAll('.process-column').forEach(col => {
            col.classList.remove('drag-over');
        });
    },

    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    },

    handleDragEnter(event) {
        event.preventDefault();
        const processColumn = event.target.closest('.process-column');
        if (processColumn && this.draggedOrderId) {
            processColumn.classList.add('drag-over');
        }
    },

    handleDragLeave(event) {
        const processColumn = event.target.closest('.process-column');
        if (processColumn && !processColumn.contains(event.relatedTarget)) {
            processColumn.classList.remove('drag-over');
        }
    },

    handleDrop(event) {
        event.preventDefault();
        const processColumn = event.target.closest('.process-column');
        if (processColumn && this.draggedOrderId) {
            const targetProcessId = parseInt(processColumn.dataset.processId);
            
            // Проверяем что это новый процесс
            const order = DataManager.findOrder(this.draggedOrderId);
            if (order && order.currentProcessId !== targetProcessId) {
                this.moveOrderToProcess(this.draggedOrderId, targetProcessId);
            }
            
            processColumn.classList.remove('drag-over');
        }
    },

    // Перемещение заказа через drag & drop
    moveOrderToProcess(orderId, targetProcessId) {
        try {
            const order = DataManager.findOrder(orderId);
            if (!order) {
                alert('Заказ не найден');
                return;
            }

            const currentProcess = order.currentProcessId ? 
                DataManager.findProcess(order.currentProcessId) : null;
            const targetProcess = targetProcessId ? 
                DataManager.findProcess(targetProcessId) : null;

            // Перемещаем заказ
            DataManager.moveOrderToProcess(
                orderId, 
                targetProcessId || 0, 
                `Перемещен администратором с "${currentProcess?.name || 'Неизвестно'}" в "${targetProcess?.name || 'Завершено'}"`
            );

            // Обновляем отображение
            this.renderProcessBoard();

            // Показываем уведомление
            const message = targetProcess 
                ? `Заказ №${order.number} перемещен в "${targetProcess.name}"`
                : `Заказ №${order.number} завершен`;
            
            console.log(`✅ ${message}`);
            
        } catch (error) {
            console.error('Ошибка перемещения заказа:', error);
            alert('Ошибка при перемещении заказа');
        }
    }
};

window.BoardModule = BoardModule;
