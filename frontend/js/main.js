/**
 * UnguealHealth - Main Application Entry Point
 * Initializes and manages the complete application lifecycle
 */

import Router from './core/router.js';
import { AppState } from './core/state.js';
import { AuthService } from './services/auth.js';
import { ApiService } from './services/api.js';
import { UI } from './ui.js';
import { Forms } from './forms.js';
import { Components } from './components.js';

// Import pages
import { LandingPage } from './pages/landing.js';
import { AboutPage } from './pages/about.js';
import { ContactPage } from './pages/contact.js';
import { LoginPage } from './pages/login.js';
import { RegisterPage } from './pages/register.js';
import { DashboardPage } from './pages/dashboard.js';
import { AnalyzePage } from './pages/analyze.js';
import { HistoryPage } from './pages/history.js';
import { ProfilePage } from './pages/profile.js';

/**
 * Main Application Class
 */
class UnguealHealthApp {
  constructor() {
    this.router = Router;
    this.isInitialized = false;
  }
  
  /**
   * Ensure router is initialized (attach listeners)
   */
  ensureRouter() {
    if (this.router && typeof this.router.init === 'function') {
      this.router.init();
    }
  }

  /**
   * Initialize the application
   */
  async initialize() {
    console.log('[v0] Initializing UnguealHealth application...');

    try {
      // Setup DOM
      this.setupDOM();

      // Check authentication
      await this.checkAuth();

      // Register routes
      this.registerRoutes();

      // Setup event listeners
      this.setupEventListeners();

      // Ensure router has its listeners attached
      this.ensureRouter();

      // Navigate to initial route
      await this.router.navigate(window.location.hash || '#/');

      this.isInitialized = true;
      console.log('[v0] Application initialized successfully');
    } catch (error) {
      console.error('[v0] Initialization error:', error);
      this.showError('Erreur lors du démarrage de l\'application');
    }
  }

  /**
   * Setup DOM structure
   */
  setupDOM() {
    const body = document.body;
    
    // Create main app container if not exists
    if (!document.getElementById('app')) {
      const appDiv = document.createElement('div');
      appDiv.id = 'app';
      body.appendChild(appDiv);
    }

    // Create toast container
    if (!document.getElementById('toast-container')) {
      const toastDiv = document.createElement('div');
      toastDiv.id = 'toast-container';
      body.appendChild(toastDiv);
    }

    // Create modal container
    if (!document.getElementById('modal-container')) {
      const modalDiv = document.createElement('div');
      modalDiv.id = 'modal-container';
      body.appendChild(modalDiv);
    }
  }

  /**
   * Check authentication status
   */
  async checkAuth() {
    const isAuthenticated = AuthService.isAuthenticated();
    const user = isAuthenticated ? AuthService.getCurrentUser() : null;

    AppState.set({
      isAuthenticated,
      user
    });

    console.log('[v0] Auth check complete:', { isAuthenticated });
  }

  /**
   * Register all routes
   */
  registerRoutes() {
    // Public routes
    this.router.registerRoute('/', {
      name: 'home',
      component: LandingPage,
      requiresAuth: false
    });

    this.router.registerRoute('/about', {
      name: 'about',
      component: AboutPage,
      requiresAuth: false
    });

    this.router.registerRoute('/contact', {
      name: 'contact',
      component: ContactPage,
      requiresAuth: false
    });

    this.router.registerRoute('/login', {
      name: 'login',
      component: LoginPage,
      requiresAuth: false
    });

    this.router.registerRoute('/register', {
      name: 'register',
      component: RegisterPage,
      requiresAuth: false
    });

    // Protected routes
    this.router.registerRoute('/dashboard', {
      name: 'dashboard',
      component: DashboardPage,
      requiresAuth: true
    });

    this.router.registerRoute('/analyze', {
      name: 'analyze',
      component: AnalyzePage,
      requiresAuth: true
    });

    this.router.registerRoute('/history', {
      name: 'history',
      component: HistoryPage,
      requiresAuth: true
    });

    this.router.registerRoute('/profile', {
      name: 'profile',
      component: ProfilePage,
      requiresAuth: true
    });

    // Setup route change handler
    this.router.onRouteChange((route) => {
      this.renderPage(route);
    });
  }

