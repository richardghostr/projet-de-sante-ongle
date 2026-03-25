/**
 * Form Components Library
 * Reusable form components and validation
 */

import { dom } from '../utils/dom.js';
import { helpers } from '../utils/helpers.js';

export const FormComponents = {
  /**
   * Create a form group
   */
  formGroup(options = {}) {
    const group = dom.createElement('div', {
      classes: ['form-group', options.className].filter(Boolean)
    });

    if (options.label) {
      const label = dom.createElement('label', {
        classes: ['form-label'],
        text: options.label,
        attrs: { for: options.id }
      });
      group.appendChild(label);
    }

    const input = dom.createElement('input', {
      classes: ['form-input', options.inputClass].filter(Boolean),
      attrs: {
        type: options.type || 'text',
        placeholder: options.placeholder || '',
        required: options.required ? 'required' : undefined,
        disabled: options.disabled ? 'disabled' : undefined,
        name: options.name || options.id,
        id: options.id,
        minlength: options.minLength,
        maxlength: options.maxLength,
        pattern: options.pattern
      }
    });

    if (options.value) {
      input.value = options.value;
    }

    group.appendChild(input);

    if (options.help) {
      const help = dom.createElement('small', {
        classes: ['form-help'],
        text: options.help
      });
      group.appendChild(help);
    }

    group.input = input;
    return group;
  },

  /**
   * Create a textarea field
   */
  textarea(options = {}) {
    const group = dom.createElement('div', {
      classes: ['form-group', options.className].filter(Boolean)
    });

    if (options.label) {
      const label = dom.createElement('label', {
        classes: ['form-label'],
        text: options.label,
        attrs: { for: options.id }
      });
      group.appendChild(label);
    }

    const textarea = dom.createElement('textarea', {
      classes: ['form-textarea', options.inputClass].filter(Boolean),
      attrs: {
        placeholder: options.placeholder || '',
        required: options.required ? 'required' : undefined,
        disabled: options.disabled ? 'disabled' : undefined,
        name: options.name || options.id,
        id: options.id,
        rows: options.rows || 3
      }
    });

    if (options.value) {
      textarea.value = options.value;
    }

    group.appendChild(textarea);

    if (options.help) {
      const help = dom.createElement('small', {
        classes: ['form-help'],
        text: options.help
      });
      group.appendChild(help);
    }

    group.input = textarea;
    return group;
  },

  /**
   * Create a select field
   */
  select(options = {}) {
    const group = dom.createElement('div', {
      classes: ['form-group', options.className].filter(Boolean)
    });

    if (options.label) {
      const label = dom.createElement('label', {
        classes: ['form-label'],
        text: options.label,
        attrs: { for: options.id }
      });
      group.appendChild(label);
    }

    const select = dom.createElement('select', {
      classes: ['form-select', options.inputClass].filter(Boolean),
      attrs: {
        required: options.required ? 'required' : undefined,
        disabled: options.disabled ? 'disabled' : undefined,
        name: options.name || options.id,
        id: options.id
      }
    });

    if (options.placeholder) {
      const placeholder = dom.createElement('option', {
        attrs: { value: '', disabled: 'disabled', selected: 'selected' },
        text: options.placeholder
      });
      select.appendChild(placeholder);
    }

    if (options.options && Array.isArray(options.options)) {
      options.options.forEach(opt => {
        const option = dom.createElement('option', {
          attrs: { value: opt.value },
          text: opt.label || opt.text
        });
        if (options.value === opt.value) {
          option.selected = true;
        }
        select.appendChild(option);
      });
    }

    group.appendChild(select);

    if (options.help) {
      const help = dom.createElement('small', {
        classes: ['form-help'],
        text: options.help
      });
      group.appendChild(help);
    }

    group.input = select;
    return group;
  },

  /**
   * Create a checkbox
   */
  checkbox(options = {}) {
    const group = dom.createElement('div', {
      classes: ['form-check', options.className].filter(Boolean)
    });

    const input = dom.createElement('input', {
      classes: ['form-check-input'],
      attrs: {
        type: 'checkbox',
        id: options.id,
        name: options.name || options.id,
        required: options.required ? 'required' : undefined,
        disabled: options.disabled ? 'disabled' : undefined
      }
    });

    if (options.checked) {
      input.checked = true;
    }

    const label = dom.createElement('label', {
      classes: ['form-check-label'],
      attrs: { for: options.id },
      text: options.label || ''
    });

    group.appendChild(input);
    group.appendChild(label);

    if (options.help) {
      const help = dom.createElement('small', {
        classes: ['form-help'],
        text: options.help
      });
      group.appendChild(help);
    }

    group.input = input;
    return group;
  },

  /**
   * Create a radio group
   */
  radioGroup(options = {}) {
    const group = dom.createElement('div', {
      classes: ['form-group', options.className].filter(Boolean)
    });

    if (options.label) {
      const label = dom.createElement('label', {
        classes: ['form-label'],
        text: options.label
      });
      group.appendChild(label);
    }

    if (options.options && Array.isArray(options.options)) {
      options.options.forEach(opt => {
        const radioWrapper = dom.createElement('div', {
          classes: ['form-check']
        });

        const radio = dom.createElement('input', {
          classes: ['form-check-input'],
          attrs: {
            type: 'radio',
            id: opt.id || opt.value,
            name: options.name,
            value: opt.value,
            required: options.required ? 'required' : undefined,
            disabled: options.disabled ? 'disabled' : undefined
          }
        });

        if (options.value === opt.value) {
          radio.checked = true;
        }

        const label = dom.createElement('label', {
          classes: ['form-check-label'],
          attrs: { for: opt.id || opt.value },
          text: opt.label || opt.text
        });

        radioWrapper.appendChild(radio);
        radioWrapper.appendChild(label);
        group.appendChild(radioWrapper);
      });
    }

    return group;
  },

  /**
   * Form validator
   */
  createValidator() {
    const errors = {};

    return {
      errors,

      validate(field, value, rules) {
        errors[field] = [];

        for (const rule of rules) {
          const [ruleName, ...ruleParams] = rule.split(':');

          switch (ruleName) {
            case 'required':
              if (!value || (typeof value === 'string' && !value.trim())) {
                errors[field].push('Ce champ est requis');
              }
              break;

            case 'email':
              if (value && !helpers.isValidEmail(value)) {
                errors[field].push('Email invalide');
              }
              break;

            case 'min':
              const minLength = parseInt(ruleParams[0]);
              if (value && value.length < minLength) {
                errors[field].push(`Minimum ${minLength} caractères requis`);
              }
              break;

            case 'max':
              const maxLength = parseInt(ruleParams[0]);
              if (value && value.length > maxLength) {
                errors[field].push(`Maximum ${maxLength} caractères`);
              }
              break;

            case 'match':
              const matchField = ruleParams[0];
              const matchValue = ruleParams[1];
              if (value !== matchValue) {
                errors[field].push('Les valeurs ne correspondent pas');
              }
              break;

            case 'password':
              if (value && !helpers.isStrongPassword(value)) {
                errors[field].push('Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre');
              }
              break;
          }
        }

        return errors[field].length === 0;
      },

      isValid() {
        return Object.values(errors).every(arr => arr.length === 0);
      },

      getErrors() {
        return errors;
      },

      hasErrors(field) {
        return errors[field] && errors[field].length > 0;
      },

      getErrorMessage(field) {
        return errors[field] ? errors[field][0] : '';
      }
    };
  }
};
