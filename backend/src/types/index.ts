/**
 * Shared type definitions for the FastDataUpload backend.
 */

/** Internal representation of an upload token. */
export interface UploadToken {
  /** Opaque token value (UUID v4) used in the upload URL. */
  token: string;
  /** Timestamp when the token was created. */
  createdAt: Date;
  /** Timestamp when the token expires and becomes invalid. */
  expiresAt: Date;
  /** Number of files uploaded using this token so far. */
  uploadCount: number;
  /** Whether the token is currently active (not manually invalidated). */
  isActive: boolean;
}

/** Payload returned to the frontend when a new token is generated. */
export interface TokenResponse {
  token: string;
  /** Path-only upload URL, e.g. "/upload/3f2c...". The client prepends its origin. */
  uploadPath: string;
  /** Seconds until the token expires (relative to now). */
  expiresInSeconds: number;
  /** ISO timestamp of expiry. */
  expiresAt: string;
}

/** Response for token validation requests. */
export interface TokenValidationResponse {
  valid: boolean;
  expiresInSeconds: number;
  uploadCount: number;
}

/** Metadata describing a single stored file. */
export interface UploadedFileInfo {
  originalName: string;
  storedName: string;
  size: number;
  mimetype: string;
}

/** Standard error response shape. */
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

/**
 * Runtime configuration handed to the frontend via GET /api/config.
 * The values come from the container environment, so they can be changed
 * without rebuilding the image.
 */
export interface RuntimeConfigResponse {
  /** Display name shown in the UI. */
  appName: string;
  /** Public base URL used for the QR code link. Empty = browser origin. */
  appUrl: string;
}
