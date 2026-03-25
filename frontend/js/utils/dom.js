/**
 * DOM Utility Functions
 * Helpers for common DOM operations
 */

export const dom = {
  /**
   * Create element with classes and attributes
   */
  createElement(tag, options = {}) {
    const el = document.createElement(tag);
    
    if (options.classes) {
      el.classList.add(...options.classes);
    }
    
    if (options.id) {
      el.id = options.id;
    }
    
    if (options.text) {
      el.textContent = options.text;
    }
    
    if (options.html) {
      el.innerHTML = options.html;
    }
    
    if (options.attrs) {
      for (const [key, value] of Object.entries(options.attrs)) {
        el.setAttribute(key, value);
      }
    }
    
    return el;
  },

  /**
   * Add event listener
   */
  on(element, event, handler) {
    if (Array.isArray(element)) {
      element.forEach(el => el.addEventListener(event, handler));
    } else {
      element.addEventListener(event, handler);
    }
  },

  /**
   * Remove event listener
   */
  off(element, event, handler) {
    if (Array.isArray(element)) {
      element.forEach(el => el.removeEventListener(event, handler));
    } else {
      element.removeEventListener(event, handler);
    }
  },

  /**
   * Query selector
   */
  query(selector) {
    return document.querySelector(selector);
  },

  /**
   * Query all selector
   */
  queryAll(selector) {
    return document.querySelectorAll(selector);
  },

  /**
   * Add class
   */
  addClass(element, className) {
    if (Array.isArray(element)) {
      element.forEach(el => el.classList.add(className));
    } else {
      element.classList.add(className);
    }
  },

  /**
   * Remove class
   */
  removeClass(element, className) {
    if (Array.isArray(element)) {
      element.forEach(el => el.classList.remove(className));
    } else {
      element.classList.remove(className);
    }
  },

  /**
   * Toggle class
   */
  toggleClass(element, className) {
    if (Array.isArray(element)) {
      element.forEach(el => el.classList.toggle(className));
    } else {
      element.classList.toggle(className);
    }
  },

  /**
   * Set styles
   */
  setStyles(element, styles) {
    for (const [key, value] of Object.entries(styles)) {
      element.style[key] = value;
    }
  },

  /**
   * Get element position
   */
  getPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    };
  },

  /**
   * Scroll to element
   */
  scrollTo(element, smooth = true) {
    element.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  },

  /**
   * Check if element is visible
   */
  isVisible(element) {
    return element.offsetWidth > 0 && element.offsetHeight > 0;
  },

  /**
   * Get element value (form inputs)
   */
  getValue(element) {
    if (element.type === 'checkbox' || element.type === 'radio') {
      return element.checked;
    }
    return element.value;
  },

  /**
   * Set element value (form inputs)
   */
  setValue(element, value) {
    if (element.type === 'checkbox' || element.type === 'radio') {
      element.checked = value;
    } else {
      element.value = value;
    }
  }
};
