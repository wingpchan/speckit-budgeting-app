import type { AllRecordTypes } from '../../models/index';

/**
 * Column order matches the ledger-format.md superset header row.
 * v3 adds: pattern (keywordRule record type)
 */
const COLUMNS = [
  'type', 'version', 'date', 'description', 'amount', 'transactionType',
  'category', 'account', 'sourceFile', 'importedDate', 'contentHash', 'personName',
  'month', 'setDate', 'reason', 'name', 'isDefault', 'createdDate', 'status',
  'profileName', 'columnMappings', 'detectionHints', 'accountName', 'effectiveDate',
  'pattern',
] as const;

export const LEDGER_HEADER = COLUMNS.join(',');

/**
 * RFC 4180-compliant field quoting.
 * Wraps in double-quotes if value contains comma, double-quote, or newline.
 * Internal double-quotes are doubled.
 */
function quoteField(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Serialises an AllRecordTypes record to a single RFC 4180 CRLF-terminated CSV row.
 * JSON-valued fields (columnMappings, detectionHints) are JSON.stringify'd and quoted.
 */
export function serialiseRecord(record: AllRecordTypes): string {
  const fields: Record<string, string> = {};

  switch (record.type) {
    case 'meta':
      fields.type = 'meta';
      fields.version = String(record.version);
      break;

    case 'transaction':
      fields.type = 'transaction';
      fields.date = record.date;
      fields.description = record.description;
      fields.amount = String(record.amount);
      fields.transactionType = record.transactionType;
      fields.category = record.category;
      fields.account = record.account;
      fields.sourceFile = record.sourceFile;
      fields.importedDate = record.importedDate;
      fields.contentHash = record.contentHash;
      fields.personName = record.personName;
      break;

    case 'budget':
      fields.type = 'budget';
      fields.month = record.month;
      fields.category = record.category;
      fields.amount = String(record.amount);
      fields.setDate = record.setDate;
      if (record.reason !== undefined) fields.reason = record.reason;
      break;

    case 'category':
      fields.type = 'category';
      fields.name = record.name;
      fields.isDefault = String(record.isDefault);
      fields.createdDate = record.createdDate;
      fields.status = record.status;
      break;

    case 'formatProfile':
      fields.type = 'formatProfile';
      fields.profileName = record.profileName;
      fields.columnMappings = JSON.stringify(record.columnMappings);
      fields.detectionHints = JSON.stringify(record.detectionHints);
      fields.createdDate = record.createdDate;
      break;

    case 'person':
      fields.type = 'person';
      fields.name = record.name;
      fields.isDefault = String(record.isDefault);
      fields.createdDate = record.createdDate;
      fields.status = record.status;
      break;

    case 'accountPersonMapping':
      fields.type = 'accountPersonMapping';
      fields.accountName = record.accountName;
      fields.personName = record.personName;
      fields.effectiveDate = record.effectiveDate;
      break;

    case 'keywordRule':
      fields.type = 'keywordRule';
      fields.pattern = record.pattern;
      fields.category = record.category;
      fields.createdDate = record.createdDate;
      fields.status = record.status;
      break;
  }

  const row = COLUMNS.map((col) => quoteField(fields[col] ?? '')).join(',');
  return row + '\r\n';
}

/**
 * Appends rows to budget-ledger.csv in the given directory handle.
 * Re-requests write permission before every write to guard against the dirHandle
 * losing its activation state between operations in the same session (Chrome bug).
 * Uses keepExistingData: true with seek(0) + write + truncate for a reliable
 * full-file overwrite that avoids the swap-file InvalidStateError.
 */
export async function appendRecords(
  dirHandle: FileSystemDirectoryHandle,
  rows: string[],
): Promise<void> {
  const permission = await dirHandle.requestPermission({ mode: 'readwrite' });
  if (permission !== 'granted') {
    throw new Error('Write permission denied');
  }
  const fileHandle = await dirHandle.getFileHandle('budget-ledger.csv', { create: false });
  const existing = await (await fileHandle.getFile()).text();
  const content = existing + rows.join('');
  try {
    const writable = await fileHandle.createWritable({ keepExistingData: true });
    await writable.seek(0);
    await writable.write(content);
    await writable.truncate(content.length);
    await writable.close();
  } catch (err) {
    const name = (err as DOMException).name;
    if (name === 'InvalidStateError' || name === 'NotAllowedError') {
      throw new Error(
        'Cannot write to the ledger file. It may be open in another application (e.g. Excel, LibreOffice). Please close the file and try again.',
      );
    }
    throw err;
  }
}
