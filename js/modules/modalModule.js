// Модуль модальных окон
const ModalModule = {
    // Показать модальное окно
    show(title, content, onSave = null) {
        console.log('Показываем модальное окно:', title);
        
        // Убираем существующие модальные окна
        this.close();
        
        const modal = document.createElement('div');
        modal.className = 'modal show';
        
        // Если onSave не передан, не показываем кнопку сохранения
        const footerButtons = onSave ? `
            <button class="btn btn-secondary" onclick="ModalModule.close()">Отмена</button>
            <button class="btn btn-primary" id="modal-save-btn">Сохранить</button>
        ` : `
            <button class="btn btn-secondary" onclick="ModalModule.close()">Закрыть</button>
        `;
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    ${footerButtons}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Обработчик сохранения (только если onSave передан)
        if (onSave) {
            const saveBtn = document.getElementById('modal-save-btn');
            if (saveBtn) {
                saveBtn.onclick = () => {
                    try {
                        if (onSave()) {
                            this.close();
                        }
                    } catch (error) {
                        console.error('Ошибка при сохранении:', error);
                        alert('Ошибка: ' + error.message);
                    }
                };
            }
        }
        
        // Закрытие по клику на фон
        modal.onclick = (e) => {
            if (e.target === modal) {
                this.close();
            }
        };
        
        // Закрытие по ESC
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                this.close();
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
    },

    // Закрыть модальное окно
    close() {
        const modal = document.querySelector('.modal');
        if (modal) {
            modal.remove();
        }
    },

    // Добавить кастомное поле в форму
    addCustomField() {
        const container = document.getElementById('custom-fields');
        if (!container) {
            console.error('Контейнер custom-fields не найден');
            return;
        }
        
        const fieldRow = OrderUtils.createCustomFieldRow();
        container.appendChild(fieldRow);
        console.log('Кастомное поле добавлено');
    }
};

window.ModalModule = ModalModule;

// Совместимость с legacy кодом
window.showModal = (title, content, onSave) => ModalModule.show(title, content, onSave);
window.closeModal = () => ModalModule.close();
window.addCustomField = () => ModalModule.addCustomField();
