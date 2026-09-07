// Milestone 24: Shared Live Region Status Announcer for Async Operations
// Provides accessible announcements for PDF preview generation, autosave, and export tasks.

/**
 * Announces a status message to screen readers using an accessible live region.
 */
export function announceStatus(message, options = {}) {
  const priority = options.priority || 'polite';
  const containerId = options.containerId || 'print-preview-status';
  const parentId = options.parentId || null;

  let region = document.getElementById(containerId);
  if (!region) {
    region = document.createElement('div');
    region.id = containerId;
    region.className = 'visually-hidden';
    region.setAttribute('role', priority === 'assertive' ? 'alert' : 'status');
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', 'true');

    if (parentId) {
      const parent = document.getElementById(parentId);
      if (parent) {
        parent.insertBefore(region, parent.firstChild);
      } else {
        document.body.appendChild(region);
      }
    } else {
      const printDoc = document.getElementById('print-doc-container');
      if (printDoc && printDoc.parentNode) {
        printDoc.parentNode.insertBefore(region, printDoc);
      } else {
        document.body.appendChild(region);
      }
    }
  }

  // Update role/aria-live if priority changed
  if (priority === 'assertive') {
    region.setAttribute('role', 'alert');
    region.setAttribute('aria-live', 'assertive');
  } else {
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
  }

  // Clear then set text so screen reader detects the mutation
  region.textContent = '';
  setTimeout(() => {
    region.textContent = message;
  }, 50);

  return region;
}

if (typeof window !== 'undefined') {
  window.announceStatus = announceStatus;
}
