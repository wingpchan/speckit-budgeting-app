import { Component, type ReactNode } from 'react';
import { openLedger } from '../../services/ledger/ledger-opener';

interface Props {
  children: ReactNode;
  /** Called after the user successfully re-opens a folder. */
  onHandleRestored: (dirHandle: FileSystemDirectoryHandle) => Promise<void>;
}

interface State {
  error: Error | null;
  reopening: boolean;
}

/**
 * Catches File System Access API errors that occur mid-session
 * (e.g. folder inaccessible, write permission denied) and offers
 * the user a way to re-open their ledger folder.
 *
 * This boundary is intentionally placed AROUND the view area only —
 * migration and import errors are handled by their own flows and do
 * not reach this boundary.
 */
export class LedgerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, reopening: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[LedgerErrorBoundary] caught:', error, info.componentStack);
  }

  private async handleReopen() {
    this.setState({ reopening: true });
    try {
      const dirHandle = await openLedger();
      await this.props.onHandleRestored(dirHandle);
      this.setState({ error: null, reopening: false });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled the picker — stay on error screen
        this.setState({ reopening: false });
      } else {
        // Unexpected failure — stay on error screen
        this.setState({ reopening: false });
      }
    }
  }

  render() {
    const { error, reopening } = this.state;

    if (!error) {
      return this.props.children;
    }

    const isFileSystemError = error instanceof DOMException;
    const message = isFileSystemError
      ? 'The ledger folder is no longer accessible. This can happen if the folder was moved, deleted, or permission was revoked.'
      : 'An unexpected error occurred while accessing the ledger.';

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Ledger Unavailable</h2>
          <p className="text-sm text-red-700 mb-4">{message}</p>
          {!isFileSystemError && (
            <p className="text-xs text-red-500 font-mono mb-4 break-all">{error.message}</p>
          )}
          <button
            onClick={() => void this.handleReopen()}
            disabled={reopening}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {reopening ? 'Opening…' : 'Re-open Folder'}
          </button>
        </div>
      </div>
    );
  }
}
