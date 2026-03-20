import type { ColumnMapping } from '../../models/index';

export interface ParsedRow {
  date: string;          // ISO 8601 YYYY-MM-DD
  description: string;
  amount: number;        // pence integer; negative = expense
  transactionType: 'expense' | 'income';
  balance?: number;      // pence integer; omitted if not in source
}

export interface ParseResult {
  rows: ParsedRow[];
  detectedProfile: string | null;
  warnings: ParseWarning[];
}

export interface ParseWarning {
  rowIndex: number;
  field: string;
  message: string;
}

export type DetectionResult =
  | { status: 'matched'; profileName: string; mappings: ColumnMapping[] }
  | { status: 'unrecognised'; suggestedMappings: Partial<ColumnMapping>[] }
  | { status: 'noData'; message: string };

export class ParseError extends Error {
  constructor(
    public code: 'NOT_CSV' | 'NO_FINANCIAL_DATA' | 'UNRESOLVABLE_COLUMNS',
    message: string,
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

export interface KeywordIndex {
  entries: Array<{ keywordUpper: string; category: string }>;
  fallback: string;
}
