/** Response of POST /api/token */
export interface TokenResponse {
  token: string;
  uploadPath: string;
  expiresInSeconds: number;
  expiresAt: string;
}

/** Response of GET /api/token/:token/validate */
export interface TokenValidationResponse {
  valid: boolean;
  expiresInSeconds: number;
  uploadCount: number;
}

/** Metadata of a single stored file. */
export interface UploadedFileInfo {
  originalName: string;
  storedName: string;
  size: number;
  mimetype: string;
}

/** Response of POST /api/upload/:token */
export interface UploadResponse {
  uploaded: number;
  files: UploadedFileInfo[];
  expiresInSeconds: number;
}

/** Error body returned by the API. */
export interface ApiErrorBody {
  error: string;
  message: string;
  statusCode: number;
}
