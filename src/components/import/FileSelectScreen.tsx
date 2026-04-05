import { useState, useEffect } from 'react';

interface FileSelectScreenProps {
  onFileSelected: (file: File) => void;
  isDetecting: boolean;
  error: string | null;
}

export function FileSelectScreen({ onFileSelected, isDetecting, error }: FileSelectScreenProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault();
    document.addEventListener('dragover', prevent);
    document.addEventListener('drop', prevent);
    return () => {
      document.removeEventListener('dragover', prevent);
      document.removeEventListener('drop', prevent);
    };
  }, []);

  async function handleClick() {
    setLocalError(null);

    let fileHandle: FileSystemFileHandle;
    try {
      [fileHandle] = await window.showOpenFilePicker({
        types: [{ accept: { 'text/csv': ['.csv'] } }],
      });
    } catch (err) {
      // User dismissed the picker — not an error
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setLocalError('Could not open file picker');
      return;
    }

    const file = await fileHandle.getFile();

    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setLocalError('Only CSV files are supported');
      return;
    }

    onFileSelected(file);
  }

  function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setLocalError(null);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setLocalError('Only CSV files are supported');
      return;
    }

    onFileSelected(file);
  }

  const displayError = localError ?? error;

  return (
    <div
      style={{
        padding: '2rem',
        maxWidth: 560,
        width: '100%',
        margin: '2rem auto',
      }}
    >
      <h1 className="text-2xl font-semibold mb-2" style={{ textAlign: 'center' }}>
        Import Bank CSV
      </h1>
      <p
        style={{
          fontSize: 14,
          color: 'var(--color-text-secondary)',
          lineHeight: 1.5,
          marginBottom: '1.5rem',
          textAlign: 'center',
        }}
      >
        Select a CSV export from your UK bank account. Nationwide and NewDay formats are
        auto-detected.
      </p>

      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: isDragOver ? '#6366f1' : '#c7d2fe',
          borderRadius: 12,
          padding: '2.5rem 2rem',
          textAlign: 'center',
          backgroundColor: isDragOver ? '#eef2ff' : '#ebe9ff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          transition: 'border-color 0.15s, background-color 0.15s',
        }}
      >
        {/* Upload icon */}
        <div
          style={{
            width: 48,
            height: 48,
            backgroundColor: '#eef2ff',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 4v12m0-12l-4 4m4-4l4 4"
              stroke="#6366f1"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 20h16"
              stroke="#6366f1"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Text */}
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            {isDetecting ? 'Detecting format…' : 'Drag and drop your CSV file here'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>or</p>
        </div>

        {/* Browse button */}
        <button
          onClick={handleClick}
          disabled={isDetecting}
          style={{
            background: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 500,
            cursor: isDetecting ? 'not-allowed' : 'pointer',
            opacity: isDetecting ? 0.6 : 1,
          }}
        >
          Browse Files
        </button>

        {/* Format badges */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 4, flexWrap: 'wrap' }}>
          {(['Nationwide Current', 'Nationwide Credit Card', 'NewDay Credit Card'] as const).map((label) => (
            <span
              key={label}
              style={{
                display: 'inline-block',
                background: '#eef2ff',
                color: '#4f46e2',
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 20,
              }}
            >
              {label}
            </span>
          ))}
          <span
            style={{
              display: 'inline-block',
              background: '#f1f5f9',
              color: '#64748b',
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 20,
            }}
          >
            + any UK bank CSV
          </span>
        </div>
      </div>

      {displayError && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: '12px 16px',
            fontSize: 14,
            color: '#b91c1c',
            textAlign: 'center',
            marginTop: '1rem',
          }}
        >
          {displayError}
        </div>
      )}
    </div>
  );
}
