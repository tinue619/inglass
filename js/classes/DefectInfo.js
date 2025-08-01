/**
 * Класс информации о браке
 */
class DefectInfo {
    constructor(data = {}) {
        this.isDefective = data.isDefective || false;
        this.defectReason = data.defectReason || '';
        this.defectDate = data.defectDate || null;
        this.defectUser = data.defectUser || '';
        this.originalProcessId = data.originalProcessId || null;
        this.defectFromProcess = data.defectFromProcess || '';
        this.isRejected = data.isRejected || false;
        
        // Информация об устранении брака
        this.fixedDate = data.fixedDate || null;
        this.fixedUser = data.fixedUser || '';
        this.fixComment = data.fixComment || '';
    }

    /**
     * Отметить как брак
     */
    markAsDefective(reason, user, originalProcessId, fromProcess, isRejected = false) {
        this.isDefective = true;
        this.defectReason = reason;
        this.defectDate = new Date().toISOString();
        this.defectUser = user?.name || 'Неизвестный пользователь';
        this.originalProcessId = originalProcessId;
        this.defectFromProcess = fromProcess;
        this.isRejected = isRejected;
        
        // Сбрасываем информацию об устранении
        this.fixedDate = null;
        this.fixedUser = '';
        this.fixComment = '';
    }

    /**
     * Отметить как исправленный
     */
    markAsFixed(comment, user) {
        this.isDefective = false;
        this.fixedDate = new Date().toISOString();
        this.fixedUser = user?.name || 'Неизвестный пользователь';
        this.fixComment = comment;
    }

    /**
     * Получить статус брака
     */
    getStatus() {
        if (!this.isDefective && this.fixedDate) {
            return 'fixed'; // Был в браке, но исправлен
        }
        if (this.isDefective) {
            return 'defective'; // В браке
        }
        return 'normal'; // Нормальное состояние
    }

    /**
     * Получить описание статуса
     */
    getStatusDescription() {
        switch (this.getStatus()) {
            case 'defective':
                return `В браке: ${this.defectReason}`;
            case 'fixed':
                return `Брак устранен: ${this.fixComment}`;
            default:
                return 'Нормальное состояние';
        }
    }

    /**
     * Проверить, нужно ли возвращать на исходный процесс
     */
    shouldReturnToOriginalProcess() {
        return this.isDefective && this.originalProcessId;
    }

    toJSON() {
        return { ...this };
    }

    static fromJSON(data) {
        return new DefectInfo(data);
    }
}

window.DefectInfo = DefectInfo;
