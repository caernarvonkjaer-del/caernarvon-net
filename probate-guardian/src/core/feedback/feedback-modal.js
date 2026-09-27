import { FEEDBACK_EMAILS, MAILTO_MAX_LENGTH } from './feedback-config.js';
import { buildFeedbackMessage, buildMailtoHref } from './feedback-message.js';
import { ensureFragment, showModal } from '../ui/dialogs.js';
// Milestone 70, 70H: this module's document listeners are collected here and
// added by installFeedbackModal(), once, from main.js -- not as a side effect of
// importing it; its signal removes them.
const listeners = [];
const on = (type, handler, options) => listeners.push([type, handler, options]);

let activeKind = 'bug';
const modal = () => document.getElementById('feedbackModal');
const value = (id) => document.getElementById(id)?.value.trim() || '';

function diagnostics() {
  if (!document.getElementById('feedback-technical-details')?.checked) return '';
  return [`Browser: ${navigator.userAgent}`, `Viewport: ${window.innerWidth}x${window.innerHeight}`, `Theme: ${document.documentElement.getAttribute('data-theme') || 'light'}`].join('\r\n');
}
function fields() {
  return activeKind === 'bug'
    ? { description: value('feedback-description'), steps: value('feedback-steps'), expected: value('feedback-expected') }
    : { rating: document.querySelector('input[name="feedback-rating"]:checked')?.value || '', working: value('feedback-working'), improve: value('feedback-improve') };
}
function hasContent(current) {
  return activeKind === 'bug' ? Boolean(current.description) : Boolean(current.rating || current.working || current.improve);
}
function updateMessage() {
  const current = fields();
  const send = document.getElementById('feedback-send');
  const copy = document.getElementById('feedback-copy');
  const status = document.getElementById('feedback-status');
  const message = buildFeedbackMessage({ kind: activeKind, fields: current, diagnostics: diagnostics() });
  const href = buildMailtoHref({ to: FEEDBACK_EMAILS, ...message });
  const disabled = !hasContent(current) || href.length > MAILTO_MAX_LENGTH;
  send.href = disabled ? '' : href;
  send.setAttribute('aria-disabled', String(disabled));
  send.classList.toggle('disabled', disabled);
  copy.disabled = !hasContent(current);
  status.textContent = href.length > MAILTO_MAX_LENGTH ? 'This message is too long for an email link. Copy it and paste it into an email instead.' : '';
  return message;
}
function reset(kind) {
  activeKind = kind;
  const root = modal();
  root.querySelector('#feedback-modal-title').textContent = kind === 'bug' ? 'Report a Bug' : 'Comment Card';
  root.querySelector('#feedback-modal-intro').textContent = kind === 'bug' ? 'Tell us what happened so we can improve this beta release.' : 'Tell us how Guardian Forms is working for you.';
  root.querySelector('#feedback-bug-fields').hidden = kind !== 'bug';
  root.querySelector('#feedback-comment-fields').hidden = kind !== 'comment';
  root.querySelectorAll('textarea').forEach((input) => { input.value = ''; });
  root.querySelectorAll('input[name="feedback-rating"]').forEach((input) => { input.checked = false; });
  root.querySelector('#feedback-technical-details').checked = false;
  updateMessage();
}
async function open(kind) {
  await ensureFragment('common-modals');
  reset(kind);
  showModal('feedbackModal');
  document.getElementById(kind === 'bug' ? 'feedback-description' : 'feedback-rating-1')?.focus();
}
async function copyMessage() {
  const { subject, body } = updateMessage();
  const text = `To: ${FEEDBACK_EMAILS.join(', ')}\r\nSubject: ${subject}\r\n\r\n${body}`;
  try { await navigator.clipboard.writeText(text); }
  catch {
    const area = document.createElement('textarea'); area.value = text; area.style.position = 'fixed'; document.body.append(area); area.select(); document.execCommand('copy'); area.remove();
  }
  document.getElementById('feedback-status').textContent = 'Message copied. Paste it into an email and send it to the listed recipients.';
}
on('click', (event) => {
  const opener = event.target instanceof Element ? event.target.closest('[data-feedback-open]') : null;
  if (opener) { open(opener.dataset.feedbackOpen); return; }
  const action = event.target instanceof Element ? event.target.closest('[data-feedback-action]') : null;
  if (action?.dataset.feedbackAction === 'copy') copyMessage();
});
on('input', (event) => { if (event.target instanceof Element && event.target.closest('#feedbackModal')) updateMessage(); });
on('change', (event) => { if (event.target instanceof Element && event.target.closest('#feedbackModal')) updateMessage(); });

/** Add this module's listeners; the signal removes them. Called once, by main.js. */
export function installFeedbackModal({ signal } = {}) {
  for (const [type, handler, options] of listeners) {
    const opts = typeof options === 'object' && options ? options : { capture: !!options };
    document.addEventListener(type, handler, { ...opts, signal });
  }
}
