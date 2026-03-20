import Papa from 'papaparse';
import type { ColumnMapping, DetectionHints, FormatProfileRecord } from '../../models/index';
import { SKIP_LIST } from '../../models/constants';
import { parsePenceFromString } from '../../utils/pence';
import { detectProfile } from './detection-registry';
import { applyTransform, mergeAmountColumns } from './transforms';
import { ParseError } from './types';
import type { DetectionResult, ParsedRow, ParseResult, ParseWarning } from './types';

const SKIP_LIST_UPPER = SKIP_LIST.map((s) => s.toUpperCase());

/** Splits a raw CSV line into fields (handles basic quoting). */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

/** Extract headers from CSV text given the number of metadata rows to skip. */
function extractHeaders(text: string, metadataRowCount: number): string[] | null {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '' || metadataRowCount > 0);
  const headerLine = lines[metadataRowCount];
  if (!headerLine) return null;
  return splitCsvLine(headerLine);
}

/** Extract up to 10 data rows (after header) for pattern scoring. */
function extractDataRows(text: string, metadataRowCount: number): string[][] {
  const lines = text.split(/\r?\n/);
  const dataStart = metadataRowCount + 1; // +1 for header row
  return lines
    .slice(dataStart, dataStart + 10)
    .filter((l) => l.trim() !== '')
    .map((l) => splitCsvLine(l));
}

/**
 * Reads a File as text using Windows-1252 decoding.
 *
 * `File.text()` always decodes as UTF-8, which turns the Windows-1252 £ byte
 * (0xA3) into U+FFFD (replacement character) rather than U+00A3 (£). UK bank
 * CSVs — including all Nationwide formats — are Windows-1252 encoded.
 * Decoding explicitly as Windows-1252 produces the correct £ sign, allowing
 * stripPound and the rest of the parse pipeline to work without workarounds.
 */
async function readFileText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return new TextDecoder('windows-1252').decode(buffer);
}

