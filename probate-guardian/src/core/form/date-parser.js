// Milestone 24: Pure regex and arithmetic date parser with canonical YYYY-MM-DD storage.
// Zero reliance on native `new Date(string)` to prevent timezone and locale parsing anomalies.

const MONTH_MAP = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

export function getDaysInMonth(year, month) {
  if (month < 1 || month > 12) return 0;
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1] || 0;
}

/**
 * Parses flexible typed/pasted date text into canonical YYYY-MM-DD.
 * Strictly enforces 4-digit years (rejects 2-digit years).
 * Returns null if invalid or cannot be parsed. Returns '' for empty input.
 */
export function parseFlexibleDate(rawStr) {
  if (rawStr === null || rawStr === undefined) return '';
  const s = String(rawStr).trim();
  if (!s) return '';

  let year = 0;
  let month = 0;
  let day = 0;

  // 1. ISO format: YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD, YYYY MM DD
  const isoMatch = s.match(/^(\d{4})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{1,2})$/);
  if (isoMatch) {
    year = Number.parseInt(isoMatch[1], 10);
    month = Number.parseInt(isoMatch[2], 10);
    day = Number.parseInt(isoMatch[3], 10);
  } else {
    // 2. US delimited format: MM/DD/YYYY, M/D/YYYY, MM-DD-YYYY, MM.DD.YYYY, MM DD YYYY
    const usMatch = s.match(/^(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{4})$/);
    if (usMatch) {
      month = Number.parseInt(usMatch[1], 10);
      day = Number.parseInt(usMatch[2], 10);
      year = Number.parseInt(usMatch[3], 10);
    } else {
      // 3. Unpunctuated 8-digit numeric format: MMDDYYYY (e.g. 07102027) or YYYYMMDD (e.g. 20270710)
      const digits8Match = s.match(/^(\d{8})$/);
      if (digits8Match) {
        const rawDigits = digits8Match[1];
        const last4 = Number.parseInt(rawDigits.slice(4, 8), 10);
        const first4 = Number.parseInt(rawDigits.slice(0, 4), 10);

        if (last4 >= 1900 && last4 <= 2100) {
          // MMDDYYYY
          month = Number.parseInt(rawDigits.slice(0, 2), 10);
          day = Number.parseInt(rawDigits.slice(2, 4), 10);
          year = last4;
        } else if (first4 >= 1900 && first4 <= 2100) {
          // YYYYMMDD
          year = first4;
          month = Number.parseInt(rawDigits.slice(4, 6), 10);
          day = Number.parseInt(rawDigits.slice(6, 8), 10);
        } else {
          return null;
        }
      } else {
        // 4. Unpunctuated 7-digit numeric format: MDDYYYY (e.g. 7102027)
        const digits7Match = s.match(/^(\d{1})(\d{2})(\d{4})$/);
        if (digits7Match) {
          month = Number.parseInt(digits7Match[1], 10);
          day = Number.parseInt(digits7Match[2], 10);
          year = Number.parseInt(digits7Match[3], 10);
        } else {
          // 5. Month name first: "Feb 14, 2026", "February 14 2026", "Feb. 14th, 2026"
          const textMonthMatch = s.match(/^([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/);
          if (textMonthMatch) {
            const mKey = textMonthMatch[1].toLowerCase();
            month = MONTH_MAP[mKey] || 0;
            day = Number.parseInt(textMonthMatch[2], 10);
            year = Number.parseInt(textMonthMatch[3], 10);
          } else {
            // 6. Day first text month: "14 Feb 2026", "14th February, 2026"
            const dayFirstMatch = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\.?,?\s+(\d{4})$/);
            if (dayFirstMatch) {
              day = Number.parseInt(dayFirstMatch[1], 10);
              const mKey = dayFirstMatch[2].toLowerCase();
              month = MONTH_MAP[mKey] || 0;
              year = Number.parseInt(dayFirstMatch[3], 10);
            } else {
              // Reject any unsupported or 2-digit year formats
              return null;
            }
          }
        }
      }
    }
  }

  // Calendar validation
  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  const maxDays = getDaysInMonth(year, month);
  if (day < 1 || day > maxDays) return null;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Format canonical YYYY-MM-DD as MM/DD/YYYY for user-friendly display.
 */
export function formatDisplayDate(canonicalStr) {
  if (!canonicalStr) return '';
  const match = String(canonicalStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[2]}/${match[3]}/${match[1]}`;
  }
  return canonicalStr;
}

/**
 * Generates accessible date input HTML with format hints and metadata.
 */
export function dateInputHTML({
  path,
  label = '',
  value = '',
  required = false,
  id = '',
  section = '',
  className = 'form-control',
  hint = 'Use MM/DD/YYYY or YYYY-MM-DD',
}) {
  const inputId = id || `date_${path.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  const reqMark = required ? '<span class="req">*</span>' : '';
  const displayVal = formatDisplayDate(value) || value || '';
  const hintId = `${inputId}_hint`;

  return `<div class="mb-2">
    ${label ? `<label class="form-label" for="${inputId}">${label}${reqMark}</label>` : ''}
    <input
      type="text"
      inputmode="text"
      class="${className}"
      id="${inputId}"
      autocomplete="off"
      placeholder="MM/DD/YYYY"
      value="${String(displayVal).replace(/"/g, '&quot;')}"
      data-field-path="${path}"
      data-form-path="${path}"
      data-field-kind="date"
      data-field-format-policy="normalize"
      ${section ? `data-field-section="${section}"` : ''}
      ${required ? 'data-field-required="true"' : ''}
      aria-describedby="${hintId}"
    >
    ${hint ? `<div id="${hintId}" class="form-text text-muted" style="font-size:0.75rem;margin-top:0.2rem;">${hint}</div>` : ''}
  </div>`;
}
