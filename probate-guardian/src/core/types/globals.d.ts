// Hand-maintained (unlike window-bridge.d.ts, which is generated): browser
// APIs TypeScript's DOM lib does not ship, and vendored classic-script
// globals from lib/ (see lib/VENDORED-LIBRARIES.md). App-defined bridge
// names do not belong here -- scripts/audit-window-bridge.mjs --declare
// owns those.

interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

interface FileSystemHandle {
  queryPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: Array<{ description?: string; accept: Record<string, string[]> }>;
  excludeAcceptAllOption?: boolean;
  id?: string;
  startIn?: string | FileSystemHandle;
}

interface OpenFilePickerOptions extends SaveFilePickerOptions {
  multiple?: boolean;
}

interface Window {
  // File System Access API (Chromium only; feature-detected everywhere it is used).
  showSaveFilePicker?(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
  showOpenFilePicker?(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
  // Classic-script vendored globals loaded by index.html or lazily by loaders.
  JSZip: any;
  ExcelJS?: any;
  bootstrap?: any;
  html2pdf?: any;
  jspdf?: any;
  pdfjsLib?: any;
}
