/**
 * UNGUEALHEALTH - Application JavaScript Complete
 * Gestion de l'application de diagnostic des ongles par IA
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    API_BASE_URL: 'http://localhost:8000/api',
    IA_URL: 'http://localhost:5000',
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    TOKEN_KEY: 'unguealhealth_token',
    USER_KEY: 'unguealhealth_user',
    THEME_KEY: 'unguealhealth_theme'
};

// ============================================
// STATE MANAGEMENT
// ============================================
const AppState = {
    user: null,
    token: null,
    currentPage: 'landing',
    isLoading: false,
    analyses: [],
    currentAnalysis: null
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
const Utils = {
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

// ============================================
// API SERVICE
// ============================================
const ApiService = {
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        
        const defaultHeaders = {
            'Accept': 'application/json'
        };

        if (AppState.token) {
            defaultHeaders['Authorization'] = `Bearer ${AppState.token}`;
        }

        if (!(options.body instanceof FormData)) {
            defaultHeaders['Content-Type'] = 'application/json';
        }

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };

        try {
            UI.showLoading();
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                const err = new Error(data.message || data.error || 'Une erreur est survenue');
                if (data.errors) err.details = data.errors;
                throw err;
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        } finally {
            UI.hideLoading();
        }
    },

    // Auth endpoints
    async register(userData) {
        return this.request('/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },

    async login(credentials) {
        return this.request('/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    },

    async logout() {
        return this.request('/logout', { method: 'POST' });
    },

    async forgotPassword(email) {
        return this.request('/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    },

    // Profile endpoints
    async getProfile() {
        return this.request('/profile', { method: 'GET' });
    },

    async updateProfile(profileData) {
        return this.request('/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    },

    async changePassword(passwordData) {
        return this.request('/change-password', {
            method: 'PUT',
            body: JSON.stringify(passwordData)
        });
    },

    async deleteAccount() {
        return this.request('/profile', { method: 'DELETE' });
    },

    // Analysis endpoints
    async uploadImage(file) {
        const formData = new FormData();
        formData.append('image', file);
        return this.request('/upload-image', {
            method: 'POST',
            body: formData
        });
    },

    async analyzeImage(analysisId) {
        return this.request('/analyze-image', {
            method: 'POST',
            body: JSON.stringify({ analysis_id: analysisId })
        });
    },

    // History endpoints
    async getHistory(page = 1, limit = 10) {
        return this.request(`/history?page=${page}&limit=${limit}`, { method: 'GET' });
    },

    async getAnalysisDetail(analysisId) {
        return this.request(`/history/${analysisId}`, { method: 'GET' });
    },

    async deleteAnalysis(analysisId) {
        return this.request(`/history/${analysisId}`, { method: 'DELETE' });
    },

    async getStatistics() {
        return this.request('/history/stats', { method: 'GET' });
    },

    async exportHistory(format = 'json') {
        return this.request(`/history/export?format=${format}`, { method: 'GET' });
    }
};

// ============================================
// UI CONTROLLER
// ============================================
const UI = {
    elements: {},

    init() {
        this.cacheElements();
        this.bindGlobalEvents();
        this.initTheme();
    },

    cacheElements() {
        this.elements = {
            app: document.getElementById('app'),
            loadingOverlay: document.getElementById('loading-overlay'),
            toastContainer: document.getElementById('toast-container')
        };
    },

    bindGlobalEvents() {
        window.addEventListener('hashchange', () => Router.handleRoute());
        
        document.addEventListener('click', (e) => {
            // Close mobile menu on outside click
            const mobileMenu = document.getElementById('mobile-menu');
            const mobileBtn = document.getElementById('mobile-menu-btn');
            if (mobileMenu?.classList.contains('active')) {
                if (!mobileMenu.contains(e.target) && !mobileBtn?.contains(e.target)) {
                    mobileMenu.classList.remove('active');
                }
            }

            // Close sidebar on outside click (mobile)
            const sidebar = document.querySelector('.sidebar');
            const sidebarToggle = document.getElementById('sidebar-toggle');
            if (sidebar?.classList.contains('active') && window.innerWidth < 1024) {
                if (!sidebar.contains(e.target) && !sidebarToggle?.contains(e.target)) {
                    sidebar.classList.remove('active');
                }
            }
        });
    },

    initTheme() {
        const savedTheme = Utils.getStorage(CONFIG.THEME_KEY);
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
        }
    },

    toggleTheme() {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        Utils.setStorage(CONFIG.THEME_KEY, isDark ? 'dark' : 'light');
        
        // Update toggle if exists
        const toggle = document.getElementById('dark-mode-toggle');
        if (toggle) toggle.checked = isDark;
    },

    showLoading() {
        AppState.isLoading = true;
        let overlay = this.elements.loadingOverlay || document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.innerHTML = '<div class="loading-spinner"></div>';
            document.body.appendChild(overlay);
            this.elements.loadingOverlay = overlay;
        }
        overlay.classList.add('active');
    },

    hideLoading() {
        AppState.isLoading = false;
        const overlay = this.elements.loadingOverlay || document.getElementById('loading-overlay');
        if (overlay) overlay.classList.remove('active');
    },

    showToast(message, type = 'info', duration = 4000) {
        let container = this.elements.toastContainer || document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
            this.elements.toastContainer = container;
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>',
            error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `;

        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    showModal(content, options = {}) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal ${options.size || ''}">
                ${options.title ? `
                    <div class="modal-header">
                        <h3>${options.title}</h3>
                        <button class="modal-close" onclick="UI.closeModal(this)">&times;</button>
                    </div>
                ` : ''}
                <div class="modal-body">${content}</div>
                ${options.footer ? `<div class="modal-footer">${options.footer}</div>` : ''}
            </div>
        `;

        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('active'));

        if (!options.persistent) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal(modal);
            });
        }

        return modal;
    },

    closeModal(element) {
        const modal = element.closest ? element.closest('.modal-overlay') : element;
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    },

    showConfirm(message, onConfirm, onCancel) {
        const modal = this.showModal(`<p>${message}</p>`, {
            title: 'Confirmation',
            footer: `
                <button class="btn btn-secondary" id="modal-cancel">Annuler</button>
                <button class="btn btn-danger" id="modal-confirm">Confirmer</button>
            `,
            persistent: true
        });

        modal.querySelector('#modal-confirm').addEventListener('click', () => {
            this.closeModal(modal);
            if (onConfirm) onConfirm();
        });

        modal.querySelector('#modal-cancel').addEventListener('click', () => {
            this.closeModal(modal);
            if (onCancel) onCancel();
        });
    },

    render(pageContent) {
        const app = this.elements.app || document.getElementById('app');
        if (app) {
            app.innerHTML = pageContent;
        }
    }
};

// ============================================
// ROUTER
// ============================================
const Router = {
    routes: {
        '': 'landing',
        'landing': 'landing',
        'login': 'login',
        'register': 'register',
        'forgot-password': 'forgotPassword',
        'dashboard': 'dashboard',
        'analyze': 'analyze',
        'history': 'history',
        'analysis': 'analysisDetail',
        'profile': 'profile',
        'about': 'about',
        'contact': 'contact'
    },

    init() {
        this.handleRoute();
    },

    navigate(route) {
        window.location.hash = route;
    },

    handleRoute() {
        const hash = window.location.hash.slice(1) || '';
        const [route, ...params] = hash.split('/');
        const pageName = this.routes[route] || 'notFound';

        // Protected routes check
        const protectedRoutes = ['dashboard', 'analyze', 'history', 'analysis', 'profile'];
        if (protectedRoutes.includes(route) && !Auth.isAuthenticated()) {
            this.navigate('login');
            return;
        }

        // Redirect if already logged in
        const authRoutes = ['login', 'register', 'forgot-password'];
        if (authRoutes.includes(route) && Auth.isAuthenticated()) {
            this.navigate('dashboard');
            return;
        }

        AppState.currentPage = pageName;
        
        if (Pages[pageName]) {
            Pages[pageName](params);
        } else {
            Pages.notFound();
        }
    }
};

// ============================================
// AUTH SERVICE
// ============================================
const Auth = {
    init() {
        const token = Utils.getStorage(CONFIG.TOKEN_KEY);
        const user = Utils.getStorage(CONFIG.USER_KEY);

        if (token && user) {
            AppState.token = token;
            AppState.user = user;
        }
    },

    isAuthenticated() {
        return !!AppState.token && !!AppState.user;
    },

    setSession(token, user) {
        AppState.token = token;
        AppState.user = user;
        Utils.setStorage(CONFIG.TOKEN_KEY, token);
        Utils.setStorage(CONFIG.USER_KEY, user);
    },

    clearSession() {
        AppState.token = null;
        AppState.user = null;
        Utils.removeStorage(CONFIG.TOKEN_KEY);
        Utils.removeStorage(CONFIG.USER_KEY);
    },

    async login(email, password) {
        try {
            const response = await ApiService.login({ email, password });
            if (response.success && response.data) {
                this.setSession(response.data.token, response.data.user);
                UI.showToast('Connexion reussie!', 'success');
                Router.navigate('dashboard');
            }
        } catch (error) {
            UI.showToast(error.message || 'Erreur de connexion', 'error');
            throw error;
        }
    },

    async register(userData) {
        try {
            const response = await ApiService.register(userData);
            if (response.success) {
                UI.showToast('Inscription reussie! Veuillez vous connecter.', 'success');
                Router.navigate('login');
            }
        } catch (error) {
            UI.showToast(error.message || 'Erreur d\'inscription', 'error');
            throw error;
        }
    },

    async logout() {
        try {
            await ApiService.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearSession();
            UI.showToast('Deconnexion reussie', 'info');
            Router.navigate('landing');
        }
    }
};

// ============================================
// COMPONENTS
// ============================================
const Components = {
    logo(size = 'default') {
        const sizeClass = size === 'small' ? 'logo-sm' : '';
        return `
            <svg class="logo-icon ${sizeClass}" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="18" stroke="currentColor" stroke-width="2"/>
                <path d="M20 8c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12" 
                      stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <circle cx="20" cy="20" r="4" fill="currentColor"/>
            </svg>
        `;
    },

    sidebar() {
        const user = AppState.user || {};
        const currentPage = AppState.currentPage;
        const initials = `${(user.first_name || 'U')[0]}${(user.last_name || 'N')[0]}`.toUpperCase();
        
        return `
            <aside class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <a href="#dashboard" class="logo">
                        ${this.logo()}
                        <span>UngueaHealth</span>
                    </a>
                </div>
                <nav class="sidebar-nav">
                    <a href="#dashboard" class="nav-item ${currentPage === 'dashboard' ? 'active' : ''}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                        </svg>
                        <span>Dashboard</span>
                    </a>
                    <a href="#analyze" class="nav-item ${currentPage === 'analyze' ? 'active' : ''}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                            <circle cx="12" cy="13" r="4"/>
                        </svg>
                        <span>Nouvelle Analyse</span>
                    </a>
                    <a href="#history" class="nav-item ${currentPage === 'history' ? 'active' : ''}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
                        </svg>
                        <span>Historique</span>
                    </a>
                    <a href="#profile" class="nav-item ${currentPage === 'profile' ? 'active' : ''}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                        <span>Mon Profil</span>
                    </a>
                </nav>
                <div class="sidebar-footer">
                    <div class="user-info">
                        <div class="user-avatar">${initials}</div>
                        <div class="user-details">
                            <span class="user-name">${user.first_name || ''} ${user.last_name || ''}</span>
                            <span class="user-email">${user.email || ''}</span>
                        </div>
                    </div>
                    <button class="btn btn-outline btn-sm btn-block" onclick="Auth.logout()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                            <polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Deconnexion
                    </button>
                </div>
            </aside>
        `;
    },

    dashboardHeader(title) {
        return `
            <header class="dashboard-header">
                <div class="header-left">
                    <button class="mobile-sidebar-toggle" id="sidebar-toggle" onclick="document.getElementById('sidebar').classList.toggle('active')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="3" y1="12" x2="21" y2="12"/>
                            <line x1="3" y1="6" x2="21" y2="6"/>
                            <line x1="3" y1="18" x2="21" y2="18"/>
                        </svg>
                    </button>
                    <h1>${title}</h1>
                </div>
                <div class="header-right">
                    <button class="btn btn-icon" onclick="UI.toggleTheme()" title="Changer le theme">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="5"/>
                            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                        </svg>
                    </button>
                </div>
            </header>
        `;
    },

    analysisCard(analysis) {
        const severityClass = Utils.getSeverityClass(analysis.severite || analysis.severity || 'faible');
        const confidence = Math.round((analysis.confiance || analysis.confidence || 0) * 100);
        const imagePath = analysis.image_path || '';
        const imageUrl = imagePath.startsWith('http') ? imagePath : `${CONFIG.API_BASE_URL.replace('/api', '')}/${imagePath}`;
        
        return `
            <div class="analysis-card" onclick="Router.navigate('analysis/${analysis.id}')">
                <div class="analysis-image">
                    <img src="${imageUrl}" alt="Analyse" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f3f4f6%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%239ca3af%22>Image</text></svg>'">
                </div>
                <div class="analysis-info">
                    <div class="analysis-diagnosis">
                        <span class="diagnosis-badge ${severityClass}">${analysis.diagnostic || analysis.diagnosis || 'En attente'}</span>
                    </div>
                    <div class="analysis-meta">
                        <span class="confidence">${confidence}% confiance</span>
                        <span class="date">${Utils.formatDateShort(analysis.date_analyse || analysis.created_at)}</span>
                    </div>
                </div>
            </div>
        `;
    },

    emptyState(icon, message, actionText, actionHref) {
        return `
            <div class="empty-state">
                ${icon}
                <p>${message}</p>
                ${actionText && actionHref ? `<a href="${actionHref}" class="btn btn-primary">${actionText}</a>` : ''}
            </div>
        `;
    }
};

// Pages moved to module `frontend/js/pages.js`. Use window.Pages shim for compatibility.
const Pages = window.Pages || {
    landing: () => {},
    login: () => {},
    register: () => {},
    forgotPassword: () => {},
    dashboard: () => {},
    analyze: () => {},
    history: () => {},
    analysisDetail: () => {},
    profile: () => {},
    about: () => {},
    contact: () => {},
    notFound: () => {}
};

// Forms moved to modules (frontend/js/forms.js). Use window.Forms (shim below for safety).
const Forms = window.Forms || {
    togglePassword: () => {},
    initLoginForm: () => {},
    initRegisterForm: () => {},
    initForgotForm: () => {},
    checkPasswordStrength: () => ({ class: 'weak', text: 'Tres faible', percent: 20 })
};

// ============================================
// DASHBOARD CONTROLLER (shim)
// Replaced legacy implementation with a shim that delegates to window.Dashboard
// If an ES module provides the real controller it will be used; otherwise these
// methods are no-ops to keep the legacy app running during incremental migration.
const Dashboard = window.Dashboard || {
    async init(...args) { return window.Dashboard?.init?.(...args); },
    async loadStats(...args) { return window.Dashboard?.loadStats?.(...args); },
    async loadRecentAnalyses(...args) { return window.Dashboard?.loadRecentAnalyses?.(...args); }
};

// ============================================
// ANALYSIS CONTROLLER (shim)
// Delegates to window.Analysis when available (module migration target).
const Analysis = window.Analysis || {
    selectedFile: null,
    analysisId: null,
    init(...args) { return window.Analysis?.init?.(...args); },
    bindEvents(...args) { return window.Analysis?.bindEvents?.(...args); },
    handleFile(...args) { return window.Analysis?.handleFile?.(...args); },
    resetUpload(...args) { return window.Analysis?.resetUpload?.(...args); },
    async startAnalysis(...args) { return window.Analysis?.startAnalysis?.(...args); },
    simulateProgress(...args) { return window.Analysis?.simulateProgress?.(...args); },
    showResults(...args) { return window.Analysis?.showResults?.(...args); }
};

// ============================================
// HISTORY CONTROLLER (shim)
// Delegates to window.History when available.
const History = window.History || {
    currentPage: 1,
    totalPages: 1,
    async init(...args) { return window.History?.init?.(...args); },
    bindEvents(...args) { return window.History?.bindEvents?.(...args); },
    async loadHistory(...args) { return window.History?.loadHistory?.(...args); },
    renderHistoryItem(...args) { return window.History?.renderHistoryItem?.(...args); },
    renderPagination(...args) { return window.History?.renderPagination?.(...args); },
    goToPage(...args) { return window.History?.goToPage?.(...args); },
    deleteAnalysis(...args) { return window.History?.deleteAnalysis?.(...args); },
    async exportHistory(...args) { return window.History?.exportHistory?.(...args); }
};

// ============================================
// ANALYSIS DETAIL CONTROLLER (shim)
const AnalysisDetail = window.AnalysisDetail || {
    async init(...args) { return window.AnalysisDetail?.init?.(...args); },
    render(...args) { return window.AnalysisDetail?.render?.(...args); },
    delete(...args) { return window.AnalysisDetail?.delete?.(...args); }
};

// ============================================
// PROFILE CONTROLLER (shim)
const Profile = window.Profile || {
    async init(...args) { return window.Profile?.init?.(...args); },
    bindEvents(...args) { return window.Profile?.bindEvents?.(...args); },
    switchTab(...args) { return window.Profile?.switchTab?.(...args); },
    async loadProfile(...args) { return window.Profile?.loadProfile?.(...args); },
    async updateProfile(...args) { return window.Profile?.updateProfile?.(...args); },
    async changePassword(...args) { return window.Profile?.changePassword?.(...args); },
    deleteAccount(...args) { return window.Profile?.deleteAccount?.(...args); }
};

// APP INITIALIZATION
// Initialization moved to `frontend/js/main.js` during module migration.
