/**
 * Сервис управления заказами
 */
class OrderService {
    constructor(dataRepository) {
        this.dataRepository = dataRepository;
    }

    /**
     * Создать новый заказ
     */
    createOrder(orderData) {
        try {
            const currentUser = this.dataRepository.getCurrentUser();
            if (!currentUser || (!currentUser.isAdmin && !currentUser.canCreateOrders)) {
                throw new Error('Недостаточно прав для создания заказа');
            }

            const product = this.dataRepository.getProductById(orderData.productId);
            if (!product) {
                throw new Error('Изделие не найдено');
            }

            if (product.processes.length === 0) {
                throw new Error('У изделия не настроены процессы');
            }

            const order = new Order({
                ...orderData,
                currentProcessId: product.getFirstProcess()
            });

            this.dataRepository.addOrder(order);

            const firstProcess = this.dataRepository.getProcessById(product.getFirstProcess());
            const createEvent = OrderHistoryEvent.createOrderCreated(
                order.id,
                currentUser,
                { id: product.getFirstProcess(), name: firstProcess?.name || 'Неизвестный процесс' }
            );
            order.addHistoryEvent(createEvent);

            this.dataRepository.save();

            console.log(`Заказ №${order.number} создан успешно`);
            return order;
        } catch (error) {
            console.error('Ошибка создания заказа:', error);
            throw error;
        }
    }

    /**
     * Переместить заказ на следующий процесс
     */
    moveOrderForward(orderId, reason = null) {
        try {
            const order = this.dataRepository.getOrderById(orderId);
            if (!order) {
                throw new Error('Заказ не найден');
            }

            if (order.isDefective()) {
                throw new Error('Нельзя перемещать заказ в браке');
            }

            const product = this.dataRepository.getProductById(order.productId);
            if (!product) {
                throw new Error('Изделие заказа не найдено');
            }

            const currentUser = this.dataRepository.getCurrentUser();
            if (!this._canUserMoveOrder(order, currentUser)) {
                throw new Error('Недостаточно прав для перемещения заказа');
            }

            const newProcessId = order.moveToNextProcess(product, currentUser, reason);
            this.dataRepository.save();

            const message = newProcessId 
                ? `Заказ №${order.number} перемещен на следующий этап`
                : `Заказ №${order.number} завершен`;

            console.log(message);
            return order;
        } catch (error) {
            console.error('Ошибка перемещения заказа:', error);
            throw error;
        }
    }

    /**
     * Переместить заказ на конкретный процесс (только для админов)
     */
    moveOrderToProcess(orderId, processId, reason = null) {
        try {
            const currentUser = this.dataRepository.getCurrentUser();
            if (!currentUser || !currentUser.isAdmin) {
                throw new Error('Только администратор может перемещать заказы между любыми процессами');
            }

            const order = this.dataRepository.getOrderById(orderId);
            if (!order) {
                throw new Error('Заказ не найден');
            }

            order.moveToProcess(processId, currentUser, reason);
            this.dataRepository.save();

            const targetProcess = processId ? this.dataRepository.getProcessById(processId) : null;
            const message = targetProcess 
                ? `Заказ №${order.number} перемещен в "${targetProcess.name}"`
                : `Заказ №${order.number} завершен`;

            console.log(message);
            return order;
        } catch (error) {
            console.error('Ошибка перемещения заказа:', error);
            throw error;
        }
    }

    /**
     * Отправить заказ в брак
     */
    sendOrderToDefect(orderId, targetProcessId, reason, isRejected = false) {
        try {
            const order = this.dataRepository.getOrderById(orderId);
            if (!order) {
                throw new Error('Заказ не найден');
            }

            const currentUser = this.dataRepository.getCurrentUser();
            if (!this._canUserMoveOrder(order, currentUser)) {
                throw new Error('Недостаточно прав для отправки заказа в брак');
            }

            const currentProcess = this.dataRepository.getProcessById(order.currentProcessId);
            const fromProcessName = currentProcess?.name || 'Неизвестный процесс';

            order.sendToDefect(targetProcessId, reason, currentUser, fromProcessName, isRejected);
            this.dataRepository.save();

            const targetProcess = this.dataRepository.getProcessById(targetProcessId);
            console.log(`Заказ №${order.number} отправлен в брак на этап "${targetProcess?.name || 'Неизвестно'}"`);
            return order;
        } catch (error) {
            console.error('Ошибка отправки заказа в брак:', error);
            throw error;
        }
    }

    /**
     * Устранить брак заказа
     */
    fixDefectOrder(orderId, comment) {
        try {
            const order = this.dataRepository.getOrderById(orderId);
            if (!order) {
                throw new Error('Заказ не найден');
            }

            if (!order.isDefective()) {
                throw new Error('Заказ не в браке');
            }

            const currentUser = this.dataRepository.getCurrentUser();
            if (!currentUser) {
                throw new Error('Пользователь не авторизован');
            }

            order.fixDefect(comment, currentUser);
            this.dataRepository.save();

            const returnProcess = this.dataRepository.getProcessById(order.currentProcessId);
            console.log(`Брак заказа №${order.number} устранен, заказ возвращен на этап "${returnProcess?.name || 'Неизвестно'}"`);
            return order;
        } catch (error) {
            console.error('Ошибка устранения брака:', error);
            throw error;
        }
    }

