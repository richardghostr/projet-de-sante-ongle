// utils.js — CONFIG, AppState, Utils
export const CONFIG = {
    API_BASE_URL: 'http://localhost:8000/api',
    IA_URL: 'http://localhost:5000',
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    TOKEN_KEY: 'unguealhealth_token',
    USER_KEY: 'unguealhealth_user',
    THEME_KEY: 'unguealhealth_theme'
};

export const AppState = {
    user: null,
    token: null,
    currentPage: 'landing',
    isLoading: false,
    analyses: [],
    currentAnalysis: null
};

export const Utils = {
    setStorage(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },

    getStorage(key) {
        const item = localStorage.getItem(key);
        try {
            return item ? JSON.parse(item) : null;
        } catch {
            return null;
        }
    },

    removeStorage(key) {
        localStorage.removeItem(key);
    },

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    formatDateShort(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    isValidPassword(password) {
        return password && password.length >= 8;
    },

    getSeverityColor(severity) {
        const colors = {
            'faible': '#10B981',
            'low': '#10B981',
            'modere': '#F59E0B',
            'moderate': '#F59E0B',
            'eleve': '#EF4444',
            'high': '#EF4444',
            'critique': '#DC2626',
            'critical': '#DC2626'
        };
        return colors[(severity || '').toLowerCase()] || '#6B7280';
    },

    getSeverityClass(severity) {
        const classes = {
            'faible': 'severity-low',
            'low': 'severity-low',
            'modere': 'severity-medium',
            'moderate': 'severity-medium',
            'eleve': 'severity-high',
            'high': 'severity-high',
            'critique': 'severity-critical',
            'critical': 'severity-critical'
        };
        return classes[(severity || '').toLowerCase()] || 'severity-unknown';
    },

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
};
