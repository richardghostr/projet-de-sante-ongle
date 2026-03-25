/**
 * UnguealHealth - Auth Service
 * Authentication management with session persistence
 */

import { CONFIG } from '../core/config.js';
import { State } from '../core/state.js';
import { ApiService } from './api.js';
import { Storage } from './storage.js';

export const AuthService = {
    /**
     * Initialize auth state from storage
     */
    init() {
        const token = Storage.get(CONFIG.TOKEN_KEY);
        const user = Storage.get(CONFIG.USER_KEY);
        
        if (token && user) {
            State.setAuth(user, token);
        }
        
        return this;
    },
    
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return State.get('isAuthenticated');
    },
    
    /**
     * Get current user
     */
    getUser() {
        return State.get('user');
    },
    
    /**
     * Get auth token
     */
    getToken() {
        return State.get('token');
    },
    
    /**
     * Set session data
     */
    setSession(token, user) {
        Storage.set(CONFIG.TOKEN_KEY, token);
        Storage.set(CONFIG.USER_KEY, user);
        State.setAuth(user, token);
    },
    
    /**
     * Clear session data
     */
    clearSession() {
        Storage.remove(CONFIG.TOKEN_KEY);
        Storage.remove(CONFIG.USER_KEY);
        State.clearAuth();
    },
    
    /**
     * Login user
     */
    async login(email, password) {
        try {
            const response = await ApiService.login({ email, password });
            
            if (response.success && response.data) {
                this.setSession(response.data.token, response.data.user);
                
                // Show success notification
                if (window.Toast) {
                    window.Toast.success('Connexion reussie !');
                }
                
                // Navigate to dashboard
                if (window.Router) {
                    window.Router.navigate('dashboard');
                }
                
                return response;
            }
            
            throw new Error(response.message || 'Erreur de connexion');
        } catch (error) {
            if (window.Toast) {
                window.Toast.error(error.message || 'Erreur de connexion');
            }
            throw error;
        }
    },
    
    /**
     * Register new user
     */
    async register(userData) {
        try {
            const response = await ApiService.register(userData);
            
            if (response.success) {
                if (window.Toast) {
                    window.Toast.success('Inscription reussie ! Veuillez vous connecter.');
                }
                
                if (window.Router) {
                    window.Router.navigate('login');
                }
                
                return response;
            }
            
            throw new Error(response.message || 'Erreur lors de l\'inscription');
        } catch (error) {
            if (window.Toast) {
                window.Toast.error(error.message || 'Erreur lors de l\'inscription');
            }
            throw error;
        }
    },
    
    /**
     * Logout user
     */
    async logout() {
        try {
            await ApiService.logout();
        } catch (error) {
            console.warn('Logout API call failed:', error);
        } finally {
            this.clearSession();
            
            if (window.Toast) {
                window.Toast.info('Deconnexion reussie');
            }
            
            if (window.Router) {
                window.Router.navigate('landing');
            }
        }
    },
    
    /**
     * Request password reset
     */
    async forgotPassword(email) {
        try {
            const response = await ApiService.forgotPassword(email);
            
            if (response.success) {
                if (window.Toast) {
                    window.Toast.success('Un email de reinitialisation a ete envoye');
                }
                return response;
            }
            
            throw new Error(response.message || 'Erreur lors de la demande');
        } catch (error) {
            if (window.Toast) {
                window.Toast.error(error.message || 'Erreur lors de la demande');
            }
            throw error;
        }
    },
    
    /**
     * Update user profile in state
     */
    updateUserInState(userData) {
        const currentUser = this.getUser();
        const updatedUser = { ...currentUser, ...userData };
        
        Storage.set(CONFIG.USER_KEY, updatedUser);
        State.set({ user: updatedUser });
    }
};

export default AuthService;
