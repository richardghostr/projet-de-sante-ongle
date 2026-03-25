// components.js — UI components
import { AppState, Utils } from './utils.js';

export const Components = {
    logo(size = 'default') {
        const sizeClass = size === 'small' ? 'logo-sm' : '';
        return `
            <svg class="logo-icon ${sizeClass}" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="18" stroke="currentColor" stroke-width="2"/>
                <path d="M20 8c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12" 
                      stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <circle cx="20" cy="20" r="4" fill="currentColor"/>
            </svg>
        `;
    },

    sidebar() {
        const user = (AppState && AppState.user) || {};
        const currentPage = AppState ? AppState.currentPage : '';
        const initials = `${(user.first_name || 'U')[0]}${(user.last_name || 'N')[0]}`.toUpperCase();
        return `
            <aside class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <a href="#dashboard" class="logo">
                        ${this.logo()}
                        <span>UngueaHealth</span>
                    </a>
                </div>
                <nav class="sidebar-nav">
                    <a href="#dashboard" class="nav-item ${currentPage === 'dashboard' ? 'active' : ''}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                        </svg>
                        <span>Dashboard</span>
                    </a>
                    <a href="#analyze" class="nav-item ${currentPage === 'analyze' ? 'active' : ''}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                            <circle cx="12" cy="13" r="4"/>
                        </svg>
                        <span>Nouvelle Analyse</span>
                    </a>
                    <a href="#history" class="nav-item ${currentPage === 'history' ? 'active' : ''}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
                        </svg>
                        <span>Historique</span>
                    </a>
                    <a href="#profile" class="nav-item ${currentPage === 'profile' ? 'active' : ''}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                        <span>Mon Profil</span>
                    </a>
                </nav>
                <div class="sidebar-footer">
                    <div class="user-info">
                        <div class="user-avatar">${initials}</div>
                        <div class="user-details">
                            <span class="user-name">${user.first_name || ''} ${user.last_name || ''}</span>
                            <span class="user-email">${user.email || ''}</span>
                        </div>
                    </div>
                    <button class="btn btn-outline btn-sm btn-block" onclick="window.Auth && window.Auth.logout()">
                        Deconnexion
                    </button>
                </div>
            </aside>
        `;
    },

    dashboardHeader(title) {
        return `
            <header class="dashboard-header">
                <div class="header-left">
                    <button class="mobile-sidebar-toggle" id="sidebar-toggle" onclick="document.getElementById('sidebar').classList.toggle('active')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="3" y1="12" x2="21" y2="12"/>
                            <line x1="3" y1="6" x2="21" y2="6"/>
                            <line x1="3" y1="18" x2="21" y2="18"/>
                        </svg>
                    </button>
                    <h1>${title}</h1>
                </div>
                <div class="header-right">
                    <button class="btn btn-icon" onclick="window.UI && window.UI.toggleTheme()" title="Changer le theme">Theme</button>
                </div>
            </header>
        `;
    },

    analysisCard(analysis) {
        const severityClass = Utils.getSeverityClass(analysis.severite || analysis.severity || 'faible');
        const confidence = Math.round((analysis.confiance || analysis.confidence || 0) * 100);
        const imagePath = analysis.image_path || '';
        const imageUrl = imagePath.startsWith('http') ? imagePath : `${(window.CONFIG ? window.CONFIG.API_BASE_URL : '/api').replace('/api', '')}/${imagePath}`;
        return `
            <div class="analysis-card" onclick="window.Router && window.Router.navigate('analysis/${analysis.id}')">
                <div class="analysis-image"><img src="${imageUrl}" alt="Analyse"></div>
                <div class="analysis-info">
                    <div class="analysis-diagnosis"><span class="diagnosis-badge ${severityClass}">${analysis.diagnostic || analysis.diagnosis || 'En attente'}</span></div>
                    <div class="analysis-meta"><span class="confidence">${confidence}% confiance</span><span class="date">${Utils.formatDateShort(analysis.date_analyse || analysis.created_at)}</span></div>
                </div>
            </div>
        `;
    },

    emptyState(icon, message, actionText, actionHref) {
        return `
            <div class="empty-state">
                ${icon}
                <p>${message}</p>
                ${actionText && actionHref ? `<a href="${actionHref}" class="btn btn-primary">${actionText}</a>` : ''}
            </div>
        `;
    }
};
