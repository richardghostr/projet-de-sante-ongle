// api.js — ApiService (uses CONFIG and AppState from utils)
import { CONFIG, AppState } from './utils.js';

export const ApiService = {
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        const defaultHeaders = { 'Accept': 'application/json' };

        if (AppState.token) {
            defaultHeaders['Authorization'] = `Bearer ${AppState.token}`;
        }

        if (!(options.body instanceof FormData)) {
            defaultHeaders['Content-Type'] = 'application/json';
        }

        const config = { ...options, headers: { ...defaultHeaders, ...options.headers } };

        try {
            // UI may be attached to window by main bootstrap
            if (window.UI && typeof window.UI.showLoading === 'function') window.UI.showLoading();

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
            if (window.UI && typeof window.UI.hideLoading === 'function') window.UI.hideLoading();
        }
    },

    // Auth endpoints
    async register(userData) {
        return this.request('/register', { method: 'POST', body: JSON.stringify(userData) });
    },

    async login(credentials) {
        return this.request('/login', { method: 'POST', body: JSON.stringify(credentials) });
    },

    async logout() {
        return this.request('/logout', { method: 'POST' });
    },

    async forgotPassword(email) {
        return this.request('/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
    },

    // Profile endpoints
    async getProfile() { return this.request('/profile', { method: 'GET' }); },
    async updateProfile(profileData) { return this.request('/profile', { method: 'PUT', body: JSON.stringify(profileData) }); },
    async changePassword(passwordData) { return this.request('/change-password', { method: 'PUT', body: JSON.stringify(passwordData) }); },
    async deleteAccount() { return this.request('/profile', { method: 'DELETE' }); },

    // Analysis endpoints
    async uploadImage(file) {
        const formData = new FormData();
        formData.append('image', file);
        return this.request('/upload-image', { method: 'POST', body: formData });
    },

    async analyzeImage(analysisId) { return this.request('/analyze-image', { method: 'POST', body: JSON.stringify({ analysis_id: analysisId }) }); },

    // History endpoints
    async getHistory(page = 1, limit = 10) { return this.request(`/history?page=${page}&limit=${limit}`, { method: 'GET' }); },
    async getAnalysisDetail(analysisId) { return this.request(`/history/${analysisId}`, { method: 'GET' }); },
    async deleteAnalysis(analysisId) { return this.request(`/history/${analysisId}`, { method: 'DELETE' }); },
    async getStatistics() { return this.request('/history/stats', { method: 'GET' }); },
    async exportHistory(format = 'json') { return this.request(`/history/export?format=${format}`, { method: 'GET' }); }
};
