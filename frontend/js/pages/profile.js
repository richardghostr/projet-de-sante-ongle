/**
 * Profile Page
 * User profile and account settings
 */

import { dom } from '../utils/dom.js';
import { NavComponent } from '../components/nav.js';
import { FormComponents } from '../components/forms.js';
import { UIComponents } from '../components/ui.js';

export const ProfilePage = {
  render() {
    const container = dom.createElement('div', {
      classes: ['page', 'profile-page']
    });

    // Navigation
    const nav = NavComponent.createNav();
    container.appendChild(nav);

    // Main content
    const main = dom.createElement('main', {
      classes: ['profile-main']
    });

    // Header
    const header = dom.createElement('section', {
      classes: ['page-header']
    });

    const headerContent = dom.createElement('div', {
      classes: ['page-header-content']
    });

    const title = dom.createElement('h1', {
      classes: ['page-title'],
      text: 'Mon Profil'
    });

    headerContent.appendChild(title);
    header.appendChild(headerContent);
    main.appendChild(header);

    // Profile container
    const profileContainer = dom.createElement('section', {
      classes: ['profile-container']
    });

    // Sidebar with navigation tabs
    const sidebar = dom.createElement('div', {
      classes: ['profile-sidebar']
    });

    const tabs = [
      { id: 'personal', label: 'Informations personnelles' },
      { id: 'security', label: 'Sécurité' },
      { id: 'preferences', label: 'Préférences' },
      { id: 'notifications', label: 'Notifications' }
    ];

    tabs.forEach(tab => {
      const tabBtn = dom.createElement('button', {
        classes: ['tab-btn', tab.id === 'personal' ? 'active' : ''],
        attrs: { type: 'button', 'data-tab': tab.id },
        text: tab.label
      });

      tabBtn.addEventListener('click', () => {
        switchTab(tab.id);
      });

      sidebar.appendChild(tabBtn);
    });

    profileContainer.appendChild(sidebar);

    // Main content area
    const content = dom.createElement('div', {
      classes: ['profile-content']
    });

    // Personal info tab
    const personalTab = dom.createElement('div', {
      classes: ['tab-content', 'active'],
      attrs: { 'data-tab': 'personal' }
    });

    const personalTitle = dom.createElement('h2', {
      text: 'Informations personnelles'
    });

    personalTab.appendChild(personalTitle);

    // Avatar section
    const avatarSection = dom.createElement('div', {
      classes: ['avatar-section']
    });

    const avatar = dom.createElement('div', {
      classes: ['avatar'],
      text: '👤'
    });

    const avatarControls = dom.createElement('div', {
      classes: ['avatar-controls']
    });

    const uploadAvatarBtn = dom.createElement('button', {
      classes: ['btn', 'btn-secondary', 'btn-sm'],
      attrs: { type: 'button' },
      text: 'Changer l\'avatar'
    });

    const removeAvatarBtn = dom.createElement('button', {
      classes: ['btn', 'btn-secondary', 'btn-sm'],
      attrs: { type: 'button' },
      text: 'Supprimer'
    });

    uploadAvatarBtn.addEventListener('click', () => {
      UIComponents.toast('Fonctionnalité non disponible pour le moment', { type: 'info' });
    });

    removeAvatarBtn.addEventListener('click', () => {
      UIComponents.toast('Avatar supprimé', { type: 'success' });
    });

    avatarControls.appendChild(uploadAvatarBtn);
    avatarControls.appendChild(removeAvatarBtn);
    avatarSection.appendChild(avatar);
    avatarSection.appendChild(avatarControls);
    personalTab.appendChild(avatarSection);

    // Form fields
    const nameField = FormComponents.formGroup({
      id: 'fullname',
      label: 'Nom complet',
      placeholder: 'Jean Dupont',
      value: 'Jean Dupont'
    });

    const emailField = FormComponents.formGroup({
      id: 'email',
      label: 'Adresse email',
      type: 'email',
      placeholder: 'jean@example.com',
      value: 'jean@example.com'
    });

    const phoneField = FormComponents.formGroup({
      id: 'phone',
      label: 'Numéro de téléphone',
      placeholder: '+33 6 12 34 56 78'
    });

    const dateOfBirthField = FormComponents.formGroup({
      id: 'dob',
      label: 'Date de naissance',
      type: 'date'
    });

    const genderField = FormComponents.select({
      id: 'gender',
      label: 'Sexe',
      options: [
        { value: '', label: '- Sélectionner -' },
        { value: 'male', label: 'Homme' },
        { value: 'female', label: 'Femme' },
        { value: 'other', label: 'Autre' }
      ]
    });

    personalTab.appendChild(nameField);
    personalTab.appendChild(emailField);
    personalTab.appendChild(phoneField);
    personalTab.appendChild(dateOfBirthField);
    personalTab.appendChild(genderField);

    // Save button
    const saveBtnPersonal = dom.createElement('button', {
      classes: ['btn', 'btn-primary'],
      attrs: { type: 'button' },
      text: 'Enregistrer les modifications'
    });

    saveBtnPersonal.addEventListener('click', () => {
      UIComponents.toast('Profil mis à jour!', { type: 'success' });
    });

    personalTab.appendChild(saveBtnPersonal);
    content.appendChild(personalTab);

    // Security tab
    const securityTab = dom.createElement('div', {
      classes: ['tab-content'],
      attrs: { 'data-tab': 'security' }
    });

    const securityTitle = dom.createElement('h2', {
      text: 'Sécurité'
    });

    securityTab.appendChild(securityTitle);

    const passwordSection = dom.createElement('div', {
      classes: ['security-section']
    });

    const passwordSubtitle = dom.createElement('h3', {
      text: 'Changer votre mot de passe'
    });

    const currentPwdField = FormComponents.formGroup({
      id: 'current_password',
      label: 'Mot de passe actuel',
      type: 'password',
      placeholder: 'Votre mot de passe actuel'
    });

    const newPwdField = FormComponents.formGroup({
      id: 'new_password',
      label: 'Nouveau mot de passe',
      type: 'password',
      placeholder: 'Entrez un nouveau mot de passe',
      help: 'Minimum 8 caractères, une majuscule et un chiffre'
    });

    const confirmPwdField = FormComponents.formGroup({
      id: 'confirm_password',
      label: 'Confirmer le mot de passe',
      type: 'password',
      placeholder: 'Confirmez votre nouveau mot de passe'
    });

    const updatePwdBtn = dom.createElement('button', {
      classes: ['btn', 'btn-primary'],
      attrs: { type: 'button' },
      text: 'Mettre à jour le mot de passe'
    });

    updatePwdBtn.addEventListener('click', () => {
      UIComponents.toast('Mot de passe mis à jour!', { type: 'success' });
    });

    passwordSection.appendChild(passwordSubtitle);
    passwordSection.appendChild(currentPwdField);
    passwordSection.appendChild(newPwdField);
    passwordSection.appendChild(confirmPwdField);
    passwordSection.appendChild(updatePwdBtn);
    securityTab.appendChild(passwordSection);

    // Two-factor authentication
    const twoFactorSection = dom.createElement('div', {
      classes: ['security-section']
    });

    const twoFactorSubtitle = dom.createElement('h3', {
      text: 'Authentification à deux facteurs'
    });

    const twoFactorDesc = dom.createElement('p', {
      text: 'Sécurisez votre compte avec une authentification à deux facteurs'
    });

    const enableTwoFactorBtn = dom.createElement('button', {
      classes: ['btn', 'btn-secondary'],
      attrs: { type: 'button' },
      text: 'Activer l\'authentification à deux facteurs'
    });

    enableTwoFactorBtn.addEventListener('click', () => {
      UIComponents.toast('2FA activée!', { type: 'success' });
    });

    twoFactorSection.appendChild(twoFactorSubtitle);
    twoFactorSection.appendChild(twoFactorDesc);
    twoFactorSection.appendChild(enableTwoFactorBtn);
    securityTab.appendChild(twoFactorSection);

    content.appendChild(securityTab);

    // Preferences tab
    const preferencesTab = dom.createElement('div', {
      classes: ['tab-content'],
      attrs: { 'data-tab': 'preferences' }
    });

    const preferencesTitle = dom.createElement('h2', {
      text: 'Préférences'
    });

    preferencesTab.appendChild(preferencesTitle);

    const languageField = FormComponents.select({
      id: 'language',
      label: 'Langue',
      options: [
        { value: 'fr', label: 'Français' },
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Español' }
      ]
    });

    const themeField = FormComponents.select({
      id: 'theme',
      label: 'Thème',
      options: [
        { value: 'light', label: 'Clair' },
        { value: 'dark', label: 'Sombre' },
        { value: 'auto', label: 'Automatique' }
      ]
    });

    const savePreferencesBtn = dom.createElement('button', {
      classes: ['btn', 'btn-primary'],
      attrs: { type: 'button' },
      text: 'Enregistrer les préférences'
    });

    savePreferencesBtn.addEventListener('click', () => {
      UIComponents.toast('Préférences mises à jour!', { type: 'success' });
    });

    preferencesTab.appendChild(languageField);
    preferencesTab.appendChild(themeField);
    preferencesTab.appendChild(savePreferencesBtn);
    content.appendChild(preferencesTab);

    // Notifications tab
    const notificationsTab = dom.createElement('div', {
      classes: ['tab-content'],
      attrs: { 'data-tab': 'notifications' }
    });

    const notificationsTitle = dom.createElement('h2', {
      text: 'Notifications'
    });

    notificationsTab.appendChild(notificationsTitle);

    const emailNotifs = FormComponents.checkbox({
      id: 'email_notifs',
      label: 'Recevoir les notifications par email',
      checked: true
    });

    const analysisNotifs = FormComponents.checkbox({
      id: 'analysis_notifs',
      label: 'Notifications sur les résultats d\'analyse',
      checked: true
    });

    const newsNotifs = FormComponents.checkbox({
      id: 'news_notifs',
      label: 'Recevoir nos actualités et offres',
      checked: false
    });

    const saveNotificationsBtn = dom.createElement('button', {
      classes: ['btn', 'btn-primary'],
      attrs: { type: 'button' },
      text: 'Enregistrer les paramètres de notification'
    });

    saveNotificationsBtn.addEventListener('click', () => {
      UIComponents.toast('Paramètres de notification mis à jour!', { type: 'success' });
    });

    notificationsTab.appendChild(emailNotifs);
    notificationsTab.appendChild(analysisNotifs);
    notificationsTab.appendChild(newsNotifs);
    notificationsTab.appendChild(saveNotificationsBtn);
    content.appendChild(notificationsTab);

    profileContainer.appendChild(content);
    main.appendChild(profileContainer);

    container.appendChild(main);

    // Tab switching function
    function switchTab(tabId) {
      // Hide all tabs
      const allTabs = dom.queryAll('[data-tab]');
      allTabs.forEach(tab => tab.classList.remove('active'));

      // Deactivate all buttons
      const allBtns = sidebar.querySelectorAll('[data-tab]');
      allBtns.forEach(btn => btn.classList.remove('active'));

      // Show selected tab
      const selectedTab = dom.query(`[data-tab="${tabId}"]`);
      if (selectedTab) {
        selectedTab.classList.add('active');
      }

      // Activate selected button
      const selectedBtn = sidebar.querySelector(`[data-tab="${tabId}"]`);
      if (selectedBtn) {
        selectedBtn.classList.add('active');
      }
    }

    return container;
  }
};
