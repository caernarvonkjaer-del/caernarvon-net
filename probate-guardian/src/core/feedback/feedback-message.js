import { APP_VERSION } from './feedback-config.js';

const EMAIL = /^[^\s@,?&]+@[^\s@,?&]+\.[^\s@,?&]+$/;

function joinLines(values) {
  return values.filter(Boolean).join('\r\n');
}

export function buildFeedbackMessage({ kind, fields = {}, diagnostics = '' }) {
  if (kind === 'comment') {
    return {
      subject: `[Probate Guardian Beta] Comment card (v${APP_VERSION})`,
      body: joinLines([
        'Probate Guardian comment card',
        '',
        `Rating: ${fields.rating ? `${fields.rating} of 5` : 'Not provided'}`,
        fields.working && `\r\nWhat is working well:\r\n${fields.working}`,
        fields.improve && `\r\nWhat should we improve:\r\n${fields.improve}`,
        diagnostics && `\r\nTechnical details:\r\n${diagnostics}`,
      ]),
    };
  }
  return {
    subject: `[Probate Guardian Beta] Bug report (v${APP_VERSION})`,
    body: joinLines([
      'Probate Guardian bug report',
      '',
      `What happened:\r\n${fields.description || ''}`,
      fields.steps && `\r\nSteps to reproduce:\r\n${fields.steps}`,
      fields.expected && `\r\nExpected result:\r\n${fields.expected}`,
      diagnostics && `\r\nTechnical details:\r\n${diagnostics}`,
    ]),
  };
}

export function buildMailtoHref({ to, subject, body }) {
  if (!Array.isArray(to) || to.length === 0 || to.some((address) => !EMAIL.test(address))) {
    throw new Error('Feedback recipients must be valid email addresses.');
  }
  return `mailto:${to.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
