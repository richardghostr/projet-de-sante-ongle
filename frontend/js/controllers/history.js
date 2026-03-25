import { ApiService } from '../api.js';
import { Utils, CONFIG } from '../utils.js';

export const History = {
    currentPage: 1,
    totalPages: 1,

    async init() {
        this.bindEvents();
        await this.loadHistory();
    },

    bindEvents() {
        const searchInput = document.getElementById('search-input');
        searchInput?.addEventListener('input', Utils.debounce(() => {
            this.currentPage = 1;
            this.loadHistory();
        }, 300));

        document.getElementById('filter-status')?.addEventListener('change', () => {
            this.currentPage = 1;
            this.loadHistory();
        });

        document.getElementById('export-btn')?.addEventListener('click', () => this.exportHistory());
    },

    async loadHistory() {
        try {
            const response = await ApiService.getHistory(this.currentPage, 10);
            const container = document.getElementById('history-list');
            const analyses = response.data || [];
            
            if (analyses.length === 0) {
                container.innerHTML = window.Components.emptyState(
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>',
                    'Aucune analyse trouvee',
                    'Faire une analyse',
                    '#analyze'
                );
                document.getElementById('pagination').innerHTML = '';
                return;
            }

            container.innerHTML = analyses.map(analysis => this.renderHistoryItem(analysis)).join('');
            
            this.totalPages = response.pagination?.total_pages || 1;
            this.renderPagination();
        } catch (error) {
            console.error('Error loading history:', error);
            document.getElementById('history-list').innerHTML = '<p class="error-text">Erreur de chargement</p>';
        }
    },

    renderHistoryItem(analysis) {
        const severityClass = Utils.getSeverityClass(analysis.severite || analysis.severity || 'faible');
        const confidence = Math.round((analysis.confiance || analysis.confidence || 0) * 100);
        const imagePath = analysis.image_path || '';
        const imageUrl = imagePath.startsWith('http') ? imagePath : `${CONFIG.API_BASE_URL.replace('/api', '')}/${imagePath}`;
        
        return `
            <div class="history-item" onclick="Router.navigate('analysis/${analysis.id}')">
                <div class="history-item-image">
                    <img src="${imageUrl}" alt="Analyse" onerror="this.style.display='none'">
                </div>
                <div class="history-item-info">
                    <div class="history-item-diagnosis">
                        <span class="diagnosis-badge ${severityClass}">${analysis.diagnostic || analysis.diagnosis || 'Non determine'}</span>
                        <span class="confidence">${confidence}%</span>
                    </div>
                    <div class="history-item-meta">
                        <span class="date">${Utils.formatDate(analysis.date_analyse || analysis.created_at)}</span>
                    </div>
                </div>
                <div class="history-item-actions">
                    <button class="btn btn-icon" onclick="event.stopPropagation(); History.deleteAnalysis(${analysis.id})" title="Supprimer">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    },

    renderPagination() {
        const container = document.getElementById('pagination');
        if (this.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = `
            <button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} onclick="History.goToPage(${this.currentPage - 1})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15,18 9,12 15,6"/></svg>
            </button>
        `;

        for (let i = 1; i <= this.totalPages; i++) {
            if (i === 1 || i === this.totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
                html += `<button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" onclick="History.goToPage(${i})">${i}</button>`;
            } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
                html += '<span class="pagination-dots">...</span>';
            }
        }

        html += `
            <button class="pagination-btn" ${this.currentPage === this.totalPages ? 'disabled' : ''} onclick="History.goToPage(${this.currentPage + 1})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>
            </button>
        `;

        container.innerHTML = html;
    },

    goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.loadHistory();
        }
    },

    deleteAnalysis(id) {
        window.UI.showConfirm('Etes-vous sur de vouloir supprimer cette analyse ?', async () => {
            try {
                await ApiService.deleteAnalysis(id);
                window.UI.showToast('Analyse supprimee', 'success');
                this.loadHistory();
            } catch (error) {
                window.UI.showToast(error.message || 'Erreur', 'error');
            }
        });
    },

    async exportHistory() {
        try {
            const response = await ApiService.exportHistory('json');
            const data = response.data || response;
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `unguealhealth_export_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            window.UI.showToast('Export reussi', 'success');
        } catch (error) {
            window.UI.showToast(error.message || 'Erreur d\'export', 'error');
        }
    }
};

window.History = History;
export default History;
