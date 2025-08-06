            <label class="form-label">Название изделия</label>
            <input type="text" class="form-input" id="productName" value="${product.name}">
        </div>
        <div class="form-group">
            <label class="form-label">Процессы (в порядке выполнения)</label>
            <div id="processesOrder">
                ${data.processes
                    .sort((a, b) => a.order - b.order)
                    .map(p => `
                        <label class="checkbox-label">
                            <input type="checkbox" value="${p.id}" name="productProcesses"
                                ${product.processes.includes(p.id) ? 'checked' : ''}>
                            ${p.name}
                        </label>
                    `).join('')}
            </div>
        </div>
    `;
    
    showModal('Редактировать изделие', content, () => {
        product.name = document.getElementById('productName').value;
        product.processes = Array.from(document.querySelectorAll('input[name="productProcesses"]:checked'))
            .map(cb => parseInt(cb.value));
        
        saveData();
        renderAdminTables();
        return true;
    });
}

function deleteProduct(productId) {
    if (confirm('Удалить изделие?')) {
        data.products = data.products.filter(p => p.id !== productId);
        saveData();
        renderAdminTables();
    }
}

// Функции для заказов
function showAddOrderModal() {
    const content = `
        <div class="form-group">
            <label class="form-label">Номер заказа</label>
            <input type="text" class="form-input" id="orderNumber">
        </div>
        <div class="form-group">
            <label class="form-label">Изделие</label>
            <select class="form-select" id="orderProduct">
                <option value="">Выберите изделие</option>
                ${data.products.map(p => `
                    <option value="${p.id}">${p.name}</option>
                `).join('')}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Имя клиента</label>
            <input type="text" class="form-input" id="customerName">
        </div>
        <div class="form-group">
            <label class="form-label">Телефон клиента</label>
            <input type="text" class="form-input" id="customerPhone">
        </div>
        <div id="additionalFields">
            <h4>Дополнительные поля</h4>
            <div id="customFields"></div>
            <button type="button" class="btn btn-secondary btn-small" onclick="addCustomField()">Добавить поле</button>
        </div>
    `;
    
    showModal('Добавить заказ', content, () => {
        const number = document.getElementById('orderNumber').value;
        const productId = parseInt(document.getElementById('orderProduct').value);
        const customerName = document.getElementById('customerName').value;
        const customerPhone = document.getElementById('customerPhone').value;
        
        if (!number || !productId || !customerName || !customerPhone) {
            alert('Заполните все обязательные поля');
            return false;
        }
        
        const product = data.products.find(p => p.id === productId);
        if (!product) return false;
        
        // Собираем дополнительные поля
        const customFields = {};
        document.querySelectorAll('.custom-field-row').forEach(row => {
            const key = row.querySelector('.field-key').value;
            const value = row.querySelector('.field-value').value;
            if (key) {
                customFields[key] = value;
            }
        });
        
        const newOrder = {
            id: Date.now(),
            number,
            productId,
            customerName,
            customerPhone,
            currentProcessId: product.processes[0], // Первый процесс
            customFields,
            createdAt: new Date().toISOString()
        };
        
        data.orders.push(newOrder);
        saveData();
        renderAdminTables();
        return true;
    });
}

function addCustomField() {
    const customFields = document.getElementById('customFields');
    const fieldRow = document.createElement('div');
    fieldRow.className = 'custom-field-row';
    fieldRow.style.display = 'flex';
    fieldRow.style.gap = '10px';
    fieldRow.style.marginBottom = '10px';
    
    fieldRow.innerHTML = `
        <input type="text" class="form-input field-key" placeholder="Название поля" style="flex: 1;">
        <input type="text" class="form-input field-value" placeholder="Значение" style="flex: 2;">
        <button type="button" class="btn btn-danger btn-small" onclick="this.parentElement.remove()">×</button>
    `;
    
    customFields.appendChild(fieldRow);
}

function editOrder(orderId) {
    const order = data.orders.find(o => o.id === orderId);
    if (!order) return;
    
    const content = `
        <div class="form-group">
            <label class="form-label">Номер заказа</label>
            <input type="text" class="form-input" id="orderNumber" value="${order.number}">
        </div>
        <div class="form-group">
            <label class="form-label">Изделие</label>
            <select class="form-select" id="orderProduct">
                ${data.products.map(p => `
                    <option value="${p.id}" ${p.id === order.productId ? 'selected' : ''}>${p.name}</option>
                `).join('')}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Имя клиента</label>
            <input type="text" class="form-input" id="customerName" value="${order.customerName}">
        </div>
        <div class="form-group">
            <label class="form-label">Телефон клиента</label>
            <input type="text" class="form-input" id="customerPhone" value="${order.customerPhone}">
        </div>
        <div class="form-group">
            <label class="form-label">Текущий процесс</label>
            <select class="form-select" id="currentProcess">
                ${data.processes
                    .filter(p => data.products.find(pr => pr.id === order.productId)?.processes.includes(p.id))
                    .map(p => `
                        <option value="${p.id}" ${p.id === order.currentProcessId ? 'selected' : ''}>${p.name}</option>
                    `).join('')}
                <option value="0" ${!order.currentProcessId ? 'selected' : ''}>Завершен</option>
            </select>
        </div>
        <div id="additionalFields">
            <h4>Дополнительные поля</h4>
            <div id="customFields">
                ${Object.entries(order.customFields || {}).map(([key, value]) => `
                    <div class="custom-field-row" style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <input type="text" class="form-input field-key" placeholder="Название поля" value="${key}" style="flex: 1;">
                        <input type="text" class="form-input field-value" placeholder="Значение" value="${value}" style="flex: 2;">
                        <button type="button" class="btn btn-danger btn-small" onclick="this.parentElement.remove()">×</button>
                    </div>
                `).join('')}
            </div>
            <button type="button" class="btn btn-secondary btn-small" onclick="addCustomField()">Добавить поле</button>
        </div>
    `;
    
    showModal('Редактировать заказ', content, () => {
        order.number = document.getElementById('orderNumber').value;
        order.productId = parseInt(document.getElementById('orderProduct').value);
        order.customerName = document.getElementById('customerName').value;
        order.customerPhone = document.getElementById('customerPhone').value;
        order.currentProcessId = parseInt(document.getElementById('currentProcess').value) || null;
        
        // Обновляем дополнительные поля
        order.customFields = {};
        document.querySelectorAll('.custom-field-row').forEach(row => {
            const key = row.querySelector('.field-key').value;
            const value = row.querySelector('.field-value').value;
            if (key) {
                order.customFields[key] = value;
            }
        });
        
        saveData();
        renderAdminTables();
        return true;
    });
}

function deleteOrder(orderId) {
    if (confirm('Удалить заказ?')) {
        data.orders = data.orders.filter(o => o.id !== orderId);
        saveData();
        renderAdminTables();
    }
}