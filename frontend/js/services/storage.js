/**
 * UnguealHealth - Storage Service
 * LocalStorage wrapper with JSON serialization
 */

export const Storage = {
    /**
     * Set item in storage
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            return false;
        }
    },
    
    /**
     * Get item from storage
     */
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Storage get error:', error);
            return defaultValue;
        }
    },
    
    /**
     * Remove item from storage
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Storage remove error:', error);
            return false;
        }
    },
    
    /**
     * Check if key exists
     */
    has(key) {
        return localStorage.getItem(key) !== null;
    },
    
    /**
     * Clear all storage
     */
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    },
    
    /**
     * Get all keys
     */
    keys() {
        return Object.keys(localStorage);
    }
};

export default Storage;
