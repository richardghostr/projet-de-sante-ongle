import { ApiService } from '../api.js';
import { Utils, CONFIG } from '../utils.js';

export const Profile = {
    async init() {
        this.bindEvents();
        await this.loadProfile();
    },

    bindEvents() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabId = e.target.dataset.tab;
                this.switchTab(tabId);
            });
        });

        document.getElementById('profile-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProfile();
        });

        document.getElementById('password-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.changePassword();
        });

        document.getElementById('delete-account-btn')?.addEventListener('click', () => {
            this.deleteAccount();
        });

        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            darkModeToggle.checked = document.body.classList.contains('dark-theme');
            darkModeToggle.addEventListener('change', () => window.UI.toggleTheme());
        }
    },

    switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabId}`);
        });
    },

    async loadProfile() {
        try {
            const response = await ApiService.getProfile();
            const profile = (response && response.data && response.data.profile) ? response.data.profile : (response.profile || response);

            const mapping = {
                first_name: profile.prenom || '',
                last_name: profile.nom || '',
                email: profile.email || '',
                phone: profile.telephone || '',
                date_naissance: profile.date_naissance || '',
                sexe: profile.sexe || ''
            };

            Object.entries(mapping).forEach(([field, value]) => {
                const el = document.getElementById(field);
                if (el) el.value = value;
            });
        } catch (error) {
            const user = window.AppState.user || {};
            document.getElementById('first_name').value = user.first_name || '';
            document.getElementById('last_name').value = user.last_name || '';
            document.getElementById('email').value = user.email || '';
        }
    },

    async updateProfile() {
        try {
            const form = document.getElementById('profile-form');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            const payload = {};
            if (data.last_name !== undefined) payload.nom = data.last_name.trim();
            if (data.first_name !== undefined) payload.prenom = data.first_name.trim();
            if (data.phone !== undefined) payload.telephone = data.phone.trim();
            if (data.date_naissance !== undefined) payload.date_naissance = data.date_naissance;
            if (data.sexe !== undefined) payload.sexe = data.sexe;

            await ApiService.updateProfile(payload);

            window.AppState.user = { ...window.AppState.user, email: data.email || window.AppState.user.email };
            Utils.setStorage(CONFIG.USER_KEY, window.AppState.user);

            window.UI.showToast('Profil mis a jour', 'success');
        } catch (error) {
            window.UI.showToast(error.message || 'Erreur', 'error');
        }
    },

    async changePassword() {
        const form = document.getElementById('password-form');
        const formData = new FormData(form);

        if (formData.get('new_password') !== formData.get('confirm_password')) {
            window.UI.showToast('Les mots de passe ne correspondent pas', 'error');
            return;
        }

        try {
            await ApiService.changePassword({
                current_password: formData.get('current_password'),
                new_password: formData.get('new_password')
            });

            window.UI.showToast('Mot de passe modifie', 'success');
            form.reset();
        } catch (error) {
            window.UI.showToast(error.message || 'Erreur', 'error');
        }
    },

    deleteAccount() {
        window.UI.showConfirm(
            'Etes-vous sur de vouloir supprimer votre compte ? Cette action est irreversible.',
            async () => {
                try {
                    await ApiService.deleteAccount();
                    window.Auth.clearSession();
                    window.UI.showToast('Compte supprime', 'info');
                    window.Router.navigate('landing');
                } catch (error) {
                    window.UI.showToast(error.message || 'Erreur', 'error');
                }
            }
        );
    }
};

window.Profile = Profile;
export default Profile;
