#!/usr/bin/env node
// Milestone 34-2: zero-dependency checker for probate-guardian-data-model.csv
// against the canonical 20-column contract defined in
// DATA-MODEL-REMEDIATION-PLAN.md. Documentation-quality tooling only -- it
// reads the CSV and reports problems; it never writes to it and has no
// effect on application behavior.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = path.join(root, 'probate-guardian-data-model.csv');

const CANONICAL_HEADER = [
  'scope', 'storage_root', 'field_path', 'field_label', 'data_type', 'format',
  'requiredness', 'required_when', 'allowed_values', 'sensitive',
  'persistence_status', 'derived_or_input', 'collection_min', 'collection_max',
  'initial_item_count', 'sync_party_ids', 'source_file', 'source_symbol',
  'source_line', 'notes',
];

// requiredness allows 'n/a' as a fourth value beyond the column contract's
// required/optional/conditional, exclusively for rows whose
// persistence_status is not 'persisted' -- a derived/runtime/export-only
// value is never something a user fills in, so "requiredness" doesn't apply
// to it. Enforced below, not just declared here.
const ENUM_DOMAINS = {
  data_type: ['string', 'boolean', 'enum', 'date', 'decimal', 'integer', 'object', 'array<object>'],
  requiredness: ['required', 'optional', 'conditional', 'n/a'],
  sensitive: ['none', 'personal', 'financial', 'government-id', 'legal-id', 'document-content'],
  persistence_status: ['persisted', 'derived', 'runtime', 'export-only'],
  derived_or_input: ['input', 'derived'],
};

/** Minimal RFC-4180-ish CSV line parser: handles quoted fields, embedded
 * commas, embedded newlines within a quoted field, and doubled-quote escapes. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

function main() {
  const text = readFileSync(csvPath, 'utf8');
  const rows = parseCsv(text);
  const errors = [];

  if (!rows.length) {
    console.error('verify-data-model: CSV is empty.');
    process.exit(1);
  }

  const header = rows[0];
  if (header.length !== CANONICAL_HEADER.length || header.some((h, i) => h !== CANONICAL_HEADER[i])) {
    errors.push(`Header mismatch.\n  expected: ${CANONICAL_HEADER.join(',')}\n  actual:   ${header.join(',')}`);
  }
  const col = Object.fromEntries(CANONICAL_HEADER.map((name, i) => [name, i]));

  const seenKeys = new Map();
  const dataRows = rows.slice(1);

  dataRows.forEach((r, idx) => {
    const lineNo = idx + 2; // +1 for header, +1 for 1-indexing
    if (r.length !== CANONICAL_HEADER.length) {
      errors.push(`Line ${lineNo}: expected ${CANONICAL_HEADER.length} columns, found ${r.length}.`);
      return; // further column-indexed checks would be meaningless on a malformed row
    }

    const fieldPath = r[col.field_path];
    if (!fieldPath || !fieldPath.trim()) {
      errors.push(`Line ${lineNo}: blank field_path.`);
    } else if (fieldPath.includes('*')) {
      errors.push(`Line ${lineNo}: wildcard field_path "${fieldPath}" -- expand into explicit rows (Normalization Rule 3).`);
    }

    for (const [column, domain] of Object.entries(ENUM_DOMAINS)) {
      const value = r[col[column]];
      if (!domain.includes(value)) {
        errors.push(`Line ${lineNo}: ${column}="${value}" is not one of [${domain.join(', ')}].`);
      }
    }

    const persistenceStatus = r[col.persistence_status];
    const requiredness = r[col.requiredness];
    if (persistenceStatus !== 'persisted' && requiredness !== 'n/a') {
      errors.push(`Line ${lineNo}: persistence_status="${persistenceStatus}" rows must use requiredness="n/a" (found "${requiredness}") -- requiredness only applies to user-entered, persisted fields.`);
    }
    if (persistenceStatus === 'persisted' && requiredness === 'n/a') {
      errors.push(`Line ${lineNo}: persistence_status="persisted" rows must not use requiredness="n/a".`);
    }

    const key = `${r[col.scope]}${r[col.storage_root]}${fieldPath}${persistenceStatus}`;
    if (seenKeys.has(key)) {
      errors.push(`Line ${lineNo}: duplicate key (scope, storage_root, field_path, persistence_status) = (${r[col.scope]}, ${r[col.storage_root]}, ${fieldPath}, ${persistenceStatus}) -- first seen at line ${seenKeys.get(key)}.`);
    } else {
      seenKeys.set(key, lineNo);
    }
  });

  if (errors.length) {
    console.error(`verify-data-model: ${errors.length} problem(s) found in ${path.relative(root, csvPath)}:\n`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log(`verify-data-model: OK -- ${dataRows.length} rows, header and all constraints valid.`);
}

main();
