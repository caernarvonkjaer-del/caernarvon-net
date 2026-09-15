import { describe, expect, it } from 'vitest';
import { FEEDBACK_EMAILS } from '../../src/core/feedback/feedback-config.js';
import { buildFeedbackMessage, buildMailtoHref } from '../../src/core/feedback/feedback-message.js';

describe('feedback email messages', () => {
  it('builds a bug report with encoded CRLF content and both recipients', () => {
    const message = buildFeedbackMessage({ kind: 'bug', fields: { description: 'A & B?', steps: 'Open #1' } });
    const href = buildMailtoHref({ to: FEEDBACK_EMAILS, ...message });
    expect(message.subject).toContain('Bug report');
    expect(href).toContain(`mailto:${FEEDBACK_EMAILS.join(',')}?`);
    expect(decodeURIComponent(href)).toContain('A & B?');
    expect(decodeURIComponent(href)).toContain('\r\n');
  });

  it('builds a comment card with its rating', () => {
    const message = buildFeedbackMessage({ kind: 'comment', fields: { rating: '4', improve: 'More guidance' } });
    expect(message.subject).toContain('Comment card');
    expect(message.body).toContain('Rating: 4 of 5');
    expect(message.body).toContain('More guidance');
  });

  it('rejects unsafe recipient lists', () => {
    expect(() => buildMailtoHref({ to: [], subject: 'x', body: 'y' })).toThrow();
    expect(() => buildMailtoHref({ to: ['a@example.com?bcc=x'], subject: 'x', body: 'y' })).toThrow();
  });
});
