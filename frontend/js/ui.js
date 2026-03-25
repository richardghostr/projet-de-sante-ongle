// ui.js — UI controller
import { Utils } from './utils.js';

export const UI = {
    elements: {},

    init() {
        this.cacheElements();
        this.bindGlobalEvents();
        this.initTheme();
    },

    cacheElements() {
        this.elements = {
            app: document.getElementById('app'),
            loadingOverlay: document.getElementById('loading-overlay'),
            toastContainer: document.getElementById('toast-container')
        };
    },

    bindGlobalEvents() {
        window.addEventListener('hashchange', () => window.Router?.handleRoute && window.Router.handleRoute());
        
        document.addEventListener('click', (e) => {
            // Close mobile menu on outside click
            const mobileMenu = document.getElementById('mobile-menu');
            const mobileBtn = document.getElementById('mobile-menu-btn');
            if (mobileMenu?.classList.contains('active')) {
                if (!mobileMenu.contains(e.target) && !mobileBtn?.contains(e.target)) {
                    mobileMenu.classList.remove('active');
                }
            }

            // Close sidebar on outside click (mobile)
            const sidebar = document.querySelector('.sidebar');
            const sidebarToggle = document.getElementById('sidebar-toggle');
            if (sidebar?.classList.contains('active') && window.innerWidth < 1024) {
                if (!sidebar.contains(e.target) && !sidebarToggle?.contains(e.target)) {
                    sidebar.classList.remove('active');
                }
            }
        });
    },

    initTheme() {
        const savedTheme = Utils.getStorage('unguealhealth_theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
        }
    },

    toggleTheme() {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        Utils.setStorage('unguealhealth_theme', isDark ? 'dark' : 'light');
        const toggle = document.getElementById('dark-mode-toggle');
        if (toggle) toggle.checked = isDark;
    },

    showLoading() {
        let overlay = this.elements.loadingOverlay || document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.innerHTML = '<div class="loading-spinner"></div>';
            document.body.appendChild(overlay);
            this.elements.loadingOverlay = overlay;
        }
        overlay.classList.add('active');
    },

    hideLoading() {
        const overlay = this.elements.loadingOverlay || document.getElementById('loading-overlay');
        if (overlay) overlay.classList.remove('active');
    },

    showToast(message, type = 'info', duration = 4000) {
        let container = this.elements.toastContainer || document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
            this.elements.toastContainer = container;
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>',
            error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));

        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, duration);
    },

    showModal(content, options = {}) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal ${options.size || ''}">
                ${options.title ? `
                    <div class="modal-header">
                        <h3>${options.title}</h3>
                        <button class="modal-close" onclick="UI.closeModal(this)">&times;</button>
                    </div>
                ` : ''}
                <div class="modal-body">${content}</div>
                ${options.footer ? `<div class="modal-footer">${options.footer}</div>` : ''}
            </div>
        `;
        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('active'));
        if (!options.persistent) modal.addEventListener('click', (e) => { if (e.target === modal) this.closeModal(modal); });
        return modal;
    },

    closeModal(element) {
        const modal = element.closest ? element.closest('.modal-overlay') : element;
        if (modal) { modal.classList.remove('active'); setTimeout(() => modal.remove(), 300); }
    },

    showConfirm(message, onConfirm, onCancel) {
        const modal = this.showModal(`<p>${message}</p>`, {
            title: 'Confirmation',
            footer: `
                <button class="btn btn-secondary" id="modal-cancel">Annuler</button>
                <button class="btn btn-danger" id="modal-confirm">Confirmer</button>
            `,
            persistent: true
        });

        modal.querySelector('#modal-confirm').addEventListener('click', () => { this.closeModal(modal); if (onConfirm) onConfirm(); });
        modal.querySelector('#modal-cancel').addEventListener('click', () => { this.closeModal(modal); if (onCancel) onCancel(); });
    },

    render(pageContent) {
        const app = this.elements.app || document.getElementById('app');
        if (app) app.innerHTML = pageContent;
    }
};
