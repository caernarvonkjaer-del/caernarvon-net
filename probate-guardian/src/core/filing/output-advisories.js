// Non-blocking output notices shared by every filing print surface.

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

export function renderOutputAdvisories(advisories = []) {
  if (!advisories.length) return '';
  return `<div class="alert alert-warning no-print" role="status" aria-live="polite">
    <strong>Review recommended before filing</strong>
    <ul class="mb-0">${advisories.map(({ message }) => `<li>${escapeHtml(message)}</li>`).join('')}</ul>
  </div>`;
}
