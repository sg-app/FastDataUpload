import { useRef, useState } from 'react';
import { useUpload } from '../hooks/useUpload';
import { formatBytes } from '../lib/env';

interface FileUploaderProps {
  token: string;
  /** Called after a successful upload so the page can refresh its state. */
  onUploaded?: () => void;
  /** Maximum size per file in bytes (for client side validation feedback). */
  maxFileSizeBytes?: number;
}

/**
 * Mobile first file uploader with drag & drop, per-file status and progress.
 */
export function FileUploader({ token, onUploaded, maxFileSizeBytes }: FileUploaderProps) {
  const {
    items,
    isUploading,
    progress,
    lastError,
    uploadedFiles,
    addFiles,
    removeFile,
    clear,
    startUpload,
  } = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleUpload = async () => {
    await startUpload(token);
    onUploaded?.();
  };

  const totalSelected = items.length;
  const hasPending = items.some((item) => item.status === 'pending' || item.status === 'error');

  return (
    <div className="w-full space-y-5">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.length) {
            addFiles(e.dataTransfer.files);
          }
        }}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
            : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900'
        }`}
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 16V4m0 0L8 8m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Dateien auswählen oder hierher ziehen
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Fotos &amp; Dateien
          {maxFileSizeBytes ? ` · max. ${formatBytes(maxFileSizeBytes)} pro Datei` : ''}
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-5 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98]"
        >
          Dateien auswählen
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              addFiles(e.target.files);
            }
            e.target.value = '';
          }}
        />
      </div>

      {/* Selected files */}
      {totalSelected > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                  {item.file.name}
                </p>
                <p className="text-xs text-slate-400">
                  {formatBytes(item.file.size)}
                  {item.status === 'done' && ' · hochgeladen'}
                  {item.status === 'error' && ` · ${item.error ?? 'Fehler'}`}
                </p>
              </div>
              {item.status === 'done' ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-500 text-white">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => removeFile(item.id)}
                  disabled={isUploading}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-red-500 disabled:opacity-40 dark:hover:bg-slate-800"
                  aria-label="Datei entfernen"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Progress */}
      {isUploading && (
        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-brand-600 transition-[width] duration-200"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="text-right text-xs text-slate-500">{Math.round(progress * 100)}%</p>
        </div>
      )}

      {lastError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {lastError}
        </p>
      )}

      {uploadedFiles.length > 0 && !isUploading && (
        <p className="rounded-xl bg-accent-500/10 px-4 py-3 text-sm font-medium text-accent-600">
          {uploadedFiles.length} Datei(en) erfolgreich hochgeladen.
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleUpload}
          disabled={isUploading || !hasPending}
          className="flex-1 rounded-xl bg-brand-600 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading
            ? 'Wird hochgeladen…'
            : hasPending
              ? 'Jetzt hochladen'
              : 'Keine Dateien ausgewählt'}
        </button>
        {items.length > 0 && !isUploading && (
          <button
            type="button"
            onClick={clear}
            className="rounded-xl px-4 py-4 text-sm font-medium text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Leeren
          </button>
        )}
      </div>
    </div>
  );
}
