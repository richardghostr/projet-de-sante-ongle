import { ApiService } from '../api.js';
import { Utils, CONFIG } from '../utils.js';

export const Analysis = {
    selectedFile: null,
    analysisId: null,
    progressInterval: null,

    init() {
        this.bindEvents();
    },

    bindEvents() {
        const uploadArea = document.getElementById('upload-area');
        const imageInput = document.getElementById('image-input');
        const removeBtn = document.getElementById('remove-image');
        const analyzeBtn = document.getElementById('analyze-btn');

        uploadArea?.addEventListener('click', () => imageInput?.click());

        uploadArea?.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea?.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea?.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) this.handleFile(file);
        });

        imageInput?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleFile(file);
        });

        removeBtn?.addEventListener('click', () => this.resetUpload());
        analyzeBtn?.addEventListener('click', () => this.startAnalysis());
    },

    handleFile(file) {
        if (!CONFIG.ALLOWED_TYPES.includes(file.type)) {
            window.UI.showToast('Format de fichier non supporte', 'error');
            return;
        }

        if (file.size > CONFIG.MAX_FILE_SIZE) {
            window.UI.showToast('Fichier trop volumineux (max 10MB)', 'error');
            return;
        }

        this.selectedFile = file;

        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('preview-image').src = e.target.result;
            document.getElementById('file-name').textContent = file.name;
            document.getElementById('file-size').textContent = Utils.formatFileSize(file.size);
            
            document.getElementById('upload-section').classList.add('hidden');
            document.getElementById('preview-section').classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    },

    resetUpload() {
        this.selectedFile = null;
        this.analysisId = null;
        document.getElementById('image-input').value = '';
        document.getElementById('upload-section').classList.remove('hidden');
        document.getElementById('preview-section').classList.add('hidden');
        document.getElementById('results-section').classList.add('hidden');
        document.getElementById('analysis-loading').classList.add('hidden');
    },

    async startAnalysis() {
        if (!this.selectedFile) return;

        try {
            document.getElementById('preview-section').classList.add('hidden');
            document.getElementById('analysis-loading').classList.remove('hidden');

            this.simulateProgress();

            // Upload image
            const uploadResponse = await ApiService.uploadImage(this.selectedFile);
            this.analysisId = uploadResponse.analysis_id || uploadResponse.data?.analysis_id;

            // Analyze image
            const analysisResponse = await ApiService.analyzeImage(this.analysisId);
            
            // Complete progress
            const progressFill = document.getElementById('analysis-progress');
            const progressText = document.getElementById('progress-text');
            if (progressFill) progressFill.style.width = '100%';
            if (progressText) progressText.textContent = '100%';

            setTimeout(() => {
                this.showResults(analysisResponse.data || analysisResponse);
            }, 500);
        } catch (error) {
            window.UI.showToast(error.message || 'Erreur lors de l\'analyse', 'error');
            document.getElementById('analysis-loading').classList.add('hidden');
            document.getElementById('preview-section').classList.remove('hidden');
        }
    },

    simulateProgress() {
        let progress = 0;
        const progressFill = document.getElementById('analysis-progress');
        const progressText = document.getElementById('progress-text');
        
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 90) {
                clearInterval(interval);
                progress = 90;
            }
            if (progressFill) progressFill.style.width = progress + '%';
            if (progressText) progressText.textContent = Math.round(progress) + '%';
        }, 200);

        this.progressInterval = interval;
    },

    showResults(data) {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }

        document.getElementById('analysis-loading').classList.add('hidden');
        document.getElementById('results-section').classList.remove('hidden');

        const severityClass = Utils.getSeverityClass(data.severite || data.severity || 'faible');
        const confidencePercent = Math.round((data.confiance || data.confidence || 0) * 100);
        const recommendations = data.recommandations || data.recommendations || [];

        document.getElementById('results-section').innerHTML = `
            <div class="results-card">
                <div class="results-header">
                    <h2>Resultats de l'analyse</h2>
                    <span class="analysis-id">ID: ${data.analysis_id || this.analysisId || '--'}</span>
                </div>
                
                <div class="results-content">
                    <div class="results-image">
                        <img src="${document.getElementById('preview-image')?.src}" alt="Analyzed image">
                    </div>
                    
                    <div class="results-diagnosis">
                        <div class="diagnosis-main">
                            <span class="diagnosis-label">Diagnostic</span>
                            <span class="diagnosis-value ${severityClass}">${data.diagnostic || data.diagnosis || 'Non determine'}</span>
                        </div>
                        
                        <div class="confidence-meter">
                            <span class="confidence-label">Niveau de confiance</span>
                            <div class="confidence-bar">
                                <div class="confidence-fill" style="width: ${confidencePercent}%"></div>
                            </div>
                            <span class="confidence-value">${confidencePercent}%</span>
                        </div>
                        
                        <div class="severity-indicator">
                            <span class="severity-label">Severite</span>
                            <span class="severity-badge ${severityClass}">${data.severite || data.severity || 'Non evaluee'}</span>
                        </div>
                    </div>
                </div>
                
                ${recommendations.length > 0 ? `
                    <div class="recommendations">
                        <h3>Recommandations</h3>
                        <ul>${recommendations.map(r => `<li>${r}</li>`).join('')}</ul>
                    </div>
                ` : ''}
                
                ${data.description ? `
                    <div class="description">
                        <h3>Description</h3>
                        <p>${data.description}</p>
                    </div>
                ` : ''}
                
                <div class="results-actions">
                    <button class="btn btn-outline" onclick="Analysis.resetUpload()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                            <circle cx="12" cy="13" r="4"/>
                        </svg>
                        Nouvelle analyse
                    </button>
                    <a href="#history" class="btn btn-primary">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
                        </svg>
                        Voir l'historique
                    </a>
                </div>
                
                <div class="disclaimer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p>Cette analyse est fournie a titre indicatif et ne remplace pas un diagnostic medical professionnel.</p>
                </div>
            </div>
        `;
    }
};

window.Analysis = Analysis;
export default Analysis;
