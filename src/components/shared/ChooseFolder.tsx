import { useState } from 'react';
import { openLedger, detectExistingLedger } from '../../services/ledger/ledger-opener';
import { createNewLedger } from '../../services/ledger/ledger-initialiser';
import { saveDirectoryHandle } from '../../services/ledger/handle-store';
import {
  performMigration,
  detectVersion,
  detectOrphanedMigration,
  restoreFromBackup,
  resumeMigrationFromBackup,
} from '../../services/migration/migration.service';
import { useSession } from '../../store/SessionContext';
import { MigrationPromptModal } from './MigrationPromptModal';
import type { ViewId } from './Layout';

interface ChooseFolderProps {
  onSuccess: (view: ViewId) => void;
}

type MigrationState =
  | { phase: 'idle' }
  | { phase: 'prompt'; dirHandle: FileSystemDirectoryHandle }
  | { phase: 'orphaned'; dirHandle: FileSystemDirectoryHandle; backupFile: string }
  | { phase: 'declined' };

export function ChooseFolder({ onSuccess }: ChooseFolderProps) {
  const { dispatch } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migration, setMigration] = useState<MigrationState>({ phase: 'idle' });

  async function openNormally(dirHandle: FileSystemDirectoryHandle) {
    await saveDirectoryHandle(dirHandle);
    dispatch({ type: 'SET_LEDGER_HANDLE', handle: dirHandle });
    onSuccess('import');
  }

  async function handleChooseFolder() {
    setIsLoading(true);
    setError(null);
    setMigration({ phase: 'idle' });

    try {
      const dirHandle = await openLedger();

      // Check for interrupted prior migration first
      const orphaned = await detectOrphanedMigration(dirHandle);
      if (orphaned.orphaned) {
        setMigration({ phase: 'orphaned', dirHandle, backupFile: orphaned.backupFile });
        setIsLoading(false);
        return;
      }

      const status = await detectExistingLedger(dirHandle);

      if (status === 'old') {
        setMigration({ phase: 'prompt', dirHandle });
        setIsLoading(false);
        return;
      }

      if (status === 'new') {
        await createNewLedger(dirHandle);
      }

      await openNormally(dirHandle);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled the picker — silently ignore
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMigrate() {
    if (migration.phase !== 'prompt') return;
    const { dirHandle } = migration;
    setMigration({ phase: 'idle' });
    setIsLoading(true);
    setError(null);
    try {
      const oldVersion = await detectVersion(dirHandle);
      await performMigration(dirHandle, oldVersion);
      await openNormally(dirHandle);
    } catch (err) {
      setError('Migration failed. Your original file has been restored.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleDecline() {
    setMigration({ phase: 'declined' });
  }

  async function handleOrphanedResume() {
    if (migration.phase !== 'orphaned') return;
    const { dirHandle, backupFile } = migration;
    setMigration({ phase: 'idle' });
    setIsLoading(true);
    setError(null);
    try {
      await resumeMigrationFromBackup(dirHandle, backupFile);
      await openNormally(dirHandle);
    } catch (err) {
      setError('Migration failed. Your original file has been restored.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOrphanedRestore() {
    if (migration.phase !== 'orphaned') return;
    const { dirHandle, backupFile } = migration;
    setMigration({ phase: 'idle' });
    setIsLoading(true);
    setError(null);
    try {
      await restoreFromBackup(dirHandle, backupFile);
      await openNormally(dirHandle);
    } catch (err) {
      setError('Restore failed. Please check your files manually.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {migration.phase === 'prompt' && (
        <MigrationPromptModal onMigrate={() => void handleMigrate()} onDecline={handleDecline} />
      )}

      {migration.phase === 'orphaned' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="orphan-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 id="orphan-title" className="text-lg font-semibold text-gray-800 mb-3">
              Incomplete Migration Detected
            </h2>
            <p className="text-sm text-gray-600 mb-2">
              A previous migration was interrupted. Both your current ledger and a backup file
              ({migration.backupFile}) exist simultaneously.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Choose how to proceed:
            </p>
            <ul className="text-sm text-gray-600 mb-5 list-disc pl-5 space-y-1">
              <li>
                <strong>Resume migration</strong> — complete the interrupted migration using the
                backup.
              </li>
              <li>
                <strong>Restore backup</strong> — discard the current ledger and restore the
                original backup.
              </li>
            </ul>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => void handleOrphanedRestore()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                Restore Backup
              </button>
              <button
                onClick={() => void handleOrphanedResume()}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700"
              >
                Resume Migration
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          position: 'fixed',
          top: 64,
          left: 0,
          right: 0,
          bottom: 0,
          overflowY: 'auto',
          background: '#2d2b6b',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem 2rem',
          textAlign: 'center',
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 56,
            height: 56,
            background: '#6366f1',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            flexShrink: 0,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1" y="1" width="6" height="6" rx="1" fill="white" />
            <rect x="9" y="1" width="6" height="6" rx="1" fill="white" />
            <rect x="1" y="9" width="6" height="6" rx="1" fill="white" />
            <rect x="9" y="9" width="6" height="6" rx="1" fill="white" />
          </svg>
        </div>

        {/* Heading */}
        <h1 style={{ color: 'white', fontSize: 28, fontWeight: 500, marginBottom: '0.75rem' }}>
          Budget Tracker
        </h1>

        {/* Subtitle */}
        <p
          style={{
            color: '#a5b4fc',
            fontSize: 15,
            maxWidth: 400,
            lineHeight: 1.6,
            marginBottom: '2rem',
          }}
        >
          Import your UK bank statements, track spending by category, and visualise your finances —
          all stored privately on your device.
        </p>

        {migration.phase === 'declined' && (
          <div
            style={{
              background: 'rgba(234,179,8,0.15)',
              border: '1px solid rgba(234,179,8,0.3)',
              borderRadius: 8,
              padding: '12px 20px',
              maxWidth: 400,
              marginBottom: '1rem',
              color: '#fde68a',
              fontSize: 13,
            }}
          >
            <p style={{ fontWeight: 500, marginBottom: 2 }}>Migration required</p>
            <p style={{ opacity: 0.85 }}>The ledger cannot be used until migration is performed.</p>
          </div>
        )}

        {error && (
          <div
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8,
              padding: '12px 20px',
              maxWidth: 400,
              marginBottom: '1rem',
              color: '#fca5a5',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={() => void handleChooseFolder()}
          disabled={isLoading}
          style={{
            background: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '12px 32px',
            fontSize: 15,
            fontWeight: 500,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            marginBottom: 0,
          }}
        >
          {isLoading ? 'Opening…' : 'Choose Your Working Folder to Get Started'}
        </button>

        <p style={{ color: '#a5b4fc', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
          This is where your budget ledger file will be saved and read from.
        </p>

        {/* Feature cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            maxWidth: 520,
            width: '100%',
            marginTop: '2.5rem',
          }}
        >
          {/* Card 1 — Import CSV */}
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              padding: '14px 12px',
              textAlign: 'left',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              style={{ color: '#a5b4fc', marginBottom: 6, display: 'block' }}
            >
              <path
                d="M10 3v9m0 0l-3-3m3 3l3-3M4 14v1a2 2 0 002 2h8a2 2 0 002-2v-1"
                stroke="#a5b4fc"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p style={{ color: 'white', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
              Import CSV
            </p>
            <p style={{ color: '#818cf8', fontSize: 11, lineHeight: 1.4 }}>
              Nationwide, NewDay and more auto-detected
            </p>
          </div>

          {/* Card 2 — Track Spending */}
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              padding: '14px 12px',
              textAlign: 'left',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              style={{ color: '#a5b4fc', marginBottom: 6, display: 'block' }}
            >
              <path
                d="M3 14h2v3H3v-3zm4-4h2v7H7v-7zm4-3h2v10h-2V7zm4-4h2v14h-2V3z"
                fill="#a5b4fc"
              />
            </svg>
            <p style={{ color: 'white', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
              Track Spending
            </p>
            <p style={{ color: '#818cf8', fontSize: 11, lineHeight: 1.4 }}>
              Weekly, monthly and yearly summaries
            </p>
          </div>

          {/* Card 3 — Private by Design */}
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              padding: '14px 12px',
              textAlign: 'left',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              style={{ color: '#a5b4fc', marginBottom: 6, display: 'block' }}
            >
              <path
                d="M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2v-7a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm2 6V6a2 2 0 10-4 0v2h4zm-2 3a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1z"
                fill="#a5b4fc"
              />
            </svg>
            <p style={{ color: 'white', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
              Private by Design
            </p>
            <p style={{ color: '#818cf8', fontSize: 11, lineHeight: 1.4 }}>
              Your data never leaves your device
            </p>
          </div>
        </div>

        {/* Footer note */}
        <p style={{ color: '#818cf8', fontSize: 11, marginTop: '1.5rem' }}>
          Requires Chrome or Edge — File System Access API
        </p>
      </div>
    </>
  );
}
