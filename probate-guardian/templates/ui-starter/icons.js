/**
 * UI Starter: Pure SVG Icon Dictionary
 *
 * Lightweight, accessible inline SVG icons aligned to a 24x24 grid with 1.7px stroke weight.
 * Rendered inline as literal SVG (no external font or sprite sheet dependencies)
 * so they survive print preview, PDF rasterization, and offline environments.
 */

export const ICONS = {
  home: '<path d="M3.2 10.6 12 3.6l8.8 7"/><path d="M5.7 9.3v11.1h12.6V9.3"/>',
  pencil: '<path d="M4 20h4.2L19.4 8.8a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8Z"/><path d="M14.5 5.9 18.1 9.5"/>',
  trash: '<path d="M4.5 6.8h15"/><path d="M9.3 6.8V4.4h5.4v2.4"/><path d="M6.6 6.8 7.7 20h8.6l1.1-13.2"/>',
  download: '<path d="M12 3.6v10.8"/><path d="m8.2 10.8 3.8 3.8 3.8-3.8"/><path d="M4.4 19.9h15.2"/>',
  upload: '<path d="M12 14.4V3.6"/><path d="m8.2 7.4 3.8-3.8 3.8 3.8"/><path d="M4.4 19.9h15.2"/>',
  lock: '<rect x="4.6" y="10.4" width="14.8" height="9.6" rx="1.8"/><path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6"/>',
  unlock: '<rect x="4.6" y="10.4" width="14.8" height="9.6" rx="1.8"/><path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 6.9-2.2"/>',
  file: '<path d="M6.4 3.4h7l4.2 4.2v13H6.4Z"/><path d="M13.2 3.4v4.4h4.4"/><path d="M9.2 12.6h5.6M9.2 16h5.6"/>',
  chart: '<path d="M4.2 20h15.6"/><path d="M7.4 20v-6.4M12 20V5.6M16.6 20v-9.2"/>',
  trending: '<path d="m4.2 15.8 5-5 3 3 6.4-6.4"/><path d="M14.6 7.4h4.6V12"/>',
  printer: '<path d="M7.2 9.2V3.6h9.6v5.6"/><rect x="4" y="9.2" width="16" height="6.6" rx="1.6"/><path d="M7.2 14.6h9.6v5.8H7.2Z"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.2"/><path d="m19.6 19.6-4.4-4.4"/>',
  swap: '<path d="M4.4 8.6h13.2"/><path d="m14.4 5.4 3.2 3.2-3.2 3.2"/><path d="M19.6 15.4H6.4"/><path d="m9.6 12.2-3.2 3.2 3.2 3.2"/>',
  folder: '<path d="M3.4 6.4h5.6l2 2.2h9.6V19H3.4Z"/>',
  folderOpen: '<path d="M3.4 6.4h5.6l2 2.2h7.6v2.2"/><path d="M3.4 8.6 5.6 19h13.2l2.2-8.2H5.6Z"/>',
  list: '<path d="M4.4 7h15.2M4.4 12h15.2M4.4 17h15.2"/>',
  grid: '<rect x="4.2" y="4.2" width="6.4" height="6.4" rx="1.2"/><rect x="13.4" y="4.2" width="6.4" height="6.4" rx="1.2"/><rect x="4.2" y="13.4" width="6.4" height="6.4" rx="1.2"/><rect x="13.4" y="13.4" width="6.4" height="6.4" rx="1.2"/>',
  archive: '<rect x="3.6" y="4.2" width="16.8" height="4.4" rx="1.2"/><path d="M5.4 8.6V19h13.2V8.6"/><path d="M10 12.4h4"/>',
  undo: '<path d="M4.4 9.4h10a5.2 5.2 0 1 1 0 10.4H7.6"/><path d="m8 5.4-3.6 4 3.6 4"/>',
  clipboard: '<path d="M9 4.6H7.2a1.6 1.6 0 0 0-1.6 1.6V19a1.6 1.6 0 0 0 1.6 1.6h9.6A1.6 1.6 0 0 0 18.4 19V6.2a1.6 1.6 0 0 0-1.6-1.6H15"/><rect x="9" y="3" width="6" height="3.4" rx="1.1"/>',
  copy: '<rect x="8.6" y="8.6" width="11.4" height="11.4" rx="1.8"/><path d="M15.4 5.4H5.8a1.8 1.8 0 0 0-1.8 1.8v9.6"/>',
  receipt: '<path d="M6 3.6h12v17l-3-1.8-3 1.8-3-1.8-3 1.8Z"/><path d="M9.2 8.4h5.6M9.2 12.4h5.6"/>',
  inbox: '<path d="M4 13.6 6.2 4.6h11.6L20 13.6v5.8H4Z"/><path d="M4 13.6h4.2l1.2 2.4h5.2l1.2-2.4H20"/>',
  alert: '<path d="M12 4.2 21 19.8H3Z"/><path d="M12 10v4.2"/><circle cx="12" cy="17.4" r=".9" fill="currentColor" stroke="none"/>',
  external: '<path d="M14.2 4.4h5.4v5.4"/><path d="m19.6 4.4-8 8"/><path d="M17.4 13.6v6H4.6V6.8h6"/>',
  check: '<path d="m4.8 12.4 4.8 4.8L19.2 7.6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  shield: '<path d="M12 3.2 20 6v6.1c0 4.6-3.3 7.5-8 8.7-4.7-1.2-8-4.1-8-8.7V6Z"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2.6M12 18.6v2.6M4.2 12H1.6M22.4 12h-2.6M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>',
  moon: '<path d="M20.2 14.3A8.3 8.3 0 0 1 9.7 3.8a8.3 8.3 0 1 0 10.5 10.5Z"/>',
};

/**
 * Returns an inline SVG string for the requested icon name.
 *
 * Accessibility note: Icons are rendered with aria-hidden="true". Any interactive
 * parent element (<button>, <a>) MUST provide an accessible name via aria-label,
 * title, or visible text.
 *
 * @param {string} name - Icon key name from ICONS
 * @param {number} [size=16] - Width and height in px
 * @param {string} [className='ic'] - CSS class name
 * @returns {string} Inline HTML SVG string
 */
export function ic(name, size = 16, className = 'ic') {
  const content = ICONS[name];
  if (!content) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn(`[ui-starter/icons] Unknown icon name: "${name}"`);
    }
    return '';
  }
  const safeSize = Number.isFinite(size) && size > 0 ? size : 16;
  const safeClass = String(className || 'ic').replace(/[^a-zA-Z0-9_\-\s]/g, '');
  return `<svg class="${safeClass}" width="${safeSize}" height="${safeSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${content}</svg>`;
}
