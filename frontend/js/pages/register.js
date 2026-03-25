/**
 * Register Page
 * User registration/signup page
 */

import { dom } from '../utils/dom.js';
import { FormComponents } from '../components/forms.js';
import { UIComponents } from '../components/ui.js';
import { AuthService } from '../services/auth.js';
import { helpers } from '../utils/helpers.js';

export const RegisterPage = {
  render() {
    const container = dom.createElement('div', {
      classes: ['page', 'auth-page', 'register-page']
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
      text: '📝'
    });

    const title = dom.createElement('h1', {
      classes: ['auth-title'],
      text: 'Créer un compte'
    });

    const subtitle = dom.createElement('p', {
      classes: ['auth-subtitle'],
      text: 'Rejoignez UnguealHealth et commencez votre analyse'
    });

    header.appendChild(logo);
    header.appendChild(title);
    header.appendChild(subtitle);
    card.appendChild(header);

    // Form
    const form = dom.createElement('form', {
      classes: ['auth-form'],
      attrs: { id: 'register-form' }
    });

    // Full name field
    const nameField = FormComponents.formGroup({
      id: 'fullname',
      label: 'Nom complet',
      placeholder: 'Jean Dupont',
      required: true
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
      placeholder: 'Créez un mot de passe sécurisé',
      required: true,
      help: 'Minimum 8 caractères, une majuscule et un chiffre'
    });

    // Confirm password field
    const confirmPasswordField = FormComponents.formGroup({
      id: 'confirm_password',
      label: 'Confirmer le mot de passe',
      type: 'password',
      placeholder: 'Confirmez votre mot de passe',
      required: true
    });

    // Terms and conditions
    const termsCheckbox = FormComponents.checkbox({
      id: 'terms',
      label: 'J\'accepte les conditions d\'utilisation et la politique de confidentialité',
      required: true
    });

    // Submit button
    const submitBtn = dom.createElement('button', {
      classes: ['btn', 'btn-primary', 'btn-block', 'btn-lg'],
      attrs: { type: 'submit' },
      text: 'Créer mon compte'
    });

    form.appendChild(nameField);
    form.appendChild(emailField);
    form.appendChild(passwordField);
    form.appendChild(confirmPasswordField);
    form.appendChild(termsCheckbox);
    form.appendChild(submitBtn);

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = nameField.input.value.trim();
      const email = emailField.input.value.trim();
      const password = passwordField.input.value;
      const confirmPassword = confirmPasswordField.input.value;
      const acceptedTerms = termsCheckbox.input.checked;

      // Validation
      const validator = FormComponents.createValidator();
      let isValid = true;

      isValid &= validator.validate('fullname', name, ['required', 'min:2']);
      isValid &= validator.validate('email', email, ['required', 'email']);
      isValid &= validator.validate('password', password, ['required', 'password']);
      isValid &= validator.validate('confirm_password', confirmPassword, 
        ['required', `match:password:${password}`]);
      
      if (!acceptedTerms) {
        validator.errors.terms = ['Vous devez accepter les conditions'];
        isValid = false;
      }

      if (!isValid) {
        const errorMessages = Object.entries(validator.errors)
          .filter(([_, errors]) => errors.length > 0)
          .map(([_, errors]) => errors[0])
          .join('\n');
        
        UIComponents.toast(errorMessages, { type: 'error' });
        return;
      }

      console.log('[v0] Registration attempt:', { name, email });

      const loadingSpinner = UIComponents.spinner();
      submitBtn.parentNode.insertBefore(loadingSpinner, submitBtn);
      submitBtn.disabled = true;

      try {
        // Build payload matching backend field names
        const payload = {
          nom: name,
          email,
          password,
          consent_data: acceptedTerms ? 1 : 0
        };

        const result = await AuthService.register(payload);
        
        if (result.success) {
          UIComponents.toast('Inscription réussie! Redirection...', { type: 'success' });
          setTimeout(() => {
            window.location.hash = '#/dashboard';
          }, 500);
        } else {
          UIComponents.toast(result.message || 'Erreur d\'inscription', { type: 'error' });
        }
      } catch (error) {
        console.error('[v0] Registration error:', error);
        UIComponents.toast('Erreur d\'inscription', { type: 'error' });
      } finally {
        loadingSpinner.remove();
        submitBtn.disabled = false;
      }
    });

    card.appendChild(form);

    // Login link
    const loginSection = dom.createElement('div', {
      classes: ['auth-switch']
    });

    const loginText = dom.createElement('p', {
      text: 'Vous avez déjà un compte? '
    });

    const loginLink = dom.createElement('a', {
      classes: ['auth-link', 'bold'],
      attrs: { href: '#/login' },
      text: 'Se connecter'
    });

    loginSection.appendChild(loginText);
    loginText.appendChild(loginLink);
    card.appendChild(loginSection);

    authContainer.appendChild(card);
    container.appendChild(authContainer);

    return container;
  }
};
