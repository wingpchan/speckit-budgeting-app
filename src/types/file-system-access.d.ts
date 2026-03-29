/**
 * Type augmentations for the File System Access API and related Chrome-only APIs.
 * Standard DOM lib (ES2023) does not include these; they are Chromium-specific.
 */

interface FileSystemHandlePermissionDescriptor {
  mode: 'read' | 'readwrite';
}

interface FileSystemFileHandle {
  /**
   * Moves/renames the file.
   * Available in Chromium 121+.
   */
  move(name: string): Promise<void>;
  move(directoryHandle: FileSystemDirectoryHandle, name?: string): Promise<void>;
}

interface FileSystemDirectoryHandle extends AsyncIterable<[string, FileSystemHandle]> {
  queryPermission(descriptor: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission(descriptor: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

interface Window {
  showDirectoryPicker(options?: {
    id?: string;
    mode?: 'read' | 'readwrite';
    startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
  }): Promise<FileSystemDirectoryHandle>;

  showOpenFilePicker(options?: {
    multiple?: boolean;
    types?: Array<{ description?: string; accept: Record<string, string[]> }>;
    excludeAcceptAllOption?: boolean;
  }): Promise<FileSystemFileHandle[]>;
}
