import type {
  ApiErrorBody,
  TokenResponse,
  TokenValidationResponse,
  UploadResponse,
} from '../types';

/** Base URL of the backend API. Kept relative so Nginx can proxy it. */
const API_BASE = '/api';

/** Error type thrown for non-2xx API responses. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code = 'API_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** Parse a fetch Response and throw an ApiError on failure. */
async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = undefined;
    }
  }

  if (!res.ok) {
    const body = data as Partial<ApiErrorBody> | undefined;
    throw new ApiError(
      body?.message ?? `Request failed with status ${res.status}.`,
      res.status,
      body?.error ?? 'API_ERROR',
    );
  }

  return data as T;
}

/** Generate a new upload token. */
export async function generateToken(): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE}/token`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
  return parse<TokenResponse>(res);
}

/**
 * Validate an upload token. A 403 response is not treated as an error here,
 * instead the parsed body carries `valid: false`.
 */
export async function validateToken(token: string): Promise<TokenValidationResponse> {
  const res = await fetch(`${API_BASE}/token/${encodeURIComponent(token)}/validate`, {
    headers: { Accept: 'application/json' },
  });
  return parse<TokenValidationResponse>(res);
}

/** Invalidate a token on the server. */
export async function invalidateToken(token: string): Promise<void> {
  await fetch(`${API_BASE}/token/${encodeURIComponent(token)}`, { method: 'DELETE' });
}

/**
 * Upload files using XMLHttpRequest so we can report granular progress.
 *
 * @param token  The upload token.
 * @param files  The selected files.
 * @param onProgress Callback receiving a value between 0 and 1.
 */
export function uploadFiles(
  token: string,
  files: File[],
  onProgress?: (fraction: number) => void,
): Promise<UploadResponse> {
  return new Promise<UploadResponse>((resolve, reject) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file, file.name));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/upload/${encodeURIComponent(token)}`);
    xhr.responseType = 'text';

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded / event.total);
      }
    };

    xhr.onload = () => {
      let body: unknown = undefined;
      if (xhr.responseText) {
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          body = undefined;
        }
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as UploadResponse);
        return;
      }

      const err = body as Partial<ApiErrorBody> | undefined;
      reject(
        new ApiError(
          err?.message ?? `Upload failed with status ${xhr.status}.`,
          xhr.status,
          err?.error ?? 'UPLOAD_ERROR',
        ),
      );
    };

    xhr.onerror = () => reject(new ApiError('Network error during upload.', 0, 'NETWORK_ERROR'));
    xhr.onabort = () => reject(new ApiError('Upload was cancelled.', 0, 'ABORTED'));

    xhr.send(formData);
  });
}
