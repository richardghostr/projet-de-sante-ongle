/**
 * UNGUEALHEALTH - Application JavaScript Complete
 * Gestion de l'application de diagnostic des ongles par IA
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    API_BASE_URL: 'http://localhost:8080/api',
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
                throw new Error(data.message || data.error || 'Une erreur est survenue');
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
        return this.request('/profile/password', {
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
        return this.request('/history/statistics', { method: 'GET' });
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

// ============================================
// PAGES
// ============================================
const Pages = {
    // Landing Page
    landing() {
        const isAuth = Auth.isAuthenticated();
        UI.render(`
            <div class="landing-page">
                <header class="header">
                    <div class="container">
                        <nav class="nav">
                            <a href="#landing" class="logo">
                                ${Components.logo()}
                                <span>UngueaHealth</span>
                            </a>
                            <div class="nav-links" id="nav-links">
                                <a href="#about">A propos</a>
                                <a href="#contact">Contact</a>
                                ${isAuth ? `
                                    <a href="#dashboard" class="btn btn-primary">Dashboard</a>
                                ` : `
                                    <a href="#login" class="btn btn-outline">Connexion</a>
                                    <a href="#register" class="btn btn-primary">Inscription</a>
                                `}
                            </div>
                            <button class="mobile-menu-btn" id="mobile-menu-btn" onclick="document.getElementById('nav-links').classList.toggle('active')">
                                <span></span><span></span><span></span>
                            </button>
                        </nav>
                    </div>
                </header>

                <section class="hero">
                    <div class="container">
                        <div class="hero-content">
                            <h1 class="hero-title">
                                Diagnostiquez la sante de vos ongles avec
                                <span class="text-gradient">l'Intelligence Artificielle</span>
                            </h1>
                            <p class="hero-subtitle">
                                UngueaHealth utilise des algorithmes avances de deep learning pour analyser 
                                vos ongles et detecter les signes precoces de pathologies ungueales.
                            </p>
                            <div class="hero-actions">
                                <a href="${isAuth ? '#analyze' : '#register'}" class="btn btn-primary btn-lg">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                                        <circle cx="12" cy="13" r="4"/>
                                    </svg>
                                    Commencer l'analyse
                                </a>
                                <a href="#about" class="btn btn-outline btn-lg">En savoir plus</a>
                            </div>
                        </div>
                        <div class="hero-image">
                            <div class="hero-visual">
                                <div class="scan-animation">
                                    <div class="scan-line"></div>
                                    <div class="nail-icon">
                                        <svg viewBox="0 0 100 140" fill="none">
                                            <path d="M20 60 Q20 20 50 10 Q80 20 80 60 L80 130 Q80 135 75 138 L25 138 Q20 135 20 130 Z" 
                                                  stroke="currentColor" stroke-width="3" fill="none"/>
                                            <path d="M30 70 Q30 40 50 30 Q70 40 70 70" stroke="currentColor" stroke-width="2" opacity="0.5"/>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="features" id="features">
                    <div class="container">
                        <h2 class="section-title">Comment ca fonctionne ?</h2>
                        <div class="features-grid">
                            <div class="feature-card">
                                <div class="feature-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                        <circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/>
                                    </svg>
                                </div>
                                <h3>1. Prenez une photo</h3>
                                <p>Capturez une image claire de votre ongle avec votre smartphone ou camera.</p>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                                        <path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                                    </svg>
                                </div>
                                <h3>2. Analyse IA</h3>
                                <p>Notre modele de deep learning analyse l'image en quelques secondes.</p>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                        <polyline points="14,2 14,8 20,8"/>
                                        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                                    </svg>
                                </div>
                                <h3>3. Resultats detailles</h3>
                                <p>Recevez un diagnostic complet avec des recommandations personnalisees.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="pathologies">
                    <div class="container">
                        <h2 class="section-title">Pathologies detectees</h2>
                        <p class="section-subtitle">Notre IA peut identifier plus de 10 types de pathologies ungueales</p>
                        <div class="pathologies-grid">
                            <div class="pathology-item"><span class="pathology-badge healthy">Sain</span><span>Ongle normal</span></div>
                            <div class="pathology-item"><span class="pathology-badge fungal">Mycose</span><span>Onychomycose</span></div>
                            <div class="pathology-item"><span class="pathology-badge psoriasis">Psoriasis</span><span>Psoriasis ungeal</span></div>
                            <div class="pathology-item"><span class="pathology-badge melanoma">Melanome</span><span>Melanome sous-ungeal</span></div>
                            <div class="pathology-item"><span class="pathology-badge trauma">Traumatisme</span><span>Lesions traumatiques</span></div>
                            <div class="pathology-item"><span class="pathology-badge deficiency">Carence</span><span>Carences nutritionnelles</span></div>
                        </div>
                    </div>
                </section>

                <section class="stats">
                    <div class="container">
                        <div class="stats-grid">
                            <div class="stat-item"><span class="stat-number">95%</span><span class="stat-label">Precision du diagnostic</span></div>
                            <div class="stat-item"><span class="stat-number">50K+</span><span class="stat-label">Analyses effectuees</span></div>
                            <div class="stat-item"><span class="stat-number">10K+</span><span class="stat-label">Utilisateurs actifs</span></div>
                            <div class="stat-item"><span class="stat-number">15+</span><span class="stat-label">Pathologies detectables</span></div>
                        </div>
                    </div>
                </section>

                <section class="cta">
                    <div class="container">
                        <div class="cta-content">
                            <h2>Pret a prendre soin de vos ongles ?</h2>
                            <p>Rejoignez des milliers d'utilisateurs qui font confiance a UngueaHealth</p>
                            <a href="${isAuth ? '#analyze' : '#register'}" class="btn btn-light btn-lg">Commencer gratuitement</a>
                        </div>
                    </div>
                </section>

                <footer class="footer">
                    <div class="container">
                        <div class="footer-content">
                            <div class="footer-brand">
                                <a href="#landing" class="logo">${Components.logo()}<span>UngueaHealth</span></a>
                                <p>Diagnostic intelligent des pathologies ungueales par IA.</p>
                            </div>
                            <div class="footer-links">
                                <h4>Navigation</h4>
                                <a href="#about">A propos</a>
                                <a href="#contact">Contact</a>
                                <a href="#login">Connexion</a>
                            </div>
                            <div class="footer-links">
                                <h4>Legal</h4>
                                <a href="#">Mentions legales</a>
                                <a href="#">Politique de confidentialite</a>
                                <a href="#">CGU</a>
                            </div>
                        </div>
                        <div class="footer-bottom">
                            <p>2024 UngueaHealth. Tous droits reserves.</p>
                        </div>
                    </div>
                </footer>
            </div>
        `);
    },

    // Login Page
    login() {
        UI.render(`
            <div class="auth-page">
                <div class="auth-container">
                    <div class="auth-card">
                        <div class="auth-header">
                            <a href="#landing" class="logo">${Components.logo()}<span>UngueaHealth</span></a>
                            <h1>Connexion</h1>
                            <p>Connectez-vous pour acceder a votre espace personnel</p>
                        </div>
                        <form id="login-form" class="auth-form">
                            <div class="form-group">
                                <label for="email">Email</label>
                                <input type="email" id="email" name="email" required placeholder="votre@email.com" autocomplete="email">
                            </div>
                            <div class="form-group">
                                <label for="password">Mot de passe</label>
                                <div class="password-input">
                                    <input type="password" id="password" name="password" required placeholder="Votre mot de passe" autocomplete="current-password">
                                    <button type="button" class="toggle-password" onclick="Forms.togglePassword('password')">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div class="form-options">
                                <label class="checkbox-label">
                                    <input type="checkbox" name="remember"><span>Se souvenir de moi</span>
                                </label>
                                <a href="#forgot-password" class="forgot-link">Mot de passe oublie ?</a>
                            </div>
                            <button type="submit" class="btn btn-primary btn-block">Se connecter</button>
                        </form>
                        <div class="auth-footer">
                            <p>Pas encore de compte ? <a href="#register">Inscrivez-vous</a></p>
                        </div>
                    </div>
                </div>
            </div>
        `);

        Forms.initLoginForm();
    },

    // Register Page
    register() {
        UI.render(`
            <div class="auth-page">
                <div class="auth-container">
                    <div class="auth-card">
                        <div class="auth-header">
                            <a href="#landing" class="logo">${Components.logo()}<span>UngueaHealth</span></a>
                            <h1>Inscription</h1>
                            <p>Creez votre compte pour commencer</p>
                        </div>
                        <form id="register-form" class="auth-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="first_name">Prenom</label>
                                    <input type="text" id="first_name" name="first_name" required placeholder="Votre prenom">
                                </div>
                                <div class="form-group">
                                    <label for="last_name">Nom</label>
                                    <input type="text" id="last_name" name="last_name" required placeholder="Votre nom">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="email">Email</label>
                                <input type="email" id="email" name="email" required placeholder="votre@email.com" autocomplete="email">
                            </div>
                            <div class="form-group">
                                <label for="password">Mot de passe</label>
                                <div class="password-input">
                                    <input type="password" id="password" name="password" required placeholder="Minimum 8 caracteres" minlength="8">
                                    <button type="button" class="toggle-password" onclick="Forms.togglePassword('password')">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                        </svg>
                                    </button>
                                </div>
                                <div class="password-strength" id="password-strength"></div>
                            </div>
                            <div class="form-group">
                                <label for="password_confirm">Confirmer le mot de passe</label>
                                <div class="password-input">
                                    <input type="password" id="password_confirm" name="password_confirm" required placeholder="Confirmez votre mot de passe">
                                    <button type="button" class="toggle-password" onclick="Forms.togglePassword('password_confirm')">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" name="terms" required>
                                    <span>J'accepte les <a href="#">conditions d'utilisation</a></span>
                                </label>
                            </div>
                            <button type="submit" class="btn btn-primary btn-block">Creer mon compte</button>
                        </form>
                        <div class="auth-footer">
                            <p>Deja inscrit ? <a href="#login">Connectez-vous</a></p>
                        </div>
                    </div>
                </div>
            </div>
        `);

        Forms.initRegisterForm();
    },

    // Forgot Password Page
    forgotPassword() {
        UI.render(`
            <div class="auth-page">
                <div class="auth-container">
                    <div class="auth-card">
                        <div class="auth-header">
                            <a href="#landing" class="logo">${Components.logo()}<span>UngueaHealth</span></a>
                            <h1>Mot de passe oublie</h1>
                            <p>Entrez votre email pour recevoir un lien de reinitialisation</p>
                        </div>
                        <form id="forgot-form" class="auth-form">
                            <div class="form-group">
                                <label for="email">Email</label>
                                <input type="email" id="email" name="email" required placeholder="votre@email.com">
                            </div>
                            <button type="submit" class="btn btn-primary btn-block">Envoyer le lien</button>
                        </form>
                        <div class="auth-footer">
                            <p><a href="#login">Retour a la connexion</a></p>
                        </div>
                    </div>
                </div>
            </div>
        `);

        Forms.initForgotForm();
    },

    // Dashboard Page
    dashboard() {
        UI.render(`
            <div class="dashboard-layout">
                ${Components.sidebar()}
                <main class="dashboard-main">
                    ${Components.dashboardHeader('Dashboard')}
                    <div class="dashboard-content">
                        <div class="stats-cards">
                            <div class="stat-card">
                                <div class="stat-card-icon blue">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                        <polyline points="14,2 14,8 20,8"/>
                                    </svg>
                                </div>
                                <div class="stat-card-info">
                                    <span class="stat-card-value" id="total-analyses">--</span>
                                    <span class="stat-card-label">Analyses totales</span>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-card-icon green">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                        <polyline points="22,4 12,14.01 9,11.01"/>
                                    </svg>
                                </div>
                                <div class="stat-card-info">
                                    <span class="stat-card-value" id="healthy-count">--</span>
                                    <span class="stat-card-label">Ongles sains</span>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-card-icon orange">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                                    </svg>
                                </div>
                                <div class="stat-card-info">
                                    <span class="stat-card-value" id="pathology-count">--</span>
                                    <span class="stat-card-label">Pathologies detectees</span>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-card-icon purple">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                                        <line x1="3" y1="10" x2="21" y2="10"/>
                                    </svg>
                                </div>
                                <div class="stat-card-info">
                                    <span class="stat-card-value" id="last-analysis">--</span>
                                    <span class="stat-card-label">Derniere analyse</span>
                                </div>
                            </div>
                        </div>

                        <div class="dashboard-section">
                            <h2>Actions rapides</h2>
                            <div class="quick-actions">
                                <a href="#analyze" class="quick-action-card">
                                    <div class="quick-action-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                                            <circle cx="12" cy="13" r="4"/>
                                        </svg>
                                    </div>
                                    <h3>Nouvelle analyse</h3>
                                    <p>Analyser une photo d'ongle</p>
                                </a>
                                <a href="#history" class="quick-action-card">
                                    <div class="quick-action-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
                                        </svg>
                                    </div>
                                    <h3>Historique</h3>
                                    <p>Voir toutes vos analyses</p>
                                </a>
                                <a href="#profile" class="quick-action-card">
                                    <div class="quick-action-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                            <circle cx="12" cy="7" r="4"/>
                                        </svg>
                                    </div>
                                    <h3>Mon profil</h3>
                                    <p>Gerer vos informations</p>
                                </a>
                            </div>
                        </div>

                        <div class="dashboard-section">
                            <div class="section-header">
                                <h2>Analyses recentes</h2>
                                <a href="#history" class="btn btn-outline btn-sm">Voir tout</a>
                            </div>
                            <div class="recent-analyses" id="recent-analyses">
                                <div class="loading-placeholder">Chargement...</div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        `);

        Dashboard.init();
    },

    // Analyze Page
    analyze() {
        UI.render(`
            <div class="dashboard-layout">
                ${Components.sidebar()}
                <main class="dashboard-main">
                    ${Components.dashboardHeader('Nouvelle Analyse')}
                    <div class="dashboard-content">
                        <div class="analyze-container">
                            <div class="upload-section" id="upload-section">
                                <div class="upload-area" id="upload-area">
                                    <div class="upload-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                            <polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/>
                                        </svg>
                                    </div>
                                    <h3>Deposez votre image ici</h3>
                                    <p>ou cliquez pour selectionner un fichier</p>
                                    <p class="upload-hint">Formats acceptes: JPG, PNG, WebP (max 10MB)</p>
                                    <input type="file" id="image-input" accept="image/jpeg,image/png,image/webp" hidden>
                                </div>
                                <div class="upload-tips">
                                    <h4>Conseils pour une bonne photo :</h4>
                                    <ul>
                                        <li>Assurez-vous d'avoir un bon eclairage</li>
                                        <li>Prenez la photo de pres et bien nette</li>
                                        <li>L'ongle doit etre propre et sec</li>
                                        <li>Evitez le vernis a ongles</li>
                                    </ul>
                                </div>
                            </div>

                            <div class="preview-section hidden" id="preview-section">
                                <div class="preview-card">
                                    <div class="preview-image-container">
                                        <img id="preview-image" src="" alt="Preview">
                                        <button class="btn btn-icon remove-image" id="remove-image">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                            </svg>
                                        </button>
                                    </div>
                                    <div class="preview-info">
                                        <p id="file-name">image.jpg</p>
                                        <p id="file-size">0 KB</p>
                                    </div>
                                    <button class="btn btn-primary btn-lg btn-block" id="analyze-btn">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                        </svg>
                                        Lancer l'analyse
                                    </button>
                                </div>
                            </div>

                            <div class="analysis-loading hidden" id="analysis-loading">
                                <div class="loading-content">
                                    <div class="loading-spinner large"></div>
                                    <h3>Analyse en cours...</h3>
                                    <p>Notre IA examine votre image</p>
                                    <div class="loading-progress">
                                        <div class="progress-bar">
                                            <div class="progress-fill" id="analysis-progress"></div>
                                        </div>
                                        <span id="progress-text">0%</span>
                                    </div>
                                </div>
                            </div>

                            <div class="results-section hidden" id="results-section"></div>
                        </div>
                    </div>
                </main>
            </div>
        `);

        Analysis.init();
    },

    // History Page
    history() {
        UI.render(`
            <div class="dashboard-layout">
                ${Components.sidebar()}
                <main class="dashboard-main">
                    ${Components.dashboardHeader('Historique')}
                    <div class="dashboard-content">
                        <div class="history-header">
                            <div class="history-filters">
                                <div class="search-box">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                    </svg>
                                    <input type="text" id="search-input" placeholder="Rechercher...">
                                </div>
                                <select id="filter-status" class="form-select">
                                    <option value="">Tous les statuts</option>
                                    <option value="sain">Sain</option>
                                    <option value="pathologie">Pathologie</option>
                                </select>
                            </div>
                            <div class="history-actions">
                                <button class="btn btn-outline" id="export-btn">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                        <polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
                                    </svg>
                                    Exporter
                                </button>
                            </div>
                        </div>
                        <div class="history-list" id="history-list">
                            <div class="loading-placeholder">Chargement...</div>
                        </div>
                        <div class="pagination" id="pagination"></div>
                    </div>
                </main>
            </div>
        `);

        History.init();
    },

    // Analysis Detail Page
    analysisDetail(params) {
        const analysisId = params[0];
        UI.render(`
            <div class="dashboard-layout">
                ${Components.sidebar()}
                <main class="dashboard-main">
                    ${Components.dashboardHeader('Detail de l\'analyse')}
                    <div class="dashboard-content">
                        <div class="analysis-detail" id="analysis-detail">
                            <div class="loading-placeholder">Chargement...</div>
                        </div>
                    </div>
                </main>
            </div>
        `);

        AnalysisDetail.init(analysisId);
    },

    // Profile Page
    profile() {
        UI.render(`
            <div class="dashboard-layout">
                ${Components.sidebar()}
                <main class="dashboard-main">
                    ${Components.dashboardHeader('Mon Profil')}
                    <div class="dashboard-content">
                        <div class="profile-container">
                            <div class="profile-tabs">
                                <button class="tab-btn active" data-tab="info">Informations</button>
                                <button class="tab-btn" data-tab="security">Securite</button>
                                <button class="tab-btn" data-tab="preferences">Preferences</button>
                            </div>

                            <div class="tab-content active" id="tab-info">
                                <form id="profile-form" class="profile-form">
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label for="first_name">Prenom</label>
                                            <input type="text" id="first_name" name="first_name" required>
                                        </div>
                                        <div class="form-group">
                                            <label for="last_name">Nom</label>
                                            <input type="text" id="last_name" name="last_name" required>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label for="email">Email</label>
                                        <input type="email" id="email" name="email" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="phone">Telephone</label>
                                        <input type="tel" id="phone" name="phone">
                                    </div>
                                    <button type="submit" class="btn btn-primary">Enregistrer les modifications</button>
                                </form>
                            </div>

                            <div class="tab-content" id="tab-security">
                                <form id="password-form" class="profile-form">
                                    <h3>Changer le mot de passe</h3>
                                    <div class="form-group">
                                        <label for="current_password">Mot de passe actuel</label>
                                        <input type="password" id="current_password" name="current_password" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="new_password">Nouveau mot de passe</label>
                                        <input type="password" id="new_password" name="new_password" required minlength="8">
                                    </div>
                                    <div class="form-group">
                                        <label for="confirm_password">Confirmer</label>
                                        <input type="password" id="confirm_password" name="confirm_password" required>
                                    </div>
                                    <button type="submit" class="btn btn-primary">Changer le mot de passe</button>
                                </form>
                                <div class="danger-zone">
                                    <h3>Zone de danger</h3>
                                    <p>La suppression de votre compte est irreversible.</p>
                                    <button class="btn btn-danger" id="delete-account-btn">Supprimer mon compte</button>
                                </div>
                            </div>

                            <div class="tab-content" id="tab-preferences">
                                <div class="preferences-form">
                                    <div class="preference-item">
                                        <div class="preference-info">
                                            <h4>Theme sombre</h4>
                                            <p>Activer le mode sombre</p>
                                        </div>
                                        <label class="switch">
                                            <input type="checkbox" id="dark-mode-toggle">
                                            <span class="slider"></span>
                                        </label>
                                    </div>
                                    <div class="preference-item">
                                        <div class="preference-info">
                                            <h4>Notifications par email</h4>
                                            <p>Recevoir des notifications</p>
                                        </div>
                                        <label class="switch">
                                            <input type="checkbox" id="email-notifications" checked>
                                            <span class="slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        `);

        Profile.init();
    },

    // About Page
    about() {
        UI.render(`
            <div class="page">
                <header class="header">
                    <div class="container">
                        <nav class="nav">
                            <a href="#landing" class="logo">${Components.logo()}<span>UngueaHealth</span></a>
                            <div class="nav-links">
                                <a href="#landing">Accueil</a>
                                <a href="#contact">Contact</a>
                            </div>
                        </nav>
                    </div>
                </header>
                <main class="page-content">
                    <div class="container">
                        <h1>A propos de UngueaHealth</h1>
                        <div class="about-content">
                            <section class="about-section">
                                <h2>Notre Mission</h2>
                                <p>UngueaHealth est une plateforme innovante de diagnostic des pathologies ungueales 
                                utilisant l'intelligence artificielle. Notre mission est de rendre le diagnostic 
                                precoce accessible a tous.</p>
                            </section>
                            <section class="about-section">
                                <h2>Notre Technologie</h2>
                                <p>Nous utilisons des algorithmes de deep learning avances, entraines sur des milliers 
                                d'images d'ongles, pour detecter avec precision les signes de pathologies.</p>
                            </section>
                            <section class="about-section">
                                <h2>L'Equipe</h2>
                                <p>UngueaHealth a ete developpe dans le cadre d'un projet academique par une equipe 
                                passionnee par l'intersection de la sante et de la technologie.</p>
                            </section>
                        </div>
                    </div>
                </main>
            </div>
        `);
    },

    // Contact Page
    contact() {
        UI.render(`
            <div class="page">
                <header class="header">
                    <div class="container">
                        <nav class="nav">
                            <a href="#landing" class="logo">${Components.logo()}<span>UngueaHealth</span></a>
                            <div class="nav-links">
                                <a href="#landing">Accueil</a>
                                <a href="#about">A propos</a>
                            </div>
                        </nav>
                    </div>
                </header>
                <main class="page-content">
                    <div class="container">
                        <h1>Contactez-nous</h1>
                        <div class="contact-container">
                            <div class="contact-info">
                                <div class="contact-item">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                        <polyline points="22,6 12,13 2,6"/>
                                    </svg>
                                    <span>contact@unguealhealth.com</span>
                                </div>
                            </div>
                            <form class="contact-form" id="contact-form">
                                <div class="form-group">
                                    <label for="name">Nom complet</label>
                                    <input type="text" id="name" name="name" required>
                                </div>
                                <div class="form-group">
                                    <label for="email">Email</label>
                                    <input type="email" id="email" name="email" required>
                                </div>
                                <div class="form-group">
                                    <label for="message">Message</label>
                                    <textarea id="message" name="message" rows="5" required></textarea>
                                </div>
                                <button type="submit" class="btn btn-primary">Envoyer</button>
                            </form>
                        </div>
                    </div>
                </main>
            </div>
        `);

        document.getElementById('contact-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            UI.showToast('Message envoye avec succes!', 'success');
            e.target.reset();
        });
    },

    // 404 Page
    notFound() {
        UI.render(`
            <div class="error-page">
                <div class="error-content">
                    <h1>404</h1>
                    <h2>Page non trouvee</h2>
                    <p>La page que vous recherchez n'existe pas.</p>
                    <a href="#landing" class="btn btn-primary">Retour a l'accueil</a>
                </div>
            </div>
        `);
    }
};

// ============================================
// FORMS HANDLER
// ============================================
const Forms = {
    togglePassword(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.type = input.type === 'password' ? 'text' : 'password';
        }
    },

    initLoginForm() {
        const form = document.getElementById('login-form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            try {
                await Auth.login(formData.get('email'), formData.get('password'));
            } catch (error) {
                // Error handled in Auth.login
            }
        });
    },

    initRegisterForm() {
        const form = document.getElementById('register-form');
        const passwordInput = document.getElementById('password');

        passwordInput?.addEventListener('input', (e) => {
            const strength = this.checkPasswordStrength(e.target.value);
            const strengthEl = document.getElementById('password-strength');
            if (strengthEl) {
                strengthEl.innerHTML = `
                    <div class="strength-bar">
                        <div class="strength-fill ${strength.class}" style="width: ${strength.percent}%"></div>
                    </div>
                    <span class="strength-text">${strength.text}</span>
                `;
            }
        });

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            
            if (formData.get('password') !== formData.get('password_confirm')) {
                UI.showToast('Les mots de passe ne correspondent pas', 'error');
                return;
            }

            try {
                await Auth.register({
                    first_name: formData.get('first_name'),
                    last_name: formData.get('last_name'),
                    email: formData.get('email'),
                    password: formData.get('password')
                });
            } catch (error) {
                // Error handled in Auth.register
            }
        });
    },

    initForgotForm() {
        const form = document.getElementById('forgot-form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            try {
                await ApiService.forgotPassword(formData.get('email'));
                UI.showToast('Un email de reinitialisation a ete envoye', 'success');
                Router.navigate('login');
            } catch (error) {
                UI.showToast(error.message || 'Erreur', 'error');
            }
        });
    },

    checkPasswordStrength(password) {
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^a-zA-Z\d]/.test(password)) score++;

        const levels = [
            { class: 'weak', text: 'Tres faible', percent: 20 },
            { class: 'weak', text: 'Faible', percent: 40 },
            { class: 'medium', text: 'Moyen', percent: 60 },
            { class: 'strong', text: 'Fort', percent: 80 },
            { class: 'strong', text: 'Tres fort', percent: 100 }
        ];

        return levels[Math.min(score, 4)];
    }
};

// ============================================
// DASHBOARD CONTROLLER
// ============================================
const Dashboard = {
    async init() {
        await this.loadStats();
        await this.loadRecentAnalyses();
    },

    async loadStats() {
        try {
            const response = await ApiService.getStatistics();
            const stats = response.data || {};

            document.getElementById('total-analyses').textContent = stats.total || 0;
            document.getElementById('healthy-count').textContent = stats.healthy || 0;
            document.getElementById('pathology-count').textContent = stats.pathologies || 0;
            document.getElementById('last-analysis').textContent = stats.last_analysis 
                ? Utils.formatDateShort(stats.last_analysis) 
                : 'Aucune';
        } catch (error) {
            console.error('Error loading stats:', error);
            // Set default values on error
            document.getElementById('total-analyses').textContent = '0';
            document.getElementById('healthy-count').textContent = '0';
            document.getElementById('pathology-count').textContent = '0';
            document.getElementById('last-analysis').textContent = 'Aucune';
        }
    },

    async loadRecentAnalyses() {
        try {
            const response = await ApiService.getHistory(1, 6);
            const container = document.getElementById('recent-analyses');
            const analyses = response.data || [];
            
            if (analyses.length === 0) {
                container.innerHTML = Components.emptyState(
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>',
                    'Aucune analyse pour le moment',
                    'Faire ma premiere analyse',
                    '#analyze'
                );
                return;
            }

            container.innerHTML = `
                <div class="analyses-grid">
                    ${analyses.map(a => Components.analysisCard(a)).join('')}
                </div>
            `;
        } catch (error) {
            console.error('Error loading analyses:', error);
            document.getElementById('recent-analyses').innerHTML = '<p class="error-text">Erreur de chargement</p>';
        }
    }
};

// ============================================
// ANALYSIS CONTROLLER
// ============================================
const Analysis = {
    selectedFile: null,
    analysisId: null,

    init() {
        this.bindEvents();
    },

    bindEvents() {
        const uploadArea = document.getElementById('upload-area');
        const imageInput = document.getElementById('image-input');
        const removeBtn = document.getElementById('remove-image');
        const analyzeBtn = document.getElementById('analyze-btn');

        uploadArea?.addEventListener('click', () => imageInput?.click());

        uploadArea?.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea?.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea?.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) this.handleFile(file);
        });

        imageInput?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleFile(file);
        });

        removeBtn?.addEventListener('click', () => this.resetUpload());
        analyzeBtn?.addEventListener('click', () => this.startAnalysis());
    },

    handleFile(file) {
        if (!CONFIG.ALLOWED_TYPES.includes(file.type)) {
            UI.showToast('Format de fichier non supporte', 'error');
            return;
        }

        if (file.size > CONFIG.MAX_FILE_SIZE) {
            UI.showToast('Fichier trop volumineux (max 10MB)', 'error');
            return;
        }

        this.selectedFile = file;

        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('preview-image').src = e.target.result;
            document.getElementById('file-name').textContent = file.name;
            document.getElementById('file-size').textContent = Utils.formatFileSize(file.size);
            
            document.getElementById('upload-section').classList.add('hidden');
            document.getElementById('preview-section').classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    },

    resetUpload() {
        this.selectedFile = null;
        this.analysisId = null;
        document.getElementById('image-input').value = '';
        document.getElementById('upload-section').classList.remove('hidden');
        document.getElementById('preview-section').classList.add('hidden');
        document.getElementById('results-section').classList.add('hidden');
        document.getElementById('analysis-loading').classList.add('hidden');
    },

    async startAnalysis() {
        if (!this.selectedFile) return;

        try {
            document.getElementById('preview-section').classList.add('hidden');
            document.getElementById('analysis-loading').classList.remove('hidden');

            this.simulateProgress();

            // Upload image
            const uploadResponse = await ApiService.uploadImage(this.selectedFile);
            this.analysisId = uploadResponse.analysis_id || uploadResponse.data?.analysis_id;

            // Analyze image
            const analysisResponse = await ApiService.analyzeImage(this.analysisId);
            
            // Complete progress
            const progressFill = document.getElementById('analysis-progress');
            const progressText = document.getElementById('progress-text');
            if (progressFill) progressFill.style.width = '100%';
            if (progressText) progressText.textContent = '100%';

            setTimeout(() => {
                this.showResults(analysisResponse.data || analysisResponse);
            }, 500);
        } catch (error) {
            UI.showToast(error.message || 'Erreur lors de l\'analyse', 'error');
            document.getElementById('analysis-loading').classList.add('hidden');
            document.getElementById('preview-section').classList.remove('hidden');
        }
    },

    simulateProgress() {
        let progress = 0;
        const progressFill = document.getElementById('analysis-progress');
        const progressText = document.getElementById('progress-text');
        
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 90) {
                clearInterval(interval);
                progress = 90;
            }
            if (progressFill) progressFill.style.width = progress + '%';
            if (progressText) progressText.textContent = Math.round(progress) + '%';
        }, 200);

        // Store interval to clear later
        this.progressInterval = interval;
    },

    showResults(data) {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }

        document.getElementById('analysis-loading').classList.add('hidden');
        document.getElementById('results-section').classList.remove('hidden');

        const severityClass = Utils.getSeverityClass(data.severite || data.severity || 'faible');
        const confidencePercent = Math.round((data.confiance || data.confidence || 0) * 100);
        const recommendations = data.recommandations || data.recommendations || [];

        document.getElementById('results-section').innerHTML = `
            <div class="results-card">
                <div class="results-header">
                    <h2>Resultats de l'analyse</h2>
                    <span class="analysis-id">ID: ${data.analysis_id || this.analysisId || '--'}</span>
                </div>
                
                <div class="results-content">
                    <div class="results-image">
                        <img src="${document.getElementById('preview-image')?.src}" alt="Analyzed image">
                    </div>
                    
                    <div class="results-diagnosis">
                        <div class="diagnosis-main">
                            <span class="diagnosis-label">Diagnostic</span>
                            <span class="diagnosis-value ${severityClass}">${data.diagnostic || data.diagnosis || 'Non determine'}</span>
                        </div>
                        
                        <div class="confidence-meter">
                            <span class="confidence-label">Niveau de confiance</span>
                            <div class="confidence-bar">
                                <div class="confidence-fill" style="width: ${confidencePercent}%"></div>
                            </div>
                            <span class="confidence-value">${confidencePercent}%</span>
                        </div>
                        
                        <div class="severity-indicator">
                            <span class="severity-label">Severite</span>
                            <span class="severity-badge ${severityClass}">${data.severite || data.severity || 'Non evaluee'}</span>
                        </div>
                    </div>
                </div>
                
                ${recommendations.length > 0 ? `
                    <div class="recommendations">
                        <h3>Recommandations</h3>
                        <ul>${recommendations.map(r => `<li>${r}</li>`).join('')}</ul>
                    </div>
                ` : ''}
                
                ${data.description ? `
                    <div class="description">
                        <h3>Description</h3>
                        <p>${data.description}</p>
                    </div>
                ` : ''}
                
                <div class="results-actions">
                    <button class="btn btn-outline" onclick="Analysis.resetUpload()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                            <circle cx="12" cy="13" r="4"/>
                        </svg>
                        Nouvelle analyse
                    </button>
                    <a href="#history" class="btn btn-primary">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
                        </svg>
                        Voir l'historique
                    </a>
                </div>
                
                <div class="disclaimer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p>Cette analyse est fournie a titre indicatif et ne remplace pas un diagnostic medical professionnel.</p>
                </div>
            </div>
        `;
    }
};

// ============================================
// HISTORY CONTROLLER
// ============================================
const History = {
    currentPage: 1,
    totalPages: 1,

    async init() {
        this.bindEvents();
        await this.loadHistory();
    },

    bindEvents() {
        const searchInput = document.getElementById('search-input');
        searchInput?.addEventListener('input', Utils.debounce(() => {
            this.currentPage = 1;
            this.loadHistory();
        }, 300));

        document.getElementById('filter-status')?.addEventListener('change', () => {
            this.currentPage = 1;
            this.loadHistory();
        });

        document.getElementById('export-btn')?.addEventListener('click', () => this.exportHistory());
    },

    async loadHistory() {
        try {
            const response = await ApiService.getHistory(this.currentPage, 10);
            const container = document.getElementById('history-list');
            const analyses = response.data || [];
            
            if (analyses.length === 0) {
                container.innerHTML = Components.emptyState(
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>',
                    'Aucune analyse trouvee',
                    'Faire une analyse',
                    '#analyze'
                );
                document.getElementById('pagination').innerHTML = '';
                return;
            }

            container.innerHTML = analyses.map(analysis => this.renderHistoryItem(analysis)).join('');
            
            this.totalPages = response.pagination?.total_pages || 1;
            this.renderPagination();
        } catch (error) {
            console.error('Error loading history:', error);
            document.getElementById('history-list').innerHTML = '<p class="error-text">Erreur de chargement</p>';
        }
    },

    renderHistoryItem(analysis) {
        const severityClass = Utils.getSeverityClass(analysis.severite || analysis.severity || 'faible');
        const confidence = Math.round((analysis.confiance || analysis.confidence || 0) * 100);
        const imagePath = analysis.image_path || '';
        const imageUrl = imagePath.startsWith('http') ? imagePath : `${CONFIG.API_BASE_URL.replace('/api', '')}/${imagePath}`;
        
        return `
            <div class="history-item" onclick="Router.navigate('analysis/${analysis.id}')">
                <div class="history-item-image">
                    <img src="${imageUrl}" alt="Analyse" onerror="this.style.display='none'">
                </div>
                <div class="history-item-info">
                    <div class="history-item-diagnosis">
                        <span class="diagnosis-badge ${severityClass}">${analysis.diagnostic || analysis.diagnosis || 'Non determine'}</span>
                        <span class="confidence">${confidence}%</span>
                    </div>
                    <div class="history-item-meta">
                        <span class="date">${Utils.formatDate(analysis.date_analyse || analysis.created_at)}</span>
                    </div>
                </div>
                <div class="history-item-actions">
                    <button class="btn btn-icon" onclick="event.stopPropagation(); History.deleteAnalysis(${analysis.id})" title="Supprimer">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    },

    renderPagination() {
        const container = document.getElementById('pagination');
        if (this.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = `
            <button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} onclick="History.goToPage(${this.currentPage - 1})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15,18 9,12 15,6"/></svg>
            </button>
        `;

        for (let i = 1; i <= this.totalPages; i++) {
            if (i === 1 || i === this.totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
                html += `<button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" onclick="History.goToPage(${i})">${i}</button>`;
            } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
                html += '<span class="pagination-dots">...</span>';
            }
        }

        html += `
            <button class="pagination-btn" ${this.currentPage === this.totalPages ? 'disabled' : ''} onclick="History.goToPage(${this.currentPage + 1})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>
            </button>
        `;

        container.innerHTML = html;
    },

    goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.loadHistory();
        }
    },

    deleteAnalysis(id) {
        UI.showConfirm('Etes-vous sur de vouloir supprimer cette analyse ?', async () => {
            try {
                await ApiService.deleteAnalysis(id);
                UI.showToast('Analyse supprimee', 'success');
                this.loadHistory();
            } catch (error) {
                UI.showToast(error.message || 'Erreur', 'error');
            }
        });
    },

    async exportHistory() {
        try {
            const response = await ApiService.exportHistory('json');
            const data = response.data || response;
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `unguealhealth_export_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            UI.showToast('Export reussi', 'success');
        } catch (error) {
            UI.showToast(error.message || 'Erreur d\'export', 'error');
        }
    }
};

// ============================================
// ANALYSIS DETAIL CONTROLLER
// ============================================
const AnalysisDetail = {
    async init(analysisId) {
        if (!analysisId) {
            Router.navigate('history');
            return;
        }

        try {
            const response = await ApiService.getAnalysisDetail(analysisId);
            this.render(response.data || response);
        } catch (error) {
            UI.showToast(error.message || 'Analyse non trouvee', 'error');
            Router.navigate('history');
        }
    },

    render(data) {
        const container = document.getElementById('analysis-detail');
        const severityClass = Utils.getSeverityClass(data.severite || data.severity || 'faible');
        const confidence = Math.round((data.confiance || data.confidence || 0) * 100);
        const imagePath = data.image_path || '';
        const imageUrl = imagePath.startsWith('http') ? imagePath : `${CONFIG.API_BASE_URL.replace('/api', '')}/${imagePath}`;
        const recommendations = data.recommandations || data.recommendations || [];

        container.innerHTML = `
            <div class="detail-card">
                <div class="detail-header">
                    <a href="#history" class="back-link">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/>
                        </svg>
                        Retour a l'historique
                    </a>
                    <span class="detail-date">${Utils.formatDate(data.date_analyse || data.created_at)}</span>
                </div>

                <div class="detail-content">
                    <div class="detail-image">
                        <img src="${imageUrl}" alt="Analyse" onerror="this.style.display='none'">
                    </div>

                    <div class="detail-info">
                        <div class="info-section">
                            <h3>Diagnostic</h3>
                            <span class="diagnosis-badge large ${severityClass}">${data.diagnostic || data.diagnosis || 'Non determine'}</span>
                        </div>

                        <div class="info-section">
                            <h3>Niveau de confiance</h3>
                            <div class="confidence-display">
                                <div class="confidence-circle">
                                    <svg viewBox="0 0 36 36">
                                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                              fill="none" stroke="#e5e7eb" stroke-width="3"/>
                                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                              fill="none" stroke="var(--primary)" stroke-width="3"
                                              stroke-dasharray="${confidence}, 100"/>
                                    </svg>
                                    <span class="confidence-text">${confidence}%</span>
                                </div>
                            </div>
                        </div>

                        <div class="info-section">
                            <h3>Severite</h3>
                            <span class="severity-badge ${severityClass}">${data.severite || data.severity || 'Non evaluee'}</span>
                        </div>
                    </div>
                </div>

                ${data.description ? `
                    <div class="detail-section">
                        <h3>Description</h3>
                        <p>${data.description}</p>
                    </div>
                ` : ''}

                ${recommendations.length > 0 ? `
                    <div class="detail-section">
                        <h3>Recommandations</h3>
                        <ul class="recommendations-list">${recommendations.map(r => `<li>${r}</li>`).join('')}</ul>
                    </div>
                ` : ''}

                <div class="detail-actions">
                    <button class="btn btn-outline" onclick="window.print()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6,9 6,2 18,2 18,9"/>
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                            <rect x="6" y="14" width="12" height="8"/>
                        </svg>
                        Imprimer
                    </button>
                    <button class="btn btn-danger" onclick="AnalysisDetail.delete(${data.id})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                        Supprimer
                    </button>
                </div>

                <div class="disclaimer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p>Cette analyse est fournie a titre indicatif et ne remplace pas un diagnostic medical professionnel.</p>
                </div>
            </div>
        `;
    },

    delete(id) {
        UI.showConfirm('Etes-vous sur de vouloir supprimer cette analyse ?', async () => {
            try {
                await ApiService.deleteAnalysis(id);
                UI.showToast('Analyse supprimee', 'success');
                Router.navigate('history');
            } catch (error) {
                UI.showToast(error.message || 'Erreur', 'error');
            }
        });
    }
};

// ============================================
// PROFILE CONTROLLER
// ============================================
const Profile = {
    async init() {
        this.bindEvents();
        await this.loadProfile();
    },

    bindEvents() {
        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabId = e.target.dataset.tab;
                this.switchTab(tabId);
            });
        });

        // Profile form
        document.getElementById('profile-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProfile();
        });

        // Password form
        document.getElementById('password-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.changePassword();
        });

        // Delete account
        document.getElementById('delete-account-btn')?.addEventListener('click', () => {
            this.deleteAccount();
        });

        // Theme toggle
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            darkModeToggle.checked = document.body.classList.contains('dark-theme');
            darkModeToggle.addEventListener('change', () => UI.toggleTheme());
        }
    },

    switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabId}`);
        });
    },

    async loadProfile() {
        try {
            const response = await ApiService.getProfile();
            const user = response.data || response;

            const fields = ['first_name', 'last_name', 'email', 'phone'];
            fields.forEach(field => {
                const el = document.getElementById(field);
                if (el) el.value = user[field] || '';
            });
        } catch (error) {
            // Use cached user data if API fails
            const user = AppState.user || {};
            document.getElementById('first_name').value = user.first_name || '';
            document.getElementById('last_name').value = user.last_name || '';
            document.getElementById('email').value = user.email || '';
        }
    },

    async updateProfile() {
        try {
            const form = document.getElementById('profile-form');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            await ApiService.updateProfile(data);
            
            AppState.user = { ...AppState.user, ...data };
            Utils.setStorage(CONFIG.USER_KEY, AppState.user);

            UI.showToast('Profil mis a jour', 'success');
        } catch (error) {
            UI.showToast(error.message || 'Erreur', 'error');
        }
    },

    async changePassword() {
        const form = document.getElementById('password-form');
        const formData = new FormData(form);

        if (formData.get('new_password') !== formData.get('confirm_password')) {
            UI.showToast('Les mots de passe ne correspondent pas', 'error');
            return;
        }

        try {
            await ApiService.changePassword({
                current_password: formData.get('current_password'),
                new_password: formData.get('new_password')
            });

            UI.showToast('Mot de passe modifie', 'success');
            form.reset();
        } catch (error) {
            UI.showToast(error.message || 'Erreur', 'error');
        }
    },

    deleteAccount() {
        UI.showConfirm(
            'Etes-vous sur de vouloir supprimer votre compte ? Cette action est irreversible.',
            async () => {
                try {
                    await ApiService.deleteAccount();
                    Auth.clearSession();
                    UI.showToast('Compte supprime', 'info');
                    Router.navigate('landing');
                } catch (error) {
                    UI.showToast(error.message || 'Erreur', 'error');
                }
            }
        );
    }
};

// ============================================
// APP INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
    UI.init();
    Router.init();
});
