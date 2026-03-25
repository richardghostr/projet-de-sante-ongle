// auth.js — authentication service
import { Utils } from './utils.js';
import { ApiService } from './api.js';

export const Auth = {
    init() {
        const token = Utils.getStorage('unguealhealth_token');
        const user = Utils.getStorage('unguealhealth_user');

        if (token && user) {
            if (window.AppState) { window.AppState.token = token; window.AppState.user = user; }
        }
    },

    isAuthenticated() {
        return !!(window.AppState && window.AppState.token && window.AppState.user);
    },

    setSession(token, user) {
        if (window.AppState) { window.AppState.token = token; window.AppState.user = user; }
        Utils.setStorage('unguealhealth_token', token);
        Utils.setStorage('unguealhealth_user', user);
    },

    clearSession() {
        if (window.AppState) { window.AppState.token = null; window.AppState.user = null; }
        Utils.removeStorage('unguealhealth_token');
        Utils.removeStorage('unguealhealth_user');
    },

    async login(email, password) {
        try {
            const response = await ApiService.login({ email, password });
            if (response.success && response.data) {
                this.setSession(response.data.token, response.data.user);
                window.UI?.showToast('Connexion reussie!', 'success');
                window.Router?.navigate && window.Router.navigate('dashboard');
            }
            return response;
        } catch (error) {
            window.UI?.showToast && window.UI.showToast(error.message || 'Erreur de connexion', 'error');
            throw error;
        }
    },

    async register(userData) {
        try {
            const response = await ApiService.register(userData);
            if (response.success) {
                window.UI?.showToast && window.UI.showToast('Inscription reussie! Veuillez vous connecter.', 'success');
                window.Router?.navigate && window.Router.navigate('login');
            }
            return response;
        } catch (error) {
            window.UI?.showToast && window.UI.showToast(error.message || 'Erreur d\'inscription', 'error');
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
            window.UI?.showToast && window.UI.showToast('Deconnexion reussie', 'info');
            window.Router?.navigate && window.Router.navigate('landing');
        }
    }
};
