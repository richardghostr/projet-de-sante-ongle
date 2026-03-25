/**
 * UnguealHealth - Router
 * Hash-based SPA router with guards and lazy loading support
 */

import { CONFIG } from './config.js';
import { State } from './state.js';

class AppRouter {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.beforeHooks = [];
        this.afterHooks = [];
        
        // Default routes mapping
        this._setupDefaultRoutes();
    }
    
    _setupDefaultRoutes() {
        // Route name -> page handler mapping
        this.routeMap = {
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
            'contact': 'contact',
            'privacy': 'privacy',
            'terms': 'terms'
        };
    }
    
    /**
     * Initialize the router
     */
    init() {
        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleRoute());
        
        // Handle initial route
        this.handleRoute();
        
        return this;
    }
    
    /**
     * Navigate to a route
     */
    navigate(route, params = {}) {
        let raw = route || '';

        // Strip leading '#' if present
        if (raw.startsWith('#')) raw = raw.slice(1);

        // Ensure route starts with a single '/'
        if (!raw.startsWith('/')) raw = `/${raw}`;

        // Add params to hash if provided
        if (Object.keys(params).length > 0) {
            const paramStr = Object.entries(params)
                .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
                .join('&');
            raw = `${raw}?${paramStr}`;
        }

        // Always assign a hash string beginning with '#'
        window.location.hash = raw.startsWith('#') ? raw : `#${raw}`;
    }
    
    /**
     * Replace current route without adding to history
     */
    replace(route) {
        window.location.replace(`#${route}`);
    }
    
    /**
     * Go back in history
     */
    back() {
        window.history.back();
    }
    
    /**
     * Parse the current hash
     */
    parseHash() {
        const hash = (window.location.hash || '').slice(1) || '';
        const [pathWithParams] = hash.split('?');

        // Remove leading slashes so "/about" and "about" are treated the same
        const cleaned = (pathWithParams || '').replace(/^\/+/g, '');
        const [route, ...pathParams] = cleaned.split('/');
        
        // Parse query params if any
        const queryString = hash.includes('?') ? hash.split('?')[1] : '';
        const queryParams = {};
        if (queryString) {
            new URLSearchParams(queryString).forEach((value, key) => {
                queryParams[key] = value;
            });
        }
        
        return {
            route: route || '',
            pathParams,
            queryParams
        };
    }
    
    /**
     * Handle route change
     */
    async handleRoute() {
        const { route, pathParams, queryParams } = this.parseHash();
        const pageName = this.routeMap[route] || 'notFound';
        
        // Run before hooks (guards)
        for (const hook of this.beforeHooks) {
            const result = await hook(route, pageName);
            if (result === false) return;
            if (typeof result === 'string') {
                this.navigate(result);
                return;
            }
        }
        
        // Check authentication guards
        const guardResult = this._checkGuards(route);
        if (guardResult !== true) {
            this.navigate(guardResult);
            return;
        }
        
        // Build a normalized route key (strip leading slashes)
        const normalizedRoute = (route || '').replace(/^\/+/, '');

        // Resolve registered route if present
        const registered = this.routes.get(normalizedRoute);

        const routeObj = {
            route: normalizedRoute,
            name: registered?.name || pageName,
            component: registered?.component || null,
            requiresAuth: !!registered?.requiresAuth,
            pathParams,
            queryParams
        };

        // Update state
        this.currentRoute = routeObj;
        State.set({
            currentPage: routeObj.name,
            currentParams: pathParams
        });

        // Do NOT auto-render here; allow consumers (eg. main.js) to render via onRouteChange hooks.

        // Run after hooks (pass route object)
        for (const hook of this.afterHooks) {
            await hook(routeObj);
        }
        
        // Scroll to top
        window.scrollTo(0, 0);
        
        // Update active nav links
        this._updateNavLinks(route);
    }
    
    /**
     * Check route guards
     */
    _checkGuards(route) {
        const isAuthenticated = State.get('isAuthenticated');
        
        // Protected routes require authentication
        if (CONFIG.PROTECTED_ROUTES.includes(route) && !isAuthenticated) {
            return 'login';
        }
        
        // Auth routes redirect to dashboard if already logged in
        if (CONFIG.AUTH_ROUTES.includes(route) && isAuthenticated) {
            return 'dashboard';
        }
        
        return true;
    }
    
    /**
     * Load and render a page
     */
    async _loadPage(pageName, pathParams, queryParams) {
        try {
            // Get Pages from window (set by main.js)
            const Pages = window.Pages;
            
            if (Pages && typeof Pages[pageName] === 'function') {
                await Pages[pageName](pathParams, queryParams);
            } else if (Pages && typeof Pages.notFound === 'function') {
                await Pages.notFound();
            } else {
                console.error(`Page handler not found: ${pageName}`);
                this._renderError('Page non trouvee');
            }
        } catch (error) {
            console.error(`Error loading page ${pageName}:`, error);
            this._renderError('Erreur lors du chargement de la page');
        }
    }
    
    /**
     * Render error state
     */
    _renderError(message) {
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = `
                <div class="flex items-center justify-center min-h-screen">
                    <div class="text-center p-8">
                        <div class="text-6xl mb-4">!</div>
                        <h1 class="text-2xl font-bold mb-2">Erreur</h1>
                        <p class="text-secondary mb-6">${message}</p>
                        <a href="#/" class="btn btn-primary">Retour a l'accueil</a>
                    </div>
                </div>
            `;
        }
    }
    
    /**
     * Update active state on navigation links
     */
    _updateNavLinks(currentRoute) {
        document.querySelectorAll('[data-page]').forEach(link => {
            const page = link.dataset.page;
            link.classList.toggle('active', page === currentRoute || 
                (currentRoute === '' && page === 'home'));
        });
        
        document.querySelectorAll('.nav-link, .sidebar-link').forEach(link => {
            const href = link.getAttribute('href');
            if (href) {
                const linkRoute = href.replace('#', '').replace('/', '');
                link.classList.toggle('active', linkRoute === currentRoute || 
                    (currentRoute === '' && linkRoute === ''));
            }
        });
    }
    
    /**
     * Add a before navigation hook
     */
    beforeEach(hook) {
        this.beforeHooks.push(hook);
        return this;
    }
    
    /**
     * Add an after navigation hook
     */
    afterEach(hook) {
        this.afterHooks.push(hook);
        return this;
    }

    /**
     * Register a route with optional metadata (component, requiresAuth, name)
     * Path may be provided with or without a leading '/'.
     */
    registerRoute(path, config = {}) {
        const key = (path || '').toString().replace(/^\/+/, '').replace(/\s+/g, '');
        this.routes.set(key, config);
        return this;
    }

    /**
     * Register a callback to run when the current route changes. The callback
     * receives a route object: { route, name, component, requiresAuth, pathParams, queryParams }.
     */
    onRouteChange(cb) {
        this.afterHooks.push(cb);
        return this;
    }
    
    /**
     * Get current route info
     */
    getCurrentRoute() {
        return this.currentRoute;
    }
}

// Export singleton instance
export const Router = new AppRouter();

export default Router;
