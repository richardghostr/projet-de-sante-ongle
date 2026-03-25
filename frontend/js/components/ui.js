/**
 * UI Components Library
 * Reusable UI components
 */

import { dom } from '../utils/dom.js';

export const UIComponents = {
  /**
   * Create a card component
   */
  card(options = {}) {
    const card = dom.createElement('div', {
      classes: ['card', options.className].filter(Boolean)
    });

    if (options.header) {
      const header = dom.createElement('div', {
        classes: ['card-header'],
        text: options.header
      });
      card.appendChild(header);
    }

    if (options.content) {
      const content = dom.createElement('div', {
        classes: ['card-content'],
        html: options.content
      });
      card.appendChild(content);
    }

    if (options.footer) {
      const footer = dom.createElement('div', {
        classes: ['card-footer'],
        html: options.footer
      });
      card.appendChild(footer);
    }

    return card;
  },

  /**
   * Create a button
   */
  button(text, options = {}) {
    const btn = dom.createElement('button', {
      classes: ['btn', `btn-${options.variant || 'primary'}`, options.className].filter(Boolean),
      text,
      attrs: {
        type: options.type || 'button',
        disabled: options.disabled ? 'disabled' : undefined
      }
    });

    if (options.onClick) {
      btn.addEventListener('click', options.onClick);
    }

    return btn;
  },

  /**
   * Create a badge
   */
  badge(text, options = {}) {
    return dom.createElement('span', {
      classes: ['badge', `badge-${options.variant || 'primary'}', options.className].filter(Boolean),
      text
    });
  },

  /**
   * Create an alert
   */
  alert(message, type = 'info') {
    const alert = dom.createElement('div', {
      classes: ['alert', `alert-${type}`]
    });

    const content = dom.createElement('div', {
      classes: ['alert-content']
    });

    const icon = dom.createElement('span', {
      classes: ['alert-icon'],
      text: this.getAlertIcon(type)
    });

    const text = dom.createElement('span', {
      classes: ['alert-text'],
      text: message
    });

    const closeBtn = dom.createElement('button', {
      classes: ['alert-close'],
      attrs: { type: 'button' }
    });
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => alert.remove());

    content.appendChild(icon);
    content.appendChild(text);
    alert.appendChild(content);
    alert.appendChild(closeBtn);

    return alert;
  },

  /**
   * Create a loading spinner
   */
  spinner(options = {}) {
    const spinner = dom.createElement('div', {
      classes: ['spinner', options.className].filter(Boolean)
    });

    const inner = dom.createElement('div', {
      classes: ['spinner-inner']
    });

    spinner.appendChild(inner);
    return spinner;
  },

  /**
   * Create a modal
   */
  modal(options = {}) {
    const modal = dom.createElement('div', {
      classes: ['modal', options.className].filter(Boolean),
      attrs: { role: 'dialog' }
    });

    const backdrop = dom.createElement('div', {
      classes: ['modal-backdrop']
    });

    const dialog = dom.createElement('div', {
      classes: ['modal-dialog']
    });

    const content = dom.createElement('div', {
      classes: ['modal-content']
    });

    if (options.title) {
      const header = dom.createElement('div', {
        classes: ['modal-header']
      });

      const title = dom.createElement('h2', {
        classes: ['modal-title'],
        text: options.title
      });

      const closeBtn = dom.createElement('button', {
        classes: ['modal-close'],
        attrs: { type: 'button', 'aria-label': 'Close' }
      });
      closeBtn.innerHTML = '&times;';

      header.appendChild(title);
      header.appendChild(closeBtn);
      content.appendChild(header);

      closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        if (options.onClose) options.onClose();
      });
    }

    if (options.body) {
      const body = dom.createElement('div', {
        classes: ['modal-body'],
        html: options.body
      });
      content.appendChild(body);
    }

    if (options.footer) {
      const footer = dom.createElement('div', {
        classes: ['modal-footer'],
        html: options.footer
      });
      content.appendChild(footer);
    }

    dialog.appendChild(content);
    modal.appendChild(backdrop);
    modal.appendChild(dialog);

    backdrop.addEventListener('click', () => {
      modal.classList.remove('active');
      if (options.onClose) options.onClose();
    });

    modal.show = () => {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    };

    modal.hide = () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    };

    return modal;
  },

  /**
   * Create a toast notification
   */
  toast(message, options = {}) {
    const toast = dom.createElement('div', {
      classes: ['toast', `toast-${options.type || 'info'}`, options.className].filter(Boolean)
    });

    const content = dom.createElement('div', {
      classes: ['toast-content'],
      text: message
    });

    toast.appendChild(content);
    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto remove
    const duration = options.duration || 3000;
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);

    return toast;
  },

  /**
   * Create a progress bar
   */
  progressBar(value = 0, options = {}) {
    const container = dom.createElement('div', {
      classes: ['progress', options.className].filter(Boolean)
    });

    const bar = dom.createElement('div', {
      classes: ['progress-bar']
    });

    bar.style.width = `${Math.min(Math.max(value, 0), 100)}%`;

    if (options.label) {
      const label = dom.createElement('span', {
        classes: ['progress-label'],
        text: options.label
      });
      container.appendChild(label);
    }

    container.appendChild(bar);

    container.setValue = (newValue) => {
      bar.style.width = `${Math.min(Math.max(newValue, 0), 100)}%`;
    };

    return container;
  },

  /**
   * Get appropriate alert icon
   */
  getAlertIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  }
};
