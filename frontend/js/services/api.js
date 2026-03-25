/**
 * UnguealHealth - API Service
 * Centralized HTTP client for backend communication
 */

import { CONFIG } from '../core/config.js';
import { State } from '../core/state.js';

class ApiClient {
    constructor(baseURL = CONFIG.API_BASE_URL) {
        this.baseURL = baseURL;
    }
    
    /**
     * Make an HTTP request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        // Default headers
        const headers = {
            'Accept': 'application/json',
            ...options.headers
        };
        
        // Add auth token if available
        const token = State.get('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Set Content-Type for non-FormData requests
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }
        
        const config = {
            ...options,
            headers
        };
        
        try {
            // Show loading state
            State.set({ isLoading: true });
            
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                const error = new Error(data.message || data.error || 'Une erreur est survenue');
                error.status = response.status;
                error.details = data.errors;
                throw error;
            }
            
            return data;
        } catch (error) {
            // Handle network errors
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                error.message = 'Erreur de connexion au serveur';
            }
            throw error;
        } finally {
            State.set({ isLoading: false });
        }
    }
    
    /**
     * GET request
     */
    get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }
    
    /**
     * POST request
     */
    post(endpoint, body, options = {}) {
        const config = { ...options, method: 'POST' };
        
        if (body instanceof FormData) {
            config.body = body;
        } else {
            config.body = JSON.stringify(body);
        }
        
        return this.request(endpoint, config);
    }
    
    /**
     * PUT request
     */
    put(endpoint, body, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }
    
    /**
     * DELETE request
     */
    delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }
}

// Create API instance
const api = new ApiClient();

/**
 * API Service with specific endpoints
 */
export const ApiService = {
    // ================== AUTH ==================
    
    async register(userData) {
        return api.post('/register', userData);
    },
    
    async login(credentials) {
        return api.post('/login', credentials);
    },
    
    async logout() {
        return api.post('/logout');
    },
    
    async forgotPassword(email) {
        return api.post('/forgot-password', { email });
    },
    
    async resetPassword(token, password) {
        return api.post('/reset-password', { token, password });
    },
    
    // ================== PROFILE ==================
    
    async getProfile() {
        return api.get('/profile');
    },
    
    async updateProfile(profileData) {
        return api.put('/profile', profileData);
    },
    
    async changePassword(passwordData) {
        return api.put('/change-password', passwordData);
    },
    
    async deleteAccount() {
        return api.delete('/profile');
    },
    
    async uploadAvatar(file) {
        const formData = new FormData();
        formData.append('avatar', file);
        return api.post('/profile/avatar', formData);
    },
    
    // ================== ANALYSIS ==================
    
    async uploadImage(file) {
        const formData = new FormData();
        formData.append('image', file);
        return api.post('/upload-image', formData);
    },
    
    async analyzeImage(analysisId, options = {}) {
        return api.post('/analyze-image', { 
            analysis_id: analysisId,
            ...options 
        });
    },
    
    async getAnalysis(analysisId) {
        return api.get(`/analysis/${analysisId}`);
    },
    
    // ================== HISTORY ==================
    
    async getHistory(params = {}) {
        const { page = 1, limit = CONFIG.DEFAULT_PAGE_SIZE, filter, sort } = params;
        let endpoint = `/history?page=${page}&limit=${limit}`;
        
        if (filter) endpoint += `&filter=${filter}`;
        if (sort) endpoint += `&sort=${sort}`;
        
        return api.get(endpoint);
    },
    
    async getAnalysisDetail(analysisId) {
        return api.get(`/history/${analysisId}`);
    },
    
    async deleteAnalysis(analysisId) {
        return api.delete(`/history/${analysisId}`);
    },
    
    async getStatistics() {
        return api.get('/history/stats');
    },
    
    async exportHistory(format = 'json') {
        return api.get(`/history/export?format=${format}`);
    },
    
    // ================== CONTACT ==================
    
    async sendContactMessage(data) {
        return api.post('/contact', data);
    }
};

export default ApiService;
