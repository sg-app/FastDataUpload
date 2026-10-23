import { useCallback, useState } from 'react';
import { ApiError, uploadFiles } from '../lib/api';
import type { UploadedFileInfo } from '../types';

export interface UploadItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

export interface UseUploadResult {
  items: UploadItem[];
  isUploading: boolean;
  progress: number;
  lastError: string | null;
  uploadedFiles: UploadedFileInfo[];
  addFiles: (files: FileList | File[]) => void;
  removeFile: (id: string) => void;
  clear: () => void;
  startUpload: (token: string) => Promise<void>;
}

function createItem(file: File): UploadItem {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
    file,
    status: 'pending',
  };
}

/**
 * Manages the file selection list and the upload lifecycle for a single token.
 */
export function useUpload(): UseUploadResult {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const incoming = Array.from(files);
    setItems((prev) => [...prev, ...incoming.map(createItem)]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    setProgress(0);
    setLastError(null);
    setUploadedFiles([]);
  }, []);

  const startUpload = useCallback(
    async (token: string) => {
      const pending = items.filter((item) => item.status === 'pending' || item.status === 'error');
      if (pending.length === 0) {
        return;
      }

      setIsUploading(true);
      setLastError(null);
      setProgress(0);
      setItems((prev) =>
        prev.map((item) =>
          item.status === 'pending' || item.status === 'error'
            ? { ...item, status: 'uploading', error: undefined }
            : item,
        ),
      );

      try {
        const response = await uploadFiles(
          token,
          pending.map((item) => item.file),
          (fraction) => setProgress(fraction),
        );

        setUploadedFiles((prev) => [...prev, ...response.files]);
        setItems((prev) =>
          prev.map((item) =>
            item.status === 'uploading' ? { ...item, status: 'done' } : item,
          ),
        );
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : 'Upload failed. Please try again.';
        setLastError(message);
        setItems((prev) =>
          prev.map((item) =>
            item.status === 'uploading' ? { ...item, status: 'error', error: message } : item,
          ),
        );
      } finally {
        setIsUploading(false);
        setProgress(0);
      }
    },
    [items],
  );

  return {
    items,
    isUploading,
    progress,
    lastError,
    uploadedFiles,
    addFiles,
    removeFile,
    clear,
    startUpload,
  };
}