  /**
   * Setup global event listeners
   */
  setupEventListeners() {
    // Handle auth state changes
    AppState.subscribeAll((changes, newState) => {
      console.log('[v0] State changed:', newState);
      if (newState.isAuthenticated !== undefined) {
        this.onAuthChange(newState.isAuthenticated);
      }
    });

    // Mobile menu close on outside click
    document.addEventListener('click', (e) => {
      const mobileMenu = document.querySelector('.mobile-nav');
      const menuBtn = document.querySelector('.mobile-menu-btn');
      
      if (mobileMenu?.classList.contains('active')) {
        if (!mobileMenu.contains(e.target) && !menuBtn?.contains(e.target)) {
          mobileMenu.classList.remove('active');
        }
      }
    });
  }

  /**
   * Render page component
   */
  async renderPage(route) {
    console.log('[v0] Rendering page:', route.name);

    // Check authentication requirement
    if (route.requiresAuth && !AuthService.isAuthenticated()) {
      console.log('[v0] Access denied: authentication required');
      window.location.hash = '#/login';
      return;
    }

    // Redirect authenticated users from auth pages
    if ((route.name === 'login' || route.name === 'register') && AuthService.isAuthenticated()) {
      window.location.hash = '#/dashboard';
      return;
    }

    const appContainer = document.getElementById('app');
    if (!appContainer) {
      console.error('[v0] App container not found');
      return;
    }

    try {
      // Show loading state
      appContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

      // Render page
      const pageElement = route.component.render();
      
      // Clear and append
      appContainer.innerHTML = '';
      appContainer.appendChild(pageElement);

      // Scroll to top
      window.scrollTo(0, 0);

      console.log('[v0] Page rendered successfully');
    } catch (error) {
      console.error('[v0] Error rendering page:', error);
      this.showError('Erreur lors du chargement de la page');
    }
  }

  /**
   * Handle authentication state changes
   */
  onAuthChange(isAuthenticated) {
    if (isAuthenticated) {
      console.log('[v0] User authenticated');
      return;
    }

    console.log('[v0] User logged out');

    // Don't force navigation during initial bootstrap
    if (!this.isInitialized) return;

    // Only redirect to public page if the current route requires auth
    const current = this.router && typeof this.router.getCurrentRoute === 'function'
      ? this.router.getCurrentRoute()
      : null;

    if (current && current.requiresAuth) {
      window.location.hash = '#/login';
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const appContainer = document.getElementById('app');
    if (appContainer) {
      appContainer.innerHTML = `
        <div class="error-container">
          <h2>Erreur</h2>
          <p>${message}</p>
          <a href="#/" class="btn btn-primary">Retour à l'accueil</a>
        </div>
      `;
    }
  }
}

/**
 * Initialize application when DOM is ready
 */
function startApp() {
  const app = new UnguealHealthApp();
  // expose router once created
  app.initialize();
  window.Router = app.router;
  window.App = app;
}

// Start app
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}

// --- Legacy compatibility shims ---
function mountPage(module, params) {
  try {
    const el = module && module.render ? module.render(params) : null;
    const appEl = document.getElementById('app');
    if (!appEl) return;
    if (el instanceof Element) {
      appEl.innerHTML = '';
      appEl.appendChild(el);
    } else if (typeof el === 'string') {
      appEl.innerHTML = el;
    }
  } catch (e) {
    console.error('Error mounting page', e);
  }
}

window.Auth = AuthService;
window.AppState = AppState;
window.ApiService = ApiService;
window.UI = UI;
window.Forms = Forms;
window.Components = Components;

window.Pages = {
  landing: () => mountPage(LandingPage),
  about: () => mountPage(AboutPage),
  contact: () => mountPage(ContactPage),
  login: () => mountPage(LoginPage),
  register: () => mountPage(RegisterPage),
  dashboard: () => mountPage(DashboardPage),
  analyze: () => mountPage(AnalyzePage),
  history: () => mountPage(HistoryPage),
  profile: () => mountPage(ProfilePage),
  notFound: () => { const appEl = document.getElementById('app'); if (appEl) appEl.innerHTML = '<div class="error-page"><h1>404</h1><p>Page non trouvee</p></div>'; }
};

// keep default export compatibility
export const Globals = {
  Auth: AuthService,
  AppState,
  ApiService,
  UI,
  Forms,
  Components,
  Pages,
  Router: window.Router,
  App: window.App
};
