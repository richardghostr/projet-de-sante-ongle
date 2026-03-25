// forms.js — Forms handler extracted from app.js
import { CONFIG, AppState, Utils } from './utils.js';
import { ApiService } from './api.js';
// Note: UI/Auth/Router/Components are attached to window by main bootstrap

export const Forms = {
    togglePassword(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.type = input.type === 'password' ? 'text' : 'password';
        }
    },

    initLoginForm() {
        const form = document.getElementById('login-form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            try {
                await window.Auth.login(formData.get('email'), formData.get('password'));
            } catch (error) {
                // Error handled in Auth.login
            }
        });
    },

    initRegisterForm() {
        const form = document.getElementById('register-form');
        const passwordInput = document.getElementById('password');

        passwordInput?.addEventListener('input', (e) => {
            const strength = this.checkPasswordStrength(e.target.value);
            const strengthEl = document.getElementById('password-strength');
            if (strengthEl) {
                strengthEl.innerHTML = `
                    <div class="strength-bar">
                        <div class="strength-fill ${strength.class}" style="width: ${strength.percent}%"></div>
                    </div>
                    <span class="strength-text">${strength.text}</span>
                `;
            }
        });

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            
            if (formData.get('password') !== formData.get('password_confirm')) {
                window.UI.showToast('Les mots de passe ne correspondent pas', 'error');
                return;
            }

            try {
                await window.Auth.register({
                    nom: formData.get('nom'),
                    prenom: formData.get('prenom'),
                    email: formData.get('email'),
                    password: formData.get('password'),
                    telephone: formData.get('telephone') || null,
                    date_naissance: formData.get('date_naissance') || null,
                    sexe: formData.get('sexe') || null,
                    consent_data: formData.get('consent_data') ? 1 : 0
                });
            } catch (error) {
                // Error handled in Auth.register
            }
        });
    },

    initForgotForm() {
        const form = document.getElementById('forgot-form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            try {
                await window.ApiService.forgotPassword(formData.get('email'));
                window.UI.showToast('Un email de reinitialisation a ete envoye', 'success');
                window.Router.navigate('login');
            } catch (error) {
                window.UI.showToast(error.message || 'Erreur', 'error');
            }
        });
    },

    checkPasswordStrength(password) {
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^a-zA-Z\d]/.test(password)) score++;

        const levels = [
            { class: 'weak', text: 'Tres faible', percent: 20 },
            { class: 'weak', text: 'Faible', percent: 40 },
            { class: 'medium', text: 'Moyen', percent: 60 },
            { class: 'strong', text: 'Fort', percent: 80 },
            { class: 'strong', text: 'Tres fort', percent: 100 }
        ];

        return levels[Math.min(score, 4)];
    }
};

// Expose for legacy code
window.Forms = Forms;

export default Forms;
