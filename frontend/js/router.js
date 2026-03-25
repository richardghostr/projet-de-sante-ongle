// router.js — simple hash router
export const Router = {
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

    init() { this.handleRoute(); },

    navigate(route) { window.location.hash = route; },

    handleRoute() {
        const hash = window.location.hash.slice(1) || '';
        const [route, ...params] = hash.split('/');
        const pageName = this.routes[route] || 'notFound';

        const protectedRoutes = ['dashboard', 'analyze', 'history', 'analysis', 'profile'];
        if (protectedRoutes.includes(route) && !(window.Auth && window.Auth.isAuthenticated && window.Auth.isAuthenticated())) {
            this.navigate('login');
            return;
        }

        const authRoutes = ['login', 'register', 'forgot-password'];
        if (authRoutes.includes(route) && window.Auth && window.Auth.isAuthenticated && window.Auth.isAuthenticated()) {
            this.navigate('dashboard');
            return;
        }

        if (window.AppState) window.AppState.currentPage = pageName;

        if (window.Pages && typeof window.Pages[pageName] === 'function') {
            window.Pages[pageName](params);
        } else if (window.Pages && typeof window.Pages.notFound === 'function') {
            window.Pages.notFound();
        }
    }
};
