import { ApiService } from '../api.js';
import { Utils } from '../utils.js';

export const Dashboard = {
    async init() {
        await this.loadStats();
        await this.loadRecentAnalyses();
    },

    async loadStats() {
        try {
            const response = await ApiService.getStatistics();
            const stats = response.data || {};

            document.getElementById('total-analyses').textContent = stats.total || 0;
            document.getElementById('healthy-count').textContent = stats.healthy || 0;
            document.getElementById('pathology-count').textContent = stats.pathologies || 0;
            document.getElementById('last-analysis').textContent = stats.last_analysis 
                ? Utils.formatDateShort(stats.last_analysis) 
                : 'Aucune';
        } catch (error) {
            console.error('Error loading stats:', error);
            document.getElementById('total-analyses').textContent = '0';
            document.getElementById('healthy-count').textContent = '0';
            document.getElementById('pathology-count').textContent = '0';
            document.getElementById('last-analysis').textContent = 'Aucune';
        }
    },

    async loadRecentAnalyses() {
        try {
            const response = await ApiService.getHistory(1, 6);
            const container = document.getElementById('recent-analyses');
            const analyses = response.data || [];
            
            if (analyses.length === 0) {
                container.innerHTML = window.Components.emptyState(
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>',
                    'Aucune analyse pour le moment',
                    'Faire ma premiere analyse',
                    '#analyze'
                );
                return;
            }

            container.innerHTML = `
                <div class="analyses-grid">
                    ${analyses.map(a => window.Components.analysisCard(a)).join('')}
                </div>
            `;
        } catch (error) {
            console.error('Error loading analyses:', error);
            document.getElementById('recent-analyses').innerHTML = '<p class="error-text">Erreur de chargement</p>';
        }
    }
};

// expose for legacy compatibility
window.Dashboard = Dashboard;
export default Dashboard;
