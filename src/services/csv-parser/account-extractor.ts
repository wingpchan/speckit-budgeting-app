import type { FormatProfileRecord } from '../../models/index';

/**
 * Attempts to extract an account name from the metadata rows of a CSV file.
 *
 * For Nationwide-style formats, the metadata block looks like:
 *   Row 0: "Account Name:","Account Balance:","Available Balance:","Date of Export:",…
 *   Row 1: "James Smith Current Account","£1,234.00","£1,234.00","10 Mar 2026",…
 *   Row 2: (blank or additional metadata)
 *   Row 3: (CSV column headers)
 *
 * @param rawLines  All lines of the file split by newline (not yet CSV-parsed)
 * @param profile   The matched format profile (or null if unmatched)
 * @returns         The extracted account name, or null if it cannot be determined
 */
export function extractAccountName(
  rawLines: string[],
  profile: FormatProfileRecord | null,
): string | null {
  if (!profile || profile.detectionHints.metadataRowCount === 0) return null;

  const metaLines = rawLines.slice(0, profile.detectionHints.metadataRowCount);

  for (let i = 0; i < metaLines.length; i++) {
    const line = metaLines[i];

    // Pattern 1: "Account Name:","Value" on the same line
    // e.g. "Account Name:","James Smith Current Account",…
    const inlineMatch = line.match(/(?:"?Account\s+Name:?"?)\s*,\s*"?([^",][^"]*)"?/i);
    if (inlineMatch) {
      const name = inlineMatch[1].trim();
      if (name && name !== '') return name;
    }

    // Pattern 2: "Account Name:" in one row, value in the next row's first column
    if (/account\s+name/i.test(line)) {
      const nextLine = metaLines[i + 1];
      if (nextLine) {
        const firstCell = nextLine.split(',')[0].trim().replace(/^"|"$/g, '');
        if (firstCell && firstCell !== '') return firstCell;
      }
    }
  }

  return null;
}
