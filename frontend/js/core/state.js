/**
 * UnguealHealth - State Management
 * Simple reactive state management with event-based updates
 */

class StateManager {
    constructor() {
        this._state = {
            // Auth state
            user: null,
            token: null,
            isAuthenticated: false,
            
            // Navigation state
            currentPage: 'landing',
            currentParams: [],
            
            // UI state
            isLoading: false,
            theme: 'light',
            sidebarOpen: false,
            
            // Data state
            analyses: [],
            currentAnalysis: null,
            statistics: null,
            
            // Form state
            uploadedImage: null,
            analysisInProgress: false
        };
        
        this._listeners = new Map();
        this._globalListeners = new Set();
    }
    
    /**
     * Get the current state or a specific key
     */
    get(key) {
        if (key) {
            return this._state[key];
        }
        return { ...this._state };
    }
    
    /**
     * Set state value(s)
     */
    set(updates) {
        const changes = {};
        
        for (const [key, value] of Object.entries(updates)) {
            if (this._state[key] !== value) {
                changes[key] = { old: this._state[key], new: value };
                this._state[key] = value;
            }
        }
        
        // Notify listeners
        if (Object.keys(changes).length > 0) {
            this._notifyListeners(changes);
        }
        
        return this;
    }
    
    /**
     * Subscribe to state changes for specific keys
     */
    subscribe(keys, callback) {
        const keyArray = Array.isArray(keys) ? keys : [keys];
        
        keyArray.forEach(key => {
            if (!this._listeners.has(key)) {
                this._listeners.set(key, new Set());
            }
            this._listeners.get(key).add(callback);
        });
        
        // Return unsubscribe function
        return () => {
            keyArray.forEach(key => {
                this._listeners.get(key)?.delete(callback);
            });
        };
    }
    
    /**
     * Subscribe to all state changes
     */
    subscribeAll(callback) {
        this._globalListeners.add(callback);
        return () => this._globalListeners.delete(callback);
    }
    
    /**
     * Notify all relevant listeners of state changes
     */
    _notifyListeners(changes) {
        // Notify specific key listeners
        for (const key of Object.keys(changes)) {
            const listeners = this._listeners.get(key);
            if (listeners) {
                listeners.forEach(callback => {
                    try {
                        callback(changes[key].new, changes[key].old, key);
                    } catch (error) {
                        console.error(`State listener error for key "${key}":`, error);
                    }
                });
            }
        }
        
        // Notify global listeners
        this._globalListeners.forEach(callback => {
            try {
                callback(changes, this._state);
            } catch (error) {
                console.error('Global state listener error:', error);
            }
        });
    }
    
    /**
     * Reset state to initial values
     */
    reset() {
        this.set({
            user: null,
            token: null,
            isAuthenticated: false,
            currentAnalysis: null,
            uploadedImage: null,
            analysisInProgress: false
        });
    }
    
    /**
     * Update authentication state
     */
    setAuth(user, token) {
        this.set({
            user,
            token,
            isAuthenticated: !!(user && token)
        });
    }
    
    /**
     * Clear authentication state
     */
    clearAuth() {
        this.set({
            user: null,
            token: null,
            isAuthenticated: false
        });
    }
}

// Export singleton instance
export const State = new StateManager();

// Also export for legacy compatibility
export const AppState = State;

export default State;
