// Milestone 26: Accessible Combobox Controller
// Encapsulates typeahead filtering, keyboard navigation, and ARIA state management.

import { esc } from './form-fields.js';

export class ComboboxController {
  /**
   * @param {Object} options
   * @param {HTMLInputElement} options.input
   * @param {HTMLElement} options.dropdown
   * @param {Array<Object>} [options.items=[]]
   * @param {Function} [options.getItems] Dynamic items provider: () => Array<{ label, value, sub, ... }>
   * @param {Function} [options.onPick] Callback when an item is selected: (item) => void
   * @param {Function} [options.filterFn] Custom filter: (items, query) => Array
   * @param {string} [options.itemClassName='ward-combobox-item']
   * @param {string} [options.emptyClassName='ward-combobox-empty']
   * @param {string} [options.emptyText='No matches']
   */
  constructor(options = {}) {
    const {
      input,
      dropdown,
      items = [],
      getItems = null,
      filterFn = null,
      itemClassName = 'ward-combobox-item',
      emptyClassName = 'ward-combobox-empty',
      emptyText = 'No matches',
    } = options;
    const pickCallback = options.onPick || null;
    if (!input || !dropdown) {
      throw new Error('ComboboxController requires both input and dropdown elements');
    }
    this.input = input;
    this.dropdown = dropdown;
    this.items = items;
    this.getItems = getItems;
    this.pickCallback = pickCallback;
    this.filterFn = filterFn;
    this.itemClassName = itemClassName;
    this.emptyClassName = emptyClassName;
    this.emptyText = emptyText;

    this.currentMatches = [];
    this.activeIndex = -1;
    this.isOpen = false;
    this._abortController = new AbortController();

    this._initAria();
    this._bindEvents();
  }

  _initAria() {
    this.input.setAttribute('role', 'combobox');
    this.input.setAttribute('aria-autocomplete', 'list');
    this.input.setAttribute('aria-expanded', 'false');
    if (this.dropdown.id) {
      this.input.setAttribute('aria-controls', this.dropdown.id);
    }
    this.dropdown.setAttribute('role', 'listbox');
  }

  _bindEvents() {
    const signal = this._abortController.signal;

    this.input.addEventListener('input', () => {
      this.filterAndRender(this.input.value);
    }, { signal });

    this.input.addEventListener('focus', () => {
      this.filterAndRender('');
    }, { signal });

    this.input.addEventListener('keydown', (e) => {
      this._handleKeyDown(e);
    }, { signal });

    document.addEventListener('click', (e) => {
      if (!this.input.contains(e.target) && !this.dropdown.contains(e.target)) {
        this.close();
      }
    }, { signal });
  }

  _handleKeyDown(e) {
    if (!this.isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      this.filterAndRender(this.input.value);
      e.preventDefault();
      return;
    }

    if (!this.isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._moveActiveIndex(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._moveActiveIndex(-1);
        break;
      case 'Enter':
        if (this.activeIndex >= 0 && this.activeIndex < this.currentMatches.length) {
          e.preventDefault();
          this.selectItem(this.currentMatches[this.activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
      case 'Tab':
        this.close();
        break;
    }
  }

  _moveActiveIndex(delta) {
    if (!this.currentMatches.length) return;
    const count = this.currentMatches.length;
    let nextIndex = this.activeIndex + delta;
    if (nextIndex < 0) nextIndex = count - 1;
    if (nextIndex >= count) nextIndex = 0;
    this.setActiveIndex(nextIndex);
  }

  setActiveIndex(index) {
    this.activeIndex = index;
    const options = this.dropdown.querySelectorAll(`.${this.itemClassName}`);

    options.forEach((opt, idx) => {
      if (idx === index) {
        opt.classList.add('active');
        opt.setAttribute('aria-selected', 'true');
        this.input.setAttribute('aria-activedescendant', opt.id);
        opt.scrollIntoView?.({ block: 'nearest' });
      } else {
        opt.classList.remove('active');
        opt.setAttribute('aria-selected', 'false');
      }
    });

    if (index < 0) {
      this.input.removeAttribute('aria-activedescendant');
    }
  }

  getAllItems() {
    if (typeof this.getItems === 'function') {
      return this.getItems() || [];
    }
    return this.items || [];
  }

  filterItems(query = '') {
    const items = this.getAllItems();
    if (typeof this.filterFn === 'function') {
      return this.filterFn(items, query);
    }
    const q = String(query || '').trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const label = typeof item === 'object' ? String(item.label || item.name || '') : String(item);
      return label.toLowerCase().includes(q);
    });
  }

  filterAndRender(query = '') {
    this.currentMatches = this.filterItems(query);
    this.renderDropdown(this.currentMatches);
    this.open();
  }

  renderDropdown(items) {
    const dropdownPrefix = this.dropdown.id || 'combo';
    if (!items || !items.length) {
      this.dropdown.innerHTML = `<div class="${this.emptyClassName}">${esc(this.emptyText)}</div>`;
      this.activeIndex = -1;
      this.input.removeAttribute('aria-activedescendant');
      return;
    }

    this.dropdown.innerHTML = items.map((item, i) => {
      const label = typeof item === 'object' ? (item.label || item.name || '') : String(item);
      const sub = typeof item === 'object' ? item.sub : null;
      return `<div class="${this.itemClassName}" id="${dropdownPrefix}-opt-${i}" data-idx="${i}" role="option" aria-selected="false">
        <span class="${this.itemClassName}-name">${esc(label)}</span>
        ${sub ? `<span class="${this.itemClassName}-type">${esc(sub)}</span>` : ''}
      </div>`;
    }).join('');

    const optionEls = this.dropdown.querySelectorAll(`.${this.itemClassName}`);
    optionEls.forEach((el, i) => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Prevents input blur
        this.selectItem(items[i]);
      });
    });

    this.activeIndex = -1;
    this.input.removeAttribute('aria-activedescendant');
  }

  selectItem(item) {
    const label = typeof item === 'object' ? (item.label || item.name || '') : String(item);
    this.input.value = label;
    this.input.dispatchEvent(new Event('input', { bubbles: true }));
    if (typeof this.pickCallback === 'function') {
      this.pickCallback(item);
    }
    this.close();
  }

  open() {
    this.dropdown.style.display = 'block';
    this.dropdown.classList.add('show');
    this.input.setAttribute('aria-expanded', 'true');
    this.isOpen = true;
  }

  close() {
    this.dropdown.style.display = 'none';
    this.dropdown.classList.remove('show');
    this.input.setAttribute('aria-expanded', 'false');
    this.input.removeAttribute('aria-activedescendant');
    this.activeIndex = -1;
    this.isOpen = false;
  }

  destroy() {
    this._abortController.abort();
  }
}

if (typeof window !== 'undefined') {
  window.ComboboxController = ComboboxController;
}
