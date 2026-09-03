// Offline signature typography and cursive styling support.
// Fully self-contained without external CDN / Google Fonts requests.

export const SIGNATURE_FONT_CSS = `
@font-face {
  font-family: 'PGSignatureScript';
  src: local('Dancing Script'), local('Marck Script'), local('Brush Script MT'), local('Segoe Script'), local('Apple Chancery'), local('Great Vibes'), local('Comic Sans MS');
  font-display: swap;
}
.script-signature {
  font-family: 'PGSignatureScript', 'Segoe Script', 'Apple Chancery', 'Brush Script MT', 'Brush Script Std', cursive !important;
  font-style: italic !important;
  font-size: 1.25em !important;
  letter-spacing: 0.02em !important;
  font-weight: 500 !important;
}
.typed-signature {
  font-family: 'Times New Roman', Times, serif !important;
  font-weight: bold !important;
  font-style: normal !important;
  font-size: 1.05em !important;
}
`;

export function injectSignatureFontStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('pg-signature-font-styles')) return;
  const style = document.createElement('style');
  style.id = 'pg-signature-font-styles';
  style.textContent = SIGNATURE_FONT_CSS;
  document.head.appendChild(style);
}
