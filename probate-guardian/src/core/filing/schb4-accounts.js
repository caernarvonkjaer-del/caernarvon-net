// B-4 account references are opaque and survive account renames/reordering.
export function newSchB4Id() {
  return globalThis.crypto?.randomUUID?.() || `b4-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function normalizeSchB4Accounts(data) {
  if (!data || !Array.isArray(data.schB4)) return data;
  data.schB4Accounts = Array.isArray(data.schB4Accounts) ? data.schB4Accounts : [];
  const byId = new Map();
  for (const account of data.schB4Accounts) {
    if (!account || typeof account !== 'object') continue;
    if (!account.id || byId.has(account.id)) account.id = newSchB4Id();
    account.bankName ??= '';
    account.accountNo ??= '';
    byId.set(account.id, account);
  }
  const rowIds = new Set();
  for (const row of data.schB4) {
    if (!row || typeof row !== 'object') continue;
    if (!row.id || rowIds.has(row.id)) row.id = newSchB4Id();
    rowIds.add(row.id);
    if (row.bankAccountId && byId.has(row.bankAccountId)) continue;
    // Old filings may carry a free-text bankAcct but no account collection.
    const legacyNo = String(row.bankAcct || '').trim();
    const match = legacyNo && data.schB4Accounts.find(a => String(a.accountNo || '').trim() === legacyNo);
    row.bankAccountId = match?.id || '';
  }
  return data;
}

export function sortedSchB4Rows(rows = []) {
  return rows.map((row, index) => ({ row, index })).sort((a, b) =>
    String(a.row.checkNo || '').localeCompare(String(b.row.checkNo || ''), undefined, { numeric: true, sensitivity: 'base' })
    || String(a.row.datePaid || '').localeCompare(String(b.row.datePaid || ''))
    || String(a.row.id || '').localeCompare(String(b.row.id || ''))
    || a.index - b.index
  ).map(item => item.row);
}
