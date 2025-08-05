// Модуль доски процессов (восстановленная версия)
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

        // Проверяем что данные загружены
        const orders = DataManager.getOrders();
        const processes = DataManager.getProcesses();
        
        if (!orders || !processes) {
            console.warn('Данные ещё не загружены, показываем индикатор загрузки');
            mainContent.innerHTML = `
                <div class="board-container">
                    <div class="process-board" style="padding: 40px; text-align: center;">
                        <div style="font-size: 24px; margin-bottom: 10px;">🔄</div>
                        <div>Загрузка данных...</div>
                        <div style="margin-top: 10px; font-size: 12px; color: #666;">
                            Ожидание синхронизации с сервером...
                        </div>
                    </div>
                </div>
            `;
            
            // Пробуем перезагрузить данные через 2 секунды
            setTimeout(async () => {
                try {
                    await DataManager.load();
                    this.showProcessBoard(); // Повторный вызов
                } catch (error) {
                    console.error('Ошибка перезагрузки данных:', error);
                }
            }, 2000);
            return;
        }

        const canCreate = user.isAdmin || user.canCreateOrders;
        
        console.log(`Отрисовываем доску: процессов=${processes.length}, заказов=${orders.length}`);
        
        mainContent.innerHTML = `
            <div class="board-container">
                ${canCreate ? `
                    <div class="board-header">
                        <button class="btn btn-primary" onclick="BoardModule.showAddOrderModal()">Добавить заказ</button>
                        <div class="board-stats">
                            <span>Всего заказов: ${orders.length}</span>
                            <span>В работе: ${orders.filter(o => o.currentProcessId).length}</span>
                            <span>Завершено: ${orders.filter(o => !o.currentProcessId).length}</span>
                        </div>
                    </div>
                ` : ''}
                <div class="process-board" id="processBoard">
                    <div style="padding: 20px;">Отрисовка процессов...</div>
                </div>
            </div>
        `;
        
        // Отрисовываем доску процессов немедленно
        this.renderProcessBoard();
        
        // Добавляем глобальное делегирование событий только один раз
        if (!this._clickHandlerAdded) {
            console.log('Добавляем глобальный обработчик кликов...');
            document.addEventListener('click', (event) => {
                const orderCard = event.target.closest('.order-card');
                if (orderCard && !this.draggedOrderId) {
                    const orderId = parseInt(orderCard.dataset.orderId);
                    if (orderId) {
                        this.showOrderDetails(orderId);
                    }
                }
            });
            this._clickHandlerAdded = true;
        }
    },

    // Рендеринг доски процессов  
    renderProcessBoard() {
        console.log('Рендерим доску процессов');
        
        const processBoard = document.getElementById('processBoard');
        if (!processBoard) {
            console.error('processBoard не найден');
            return;
        }
        
        // Проверяем что данные загружены
        const processes = DataManager.getProcesses();
        const orders = DataManager.getOrders();
        const products = DataManager.getProducts();
        
        if (!processes || !orders || !products) {
            console.warn('Данные для рендеринга не готовы:', { processes: !!processes, orders: !!orders, products: !!products });
            processBoard.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #666;">
                    <div style="font-size: 24px; margin-bottom: 10px;">🔄</div>
                    <div>Загрузка процессов...</div>
                </div>
            `;
            return;
        }
        
        const user = DataManager.getCurrentUser();
        if (!user) {
            console.error('Текущий пользователь не найден');
            return;
        }
        
        const isAdmin = user.isAdmin;
        
        console.log(`Рендерим: процессов=${processes.length}, заказов=${orders.length}, изделий=${products.length}`);
        
        try {
            // Получаем процессы, доступные пользователю
            const availableProcesses = isAdmin 
                ? processes 
                : processes.filter(p => user.processes.includes(p.id));
            
            // Сортируем процессы по порядку
            const sortedProcesses = availableProcesses.sort((a, b) => a.order - b.order);
            
            // Добавляем колонку "Завершено" в конец
            const allColumns = [...sortedProcesses];
            
            // Показываем колонку "Завершено" только если есть доступ к последнему процессу или если админ
            const hasAccessToLastProcess = isAdmin || processes.some(p => 
                user.processes.includes(p.id) && 
                products.some(prod => 
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
                let processOrders = orders.filter(order => {
                    if (process.id === 0) {
                        return !order.currentProcessId;
                    }
                    return order.currentProcessId === process.id;
                });
                
                // Фильтруем заказы для обычных пользователей
                if (!isAdmin) {
                    processOrders = processOrders.filter(order => {
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
                            <div class="process-count">${processOrders.length} заказов</div>
                        </div>
                        <div class="process-items" id="process-${process.id}">
                            ${processOrders.length > 0 ? 
                                processOrders.map(order => this.renderOrderCard(order, isAdmin)).join('') :
                                '<div class="empty-state">Нет заказов</div>'
                            }
                        </div>
                    </div>
                `;
            }).join('');
            
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
                
                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button class="btn btn-success" onclick="BoardModule.approveOrder(${order.id}); ModalModule.close();">
                        ✅ Выполнено
                    </button>
                    <button class="btn btn-danger" onclick="BoardModule.rejectOrder(${order.id});">
                        ❌ Отбраковать
                    </button>
                </div>
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

        const reason = prompt('Укажите причину отбраковки:');
        if (!reason || !reason.trim()) {
            return;
        }

        try {
            // Простая отбраковка - отправляем заказ на первый процесс изделия
            const product = DataManager.findProduct(order.productId);
            if (!product || !product.processes.length) {
                alert('Не удалось найти процессы для данного изделия');
                return;
            }

            const targetProcessId = product.processes[0]; // Первый процесс
            DefectModule.sendOrderToDefect(orderId, targetProcessId, reason.trim(), true);
            this.renderProcessBoard();
            
            const targetProcess = DataManager.findProcess(targetProcessId);
            alert(`❌ Заказ №${order.number} отбракован и отправлен на этап "${targetProcess ? targetProcess.name : 'Неизвестно'}"`);
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

    // Перемещение заказа в процесс
    moveOrderToProcess(orderId, targetProcessId) {
        try {
            const order = DataManager.findOrder(orderId);
            if (!order) {
                console.error('Заказ не найден:', orderId);
                return;
            }

            const product = DataManager.findProduct(order.productId);
            if (!product) {
                console.error('Изделие не найдено для заказа:', order.productId);
                return;
            }

            // Валидация: можно ли переместить заказ в этот процесс
            const canMove = targetProcessId === 0 || product.processes.includes(targetProcessId);
            if (!canMove) {
                alert('Этот заказ не может быть перемещен в данный процесс согласно маршруту изделия');
                return;
            }

            // Перемещаем заказ
            const success = DataManager.moveOrderToProcess(orderId, targetProcessId === 0 ? null : targetProcessId, 'Заказ перемещен через drag & drop');
            
            if (success) {
                this.renderProcessBoard();
                
                const targetProcess = targetProcessId === 0 ? null : DataManager.findProcess(targetProcessId);
                const message = targetProcess 
                    ? `Заказ №${order.number} перемещен в "${targetProcess.name}"`
                    : `Заказ №${order.number} завершен`;
                
                console.log(message);
            } else {
                console.error('Не удалось переместить заказ');
                alert('Ошибка при перемещении заказа');
            }
        } catch (error) {
            console.error('Ошибка перемещения заказа:', error);
            alert('Ошибка при перемещении заказа');
        }
    }
};

// Экспортируем модуль
window.BoardModule = BoardModule;
console.log('✅ BoardModule загружен успешно');
