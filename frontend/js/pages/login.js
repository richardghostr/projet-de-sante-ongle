/**
 * Login Page
 * User authentication page
 */

import { dom } from '../utils/dom.js';
import { FormComponents } from '../components/forms.js';
import { UIComponents } from '../components/ui.js';
import { AuthService } from '../services/auth.js';

export const LoginPage = {
  render() {
    const container = dom.createElement('div', {
      classes: ['page', 'auth-page', 'login-page']
    });

    // Auth container
    const authContainer = dom.createElement('div', {
      classes: ['auth-container']
    });

    // Auth card
    const card = dom.createElement('div', {
      classes: ['auth-card']
    });

    // Header
    const header = dom.createElement('div', {
      classes: ['auth-header']
    });

    const logo = dom.createElement('div', {
      classes: ['auth-logo'],
      text: '🔒'
    });

    const title = dom.createElement('h1', {
      classes: ['auth-title'],
      text: 'Connexion'
    });

    const subtitle = dom.createElement('p', {
      classes: ['auth-subtitle'],
      text: 'Connectez-vous à votre compte UnguealHealth'
    });

    header.appendChild(logo);
    header.appendChild(title);
    header.appendChild(subtitle);
    card.appendChild(header);

    // Form
    const form = dom.createElement('form', {
      classes: ['auth-form'],
      attrs: { id: 'login-form' }
    });

    // Email field
    const emailField = FormComponents.formGroup({
      id: 'email',
      label: 'Adresse email',
      type: 'email',
      placeholder: 'vous@example.com',
      required: true
    });

    // Password field
    const passwordField = FormComponents.formGroup({
      id: 'password',
      label: 'Mot de passe',
      type: 'password',
      placeholder: 'Votre mot de passe',
      required: true
    });

    // Remember me
    const rememberMe = FormComponents.checkbox({
      id: 'remember',
      label: 'Se souvenir de moi',
      checked: false
    });

    // Submit button
    const submitBtn = dom.createElement('button', {
      classes: ['btn', 'btn-primary', 'btn-block', 'btn-lg'],
      attrs: { type: 'submit' },
      text: 'Se connecter'
    });

    form.appendChild(emailField);
    form.appendChild(passwordField);
    form.appendChild(rememberMe);
    form.appendChild(submitBtn);

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = emailField.input.value;
      const password = passwordField.input.value;

      console.log('[v0] Login attempt:', { email });

      const loadingSpinner = UIComponents.spinner();
      submitBtn.parentNode.insertBefore(loadingSpinner, submitBtn);
      submitBtn.disabled = true;

      try {
        const result = await AuthService.login(email, password);
        
        if (result.success) {
          UIComponents.toast('Connexion réussie!', { type: 'success' });
          setTimeout(() => {
            window.location.hash = '#/dashboard';
          }, 500);
        } else {
          UIComponents.toast(result.message || 'Erreur de connexion', { type: 'error' });
        }
      } catch (error) {
        console.error('[v0] Login error:', error);
        UIComponents.toast('Erreur de connexion', { type: 'error' });
      } finally {
        loadingSpinner.remove();
        submitBtn.disabled = false;
      }
    });

    card.appendChild(form);

    // Forgot password link
    const forgotPassword = dom.createElement('div', {
      classes: ['auth-footer']
    });

    const forgotLink = dom.createElement('a', {
      classes: ['auth-link'],
      attrs: { href: '#/forgot-password' },
      text: 'Mot de passe oublié?'
    });

    forgotPassword.appendChild(forgotLink);
    card.appendChild(forgotPassword);

    // Sign up link
    const signupSection = dom.createElement('div', {
      classes: ['auth-switch']
    });

    const signupText = dom.createElement('p', {
      text: 'Pas encore inscrit? '
    });

    const signupLink = dom.createElement('a', {
      classes: ['auth-link', 'bold'],
      attrs: { href: '#/register' },
      text: 'Créer un compte'
    });

    signupSection.appendChild(signupText);
    signupText.appendChild(signupLink);
    card.appendChild(signupSection);

    authContainer.appendChild(card);
    container.appendChild(authContainer);

    return container;
  }
};