    /**
     * Получить заказы, доступные пользователю
     */
    getAccessibleOrders(user = null) {
        const currentUser = user || this.dataRepository.getCurrentUser();
        if (!currentUser) {
            return [];
        }

        const allOrders = this.dataRepository.getOrders();

        if (currentUser.isAdmin) {
            return allOrders;
        }

        return allOrders.filter(order => {
            const product = this.dataRepository.getProductById(order.productId);
            if (!product) return false;

            if (order.isCompleted()) {
                const lastProcessId = product.getLastProcess();
                return currentUser.hasAccessToProcess(lastProcessId);
            }

            return currentUser.hasAccessToProcess(order.currentProcessId);
        });
    }

    /**
     * Получить заказы по процессу для текущего пользователя
     */
    getOrdersByProcessForUser(processId, user = null) {
        const currentUser = user || this.dataRepository.getCurrentUser();
        if (!currentUser) {
            return [];
        }

        if (!currentUser.isAdmin && !currentUser.hasAccessToProcess(processId)) {
            return [];
        }

        return this.dataRepository.getOrdersByProcess(processId);
    }

    /**
     * Генерировать номер заказа
     */
    generateOrderNumber() {
        const today = new Date();
        const dateStr = today.getFullYear().toString().substr(-2) + 
                       (today.getMonth() + 1).toString().padStart(2, '0') + 
                       today.getDate().toString().padStart(2, '0');
        
        const existingNumbers = this.dataRepository.getOrders()
            .map(o => o.number)
            .filter(n => n.startsWith(dateStr))
            .map(n => parseInt(n.split('-')[1]) || 0);
        
        const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
        
        return `${dateStr}-${nextNumber.toString().padStart(3, '0')}`;
    }

    /**
     * Проверить, может ли пользователь перемещать заказ
     */
    _canUserMoveOrder(order, user) {
        if (!user) return false;
        if (user.isAdmin) return true;
        
        const product = this.dataRepository.getProductById(order.productId);
        if (!product) return false;
        
        return user.hasAccessToProcess(order.currentProcessId);
    }

    /**
     * Валидация данных заказа
     */
    validateOrderData(orderData) {
        const errors = [];

        if (!orderData.number || orderData.number.trim().length < 3) {
            errors.push('Номер заказа должен содержать минимум 3 символа');
        }

        if (!orderData.customerName || orderData.customerName.trim().length < 2) {
            errors.push('Имя клиента должно содержать минимум 2 символа');
        }

        if (!orderData.customerPhone) {
            errors.push('Телефон клиента обязателен');
        } else {
            const phone = new Phone(orderData.customerPhone);
            if (!phone.isValid()) {
                errors.push('Некорректный номер телефона клиента');
            }
        }

        if (!orderData.productId) {
            errors.push('Необходимо выбрать изделие');
        } else {
            const product = this.dataRepository.getProductById(orderData.productId);
            if (!product) {
                errors.push('Выбранное изделие не найдено');
            }
        }

        if (orderData.number) {
            const existingOrder = this.dataRepository.getOrderByNumber(orderData.number);
            if (existingOrder && existingOrder.id !== orderData.id) {
                errors.push('Заказ с таким номером уже существует');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Получить статистику заказов
     */
    getOrderStatistics(user = null) {
        const orders = this.getAccessibleOrders(user);
        
        return {
            total: orders.length,
            inProgress: orders.filter(o => !o.isCompleted() && !o.isDefective()).length,
            completed: orders.filter(o => o.isCompleted()).length,
            defective: orders.filter(o => o.isDefective()).length,
            byProcess: this._getOrdersByProcessStatistics(orders)
        };
    }

    /**
     * Получить статистику заказов по процессам
     */
    _getOrdersByProcessStatistics(orders) {
        const processes = this.dataRepository.getProcesses();
        const stats = {};

        processes.forEach(process => {
            stats[process.id] = {
                name: process.name,
                count: orders.filter(o => o.currentProcessId === process.id).length
            };
        });

        stats[0] = {
            name: 'Завершено',
            count: orders.filter(o => o.isCompleted()).length
        };

        return stats;
    }

    /**
     * Поиск заказов
     */
    searchOrders(query, user = null) {
        const orders = this.getAccessibleOrders(user);
        
        if (!query || query.trim().length === 0) {
            return orders;
        }

        const searchTerm = query.toLowerCase().trim();
        
        return orders.filter(order => {
            return order.number.toLowerCase().includes(searchTerm) ||
                   order.customerName.toLowerCase().includes(searchTerm) ||
                   order.customerPhone.getClean().includes(searchTerm.replace(/\D/g, ''));
        });
    }

    /**
     * Получить заказы с фильтрацией
     */
    getFilteredOrders(filters = {}, user = null) {
        let orders = this.getAccessibleOrders(user);

        if (filters.status) {
            switch (filters.status) {
                case 'in_progress':
                    orders = orders.filter(o => !o.isCompleted() && !o.isDefective());
                    break;
                case 'completed':
                    orders = orders.filter(o => o.isCompleted());
                    break;
                case 'defective':
                    orders = orders.filter(o => o.isDefective());
                    break;
            }
        }

        if (filters.processId !== undefined) {
            orders = orders.filter(o => o.currentProcessId === filters.processId);
        }

        if (filters.productId) {
            orders = orders.filter(o => o.productId === filters.productId);
        }

        if (filters.dateFrom || filters.dateTo) {
            orders = orders.filter(order => {
                const orderDate = new Date(order.createdAt);
                let matches = true;
                
                if (filters.dateFrom) {
                    matches = matches && orderDate >= new Date(filters.dateFrom);
                }
                
                if (filters.dateTo) {
                    const dateTo = new Date(filters.dateTo);
                    dateTo.setHours(23, 59, 59, 999);
                    matches = matches && orderDate <= dateTo;
                }
                
                return matches;
            });
        }

        return orders;
    }
}

window.OrderService = OrderService;
