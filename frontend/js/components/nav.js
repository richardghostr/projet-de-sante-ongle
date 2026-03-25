/**
 * Navigation Component
 * Header and navigation utilities
 */

import { dom } from '../utils/dom.js';
import { AuthService } from '../services/auth.js';

export const NavComponent = {
  /**
   * Create the main navigation bar
   */
  createNav(options = {}) {
    const nav = dom.createElement('nav', {
      classes: ['navbar']
    });

    const container = dom.createElement('div', {
      classes: ['navbar-container']
    });

    // Brand/Logo
    const brand = dom.createElement('div', {
      classes: ['navbar-brand']
    });

    const logo = dom.createElement('a', {
      classes: ['navbar-logo'],
      attrs: { href: '#/' },
      text: 'UnguealHealth'
    });

    brand.appendChild(logo);
    container.appendChild(brand);

    // Navigation menu
    const menu = dom.createElement('div', {
      classes: ['navbar-menu']
    });

    const navLinks = dom.createElement('div', {
      classes: ['navbar-nav']
    });

    // Public nav items
    const publicLinks = [
      { href: '#/', label: 'Accueil' },
      { href: '#/about', label: 'À propos' },
      { href: '#/contact', label: 'Contact' }
    ];

    // Auth nav items
    const authLinks = [
      { href: '#/dashboard', label: 'Tableau de bord' },
      { href: '#/analyze', label: 'Analyser' },
      { href: '#/history', label: 'Historique' }
    ];

    const isAuthenticated = AuthService.isAuthenticated();

    const links = isAuthenticated ? authLinks : publicLinks;

    links.forEach(link => {
      const navItem = dom.createElement('a', {
        classes: ['nav-link'],
        attrs: { href: link.href },
        text: link.label
      });
      navLinks.appendChild(navItem);
    });

    menu.appendChild(navLinks);

    // User menu or auth buttons
    const navRight = dom.createElement('div', {
      classes: ['navbar-right']
    });

    if (isAuthenticated) {
      const userMenu = dom.createElement('div', {
        classes: ['user-menu']
      });

      const userBtn = dom.createElement('button', {
        classes: ['user-btn'],
        attrs: { type: 'button' }
      });
      userBtn.innerHTML = '<span class="user-icon">👤</span>';

      const dropdown = dom.createElement('div', {
        classes: ['user-dropdown']
      });

      const profileLink = dom.createElement('a', {
        classes: ['dropdown-item'],
        attrs: { href: '#/profile' },
        text: 'Mon profil'
      });

      const settingsLink = dom.createElement('a', {
        classes: ['dropdown-item'],
        attrs: { href: '#/settings' },
        text: 'Paramètres'
      });

      const logoutBtn = dom.createElement('button', {
        classes: ['dropdown-item', 'logout-btn'],
        attrs: { type: 'button' },
        text: 'Déconnexion'
      });

      dropdown.appendChild(profileLink);
      dropdown.appendChild(settingsLink);
      dropdown.appendChild(logoutBtn);

      userBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
      });

      logoutBtn.addEventListener('click', () => {
        AuthService.logout();
        window.location.hash = '/';
      });

      userMenu.appendChild(userBtn);
      userMenu.appendChild(dropdown);
      navRight.appendChild(userMenu);
    } else {
      const loginBtn = dom.createElement('a', {
        classes: ['btn', 'btn-secondary'],
        attrs: { href: '#/login' },
        text: 'Connexion'
      });

      const signupBtn = dom.createElement('a', {
        classes: ['btn', 'btn-primary'],
        attrs: { href: '#/register' },
        text: "S'inscrire"
      });

      navRight.appendChild(loginBtn);
      navRight.appendChild(signupBtn);
    }

    menu.appendChild(navRight);

    // Mobile menu toggle
    const hamburger = dom.createElement('button', {
      classes: ['navbar-toggle'],
      attrs: { type: 'button', 'aria-label': 'Toggle menu' }
    });
    hamburger.innerHTML = '<span></span><span></span><span></span>';

    hamburger.addEventListener('click', () => {
      menu.classList.toggle('show');
    });

    container.appendChild(menu);
    container.appendChild(hamburger);

    nav.appendChild(container);

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      const dropdown = nav.querySelector('.user-dropdown');
      if (dropdown) {
        dropdown.classList.remove('show');
      }
    });

    return nav;
  },

  /**
   * Create a breadcrumb navigation
   */
  createBreadcrumb(items) {
    const nav = dom.createElement('nav', {
      classes: ['breadcrumb'],
      attrs: { 'aria-label': 'Breadcrumb' }
    });

    const list = dom.createElement('ol', {
      classes: ['breadcrumb-list']
    });

    items.forEach((item, index) => {
      const li = dom.createElement('li', {
        classes: ['breadcrumb-item']
      });

      if (index < items.length - 1) {
        const link = dom.createElement('a', {
          attrs: { href: item.href },
          text: item.label
        });
        li.appendChild(link);
      } else {
        const span = dom.createElement('span', {
          attrs: { 'aria-current': 'page' },
          text: item.label
        });
        li.appendChild(span);
      }

      list.appendChild(li);
    });

    nav.appendChild(list);
    return nav;
  }
};
