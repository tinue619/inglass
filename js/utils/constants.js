// Константы приложения
const APP_CONSTANTS = {
    STORAGE_KEYS: {
        CRM_DATA: 'crmData',
        CURRENT_USER: 'currentUser'
    },
    
    EVENT_TYPES: {
        CREATED: 'created',
        MOVED: 'moved',
        DEFECT_SENT: 'defect_sent',
        DEFECT_FIXED: 'defect_fixed',
        REJECTED: 'rejected'
    },
    
    ORDER_STATUS: {
        PROCESS: 'status-process',
        DONE: 'status-done',
        PROBLEM: 'status-problem'
    },
    
    DEFAULTS: {
        ADMIN_USER: {
            id: 1,
            name: "Администратор",
            phone: "+7 777 777 7777",
            password: "1488",
            isAdmin: true,
            processes: [],
            canCreateOrders: true
        }
    }
};

window.APP_CONSTANTS = APP_CONSTANTS;
