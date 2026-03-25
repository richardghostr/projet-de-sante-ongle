/**
 * UnguealHealth - Application Configuration
 * Centralized configuration and constants
 */

export const CONFIG = {
    // API Configuration
    API_BASE_URL: '/api',
    IA_URL: '/api/ia',
    
    // File Upload
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
    
    // Storage Keys
    TOKEN_KEY: 'unguealhealth_token',
    USER_KEY: 'unguealhealth_user',
    THEME_KEY: 'unguealhealth_theme',
    
    // UI
    TOAST_DURATION: 4000,
    LOADING_DELAY: 200,
    DEBOUNCE_DELAY: 300,
    
    // Pagination
    DEFAULT_PAGE_SIZE: 10,
    
    // Routes
    PUBLIC_ROUTES: ['', 'landing', 'login', 'register', 'forgot-password', 'about', 'contact'],
    PROTECTED_ROUTES: ['dashboard', 'analyze', 'history', 'analysis', 'profile'],
    AUTH_ROUTES: ['login', 'register', 'forgot-password'],
};

// Severity levels for health assessments
export const SEVERITY_LEVELS = {
    HEALTHY: { key: 'healthy', label: 'Sain', color: '#10B981', bgColor: '#D1FAE5' },
    LOW: { key: 'low', label: 'Faible', color: '#3B82F6', bgColor: '#DBEAFE' },
    MODERATE: { key: 'moderate', label: 'Modere', color: '#F59E0B', bgColor: '#FEF3C7' },
    HIGH: { key: 'high', label: 'Eleve', color: '#F97316', bgColor: '#FED7AA' },
    CRITICAL: { key: 'critical', label: 'Critique', color: '#EF4444', bgColor: '#FEE2E2' }
};

// Pathologies detected by the AI
export const PATHOLOGIES = [
    { id: 'healthy', name: 'Sain', description: 'Ongle normal sans pathologie', severity: 'healthy' },
    { id: 'onychomycosis', name: 'Onychomycose', description: 'Infection fongique de l\'ongle', severity: 'moderate' },
    { id: 'psoriasis', name: 'Psoriasis ungeal', description: 'Manifestation du psoriasis sur les ongles', severity: 'moderate' },
    { id: 'melanoma', name: 'Melanome sous-ungeal', description: 'Cancer de la peau sous l\'ongle', severity: 'critical' },
    { id: 'trauma', name: 'Traumatisme', description: 'Lesion due a un choc ou pression', severity: 'low' },
    { id: 'deficiency', name: 'Carence', description: 'Signes de carences nutritionnelles', severity: 'moderate' },
    { id: 'lichen', name: 'Lichen plan', description: 'Maladie inflammatoire de l\'ongle', severity: 'moderate' },
    { id: 'paronychia', name: 'Paronychie', description: 'Infection du pourtour de l\'ongle', severity: 'moderate' }
];

export default CONFIG;
