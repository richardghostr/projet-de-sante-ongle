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

/**
 * Initialize the application
 */
export function initializeApp() {
  console.log('[v0] Initializing UnguealHealth application...');

  // Setup routes
  const router = AppRouter.getInstance();

  // Public routes
  router.registerRoute('/', {
    name: 'home',
    component: LandingPage,
    requiresAuth: false
  });

  router.registerRoute('/about', {
    name: 'about',
    component: AboutPage,
    requiresAuth: false
  });

  router.registerRoute('/contact', {
    name: 'contact',
    component: ContactPage,
    requiresAuth: false
  });

  router.registerRoute('/login', {
    name: 'login',
    component: LoginPage,
    requiresAuth: false
  });

  router.registerRoute('/register', {
    name: 'register',
    component: RegisterPage,
    requiresAuth: false
  });

  // Protected routes
  router.registerRoute('/dashboard', {
    name: 'dashboard',
    component: DashboardPage,
    requiresAuth: true
  });

  router.registerRoute('/analyze', {
    name: 'analyze',
    component: AnalyzePage,
    requiresAuth: true
  });

  router.registerRoute('/history', {
    name: 'history',
    component: HistoryPage,
    requiresAuth: true
  });

  router.registerRoute('/profile', {
    name: 'profile',
    component: ProfilePage,
    requiresAuth: true
  });

  // Setup route change listener
  router.onRouteChange((route) => {
    console.log('[v0] Route changed to:', route);
    renderPage(route);
  });

  // Check authentication status
  checkAuthStatus();

  // Navigate to current hash or home
  const currentHash = window.location.hash || '#/';
  router.navigate(currentHash);

  // Listen for hash changes
  window.addEventListener('hashchange', () => {
    router.navigate(window.location.hash);
  });

  console.log('[v0] Application initialized successfully');
}

/**
 * Check authentication status and update app state
 */
function checkAuthStatus() {
  const isAuthenticated = AuthService.isAuthenticated();
  AppState.setState({
    isAuthenticated,
    user: isAuthenticated ? AuthService.getCurrentUser() : null
  });

  console.log('[v0] Auth status checked:', { isAuthenticated });
}

/**
 * Render the page component
 */
function renderPage(route) {
  // Check if route requires authentication
  if (route.requiresAuth && !AuthService.isAuthenticated()) {
    console.log('[v0] Access denied: route requires authentication');
    window.location.hash = '#/login';
    return;
  }

  // Get app container
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('[v0] App container not found');
    return;
  }

  // Clear previous content
  appContainer.innerHTML = '';

  // Render the page
  try {
    const pageComponent = route.component;
    const pageElement = pageComponent.render();
    appContainer.appendChild(pageElement);
    
    // Scroll to top
    window.scrollTo(0, 0);
  } catch (error) {
    console.error('[v0] Error rendering page:', error);
    appContainer.innerHTML = '<div class="error-page"><p>Erreur lors du chargement de la page</p></div>';
  }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

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