export const csvParserService = {
  /**
   * Detect which profile matches the CSV file headers, without parsing data rows.
   * Throws ParseError if the file cannot be read as text.
   */
  async detect(file: File, profiles: FormatProfileRecord[]): Promise<DetectionResult> {
    let text: string;
    try {
      text = await readFileText(file);
    } catch {
      throw new ParseError('NOT_CSV', 'Cannot read file as text');
    }

    if (!text.trim()) {
      return { status: 'noData', message: 'File is empty' };
    }

    // Try each profile's metadataRowCount to find matching headers
    for (const profile of profiles) {
      const headers = extractHeaders(text, profile.detectionHints.metadataRowCount);
      if (!headers) continue;
      const dataRows = extractDataRows(text, profile.detectionHints.metadataRowCount);
      const result = detectProfile(headers, [profile], dataRows);
      if (result.status === 'matched') return result;
    }

    // None of the known profile counts matched — try with 0 metadata rows
    const headers = extractHeaders(text, 0);
    if (!headers || headers.length === 0) {
      return { status: 'noData', message: 'No headers found in file' };
    }
    const dataRows = extractDataRows(text, 0);
    return detectProfile(headers, profiles, dataRows);
  },

  /**
   * Auto-detect a profile and parse the CSV.
   * Throws ParseError('NOT_CSV') if unreadable, ParseError('NO_FINANCIAL_DATA') if no financial columns.
   */
  async parse(file: File, profiles: FormatProfileRecord[]): Promise<ParseResult> {
    const detection = await this.detect(file, profiles);

    if (detection.status === 'noData') {
      throw new ParseError('NO_FINANCIAL_DATA', detection.message);
    }

    if (detection.status === 'unrecognised') {
      throw new ParseError(
        'UNRESOLVABLE_COLUMNS',
        'Could not auto-detect format — manual column mapping required',
      );
    }

    // Find the matched profile to get its detectionHints
    const matchedProfile = profiles.find((p) => p.profileName === detection.profileName);
    if (!matchedProfile) {
      throw new ParseError('NO_FINANCIAL_DATA', 'Matched profile not found in profiles list');
    }

    const result = await this.parseWithMapping(file, detection.mappings, {
      metadataRowCount: matchedProfile.detectionHints.metadataRowCount,
      dateFormat: matchedProfile.detectionHints.dateFormat,
    });

    return { ...result, detectedProfile: detection.profileName };
  },

  /**
   * Parse using an explicit column mapping (from manual mapping UI or a known profile).
   */
  async parseWithMapping(
    file: File,
    mappings: ColumnMapping[],
    hints: Pick<DetectionHints, 'metadataRowCount' | 'dateFormat'>,
  ): Promise<ParseResult> {
    let text: string;
    try {
      text = await readFileText(file);
    } catch {
      throw new ParseError('NOT_CSV', 'Cannot read file as text');
    }

    // Remove metadata rows before header
    const lines = text.split(/\r?\n/);
    const contentFromHeader = lines.slice(hints.metadataRowCount).join('\n');

    const parseResult = Papa.parse<Record<string, string>>(contentFromHeader, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
      throw new ParseError('NOT_CSV', `CSV parse error: ${parseResult.errors[0].message}`);
    }

    const hasPaidOut = mappings.some((m) => m.canonicalField === 'paidOut');
    const hasPaidIn = mappings.some((m) => m.canonicalField === 'paidIn');

    const rows: ParsedRow[] = [];
    const warnings: ParseWarning[] = [];

    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];

      try {
        let date = '';
        let description = '';
        let paidOut = 0;
        let paidIn = 0;
        let rawAmount: number | undefined;
        let balance: number | undefined;

        for (const mapping of mappings) {
          const rawValue = (row[mapping.sourceHeader] ?? '').trim();

          switch (mapping.canonicalField) {
            case 'date':
              date = mapping.transform
                ? String(applyTransform(rawValue, mapping.transform))
                : rawValue;
              break;
            case 'description':
              description = rawValue;
              break;
            case 'paidOut':
              if (rawValue) {
                paidOut = mapping.transform
                  ? Number(applyTransform(rawValue, mapping.transform))
                  : parsePenceFromString(rawValue);
              }
              break;
            case 'paidIn':
              if (rawValue) {
                paidIn = mapping.transform
                  ? Number(applyTransform(rawValue, mapping.transform))
                  : parsePenceFromString(rawValue);
              }
              break;
            case 'amount':
              rawAmount = mapping.transform
                ? Number(applyTransform(rawValue, mapping.transform))
                : parsePenceFromString(rawValue);
              break;
            case 'balance':
              if (rawValue) {
                balance = mapping.transform
                  ? Number(applyTransform(rawValue, mapping.transform))
                  : parsePenceFromString(rawValue);
              }
              break;
            case 'ignore':
            case 'transactionType':
              break;
          }
        }

        let finalAmount: number;
        let transactionType: 'expense' | 'income';

        if (hasPaidOut || hasPaidIn) {
          if (paidOut === 0 && paidIn === 0) {
            warnings.push({
              rowIndex: i,
              field: 'amount',
              message: 'Both paidOut and paidIn are empty — row skipped',
            });
            continue;
          }
          const merged = mergeAmountColumns({ paidOut, paidIn });
          finalAmount = merged.amount;
          transactionType = merged.transactionType;
        } else if (rawAmount !== undefined) {
          finalAmount = rawAmount;
          transactionType = rawAmount < 0 ? 'expense' : 'income';
        } else {
          warnings.push({ rowIndex: i, field: 'amount', message: 'No amount column mapped' });
          continue;
        }

        if (finalAmount === 0) {
          warnings.push({
            rowIndex: i,
            field: 'amount',
            message: 'Zero-amount transaction — unusual, included anyway',
          });
        }

        rows.push({
          date,
          description,
          amount: finalAmount,
          transactionType,
          ...(balance !== undefined ? { balance } : {}),
        });
      } catch (err) {
        warnings.push({
          rowIndex: i,
          field: 'unknown',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (rows.length === 0 && warnings.length === parseResult.data.length) {
      throw new ParseError('NO_FINANCIAL_DATA', 'No valid financial rows found in file');
    }

    const filteredRows = rows.filter(
      (row) => !SKIP_LIST_UPPER.includes(row.description.toUpperCase()),
    );

    return { rows: filteredRows, detectedProfile: null, warnings };
  },
};
