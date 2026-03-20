import type { ColumnMapping, DetectionHints, FormatProfileRecord } from '../../models/index';
import { serialiseRecord } from '../ledger/ledger-writer';
import { appendRecords } from '../ledger/ledger-writer';
import { toISODate } from '../../utils/dates';

/**
 * Saves a new format profile to the ledger.
 * Validates that the profile name is unique case-insensitively against existing profiles.
 *
 * @param mappings     Column mappings for the new profile
 * @param hints        Detection hints for the new profile
 * @param profileName  Display name for the profile (must be unique)
 * @param dirHandle    FileSystemDirectoryHandle for the ledger directory
 * @param existingProfiles  Existing FormatProfileRecord entries to check uniqueness against
 */
export async function saveFormatProfile(
  mappings: ColumnMapping[],
  hints: DetectionHints,
  profileName: string,
  dirHandle: FileSystemDirectoryHandle,
  existingProfiles: FormatProfileRecord[],
): Promise<void> {
  const nameUpper = profileName.trim().toUpperCase();

  if (!nameUpper) {
    throw new Error('Profile name cannot be empty');
  }

  const isDuplicate = existingProfiles.some(
    (p) => p.profileName.toUpperCase() === nameUpper,
  );

  if (isDuplicate) {
    throw new Error(`A format profile named "${profileName}" already exists`);
  }

  const record: FormatProfileRecord = {
    type: 'formatProfile',
    profileName: profileName.trim(),
    columnMappings: mappings,
    detectionHints: hints,
    createdDate: toISODate(new Date()),
  };

  await appendRecords(dirHandle, [serialiseRecord(record)]);
}
