import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileUploader } from '../components/FileUploader';
import { Logo } from '../components/Logo';
import { Timer } from '../components/Timer';
import { useCountdown } from '../hooks/useCountdown';
import { validateToken } from '../lib/api';

type Status = 'checking' | 'valid' | 'invalid' | 'expired';

/**
 * Mobile upload page reached by scanning the QR code. The token is validated
 * against the backend, then the file uploader is shown until the token expires.
 */
export function UploadPage() {
  const { token = '' } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>('checking');
  const [totalSeconds, setTotalSeconds] = useState(600);
  const [uploadCount, setUploadCount] = useState(0);

  const { seconds, reset } = useCountdown(() => setStatus('expired'));

  const check = useCallback(async () => {
    try {
      const result = await validateToken(token);
      if (!result.valid) {
        setStatus('invalid');
        return;
      }
      setStatus('valid');
      setUploadCount(result.uploadCount);
      setTotalSeconds(result.expiresInSeconds);
      reset(result.expiresInSeconds);
    } catch {
      setStatus('invalid');
    }
  }, [token, reset]);

  useEffect(() => {
    void check();
  }, [check]);

  const handleUploaded = () => {
    void check();
  };

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col px-5 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Logo size={38} />
      </header>

      <main className="flex-1 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
        {status === 'checking' && (
          <p className="py-16 text-center text-slate-500">Link wird geprüft…</p>
        )}

        {status === 'invalid' && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-900/20">
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5m0 3h.01" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Link ungültig oder abgelaufen
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Bitte den QR-Code auf dem Bildschirm neu generieren lassen.
            </p>
          </div>
        )}

        {status === 'expired' && (
          <div className="py-16 text-center">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Zeit abgelaufen</h1>
            <p className="mt-2 text-sm text-slate-500">
              Dieser Upload-Link ist nicht mehr gültig. Bitte einen neuen QR-Code scannen.
            </p>
          </div>
        )}

        {status === 'valid' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Datei hochladen
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {uploadCount > 0
                    ? `${uploadCount} Datei(en) gesendet`
                    : 'Bitte Dateien auswählen'}
                </p>
              </div>
              <Timer seconds={seconds} totalSeconds={totalSeconds} label="Verbleibend" />
            </div>

            <FileUploader token={token} onUploaded={handleUploaded} />
          </div>
        )}
      </main>

      <footer className="mt-6 text-center text-xs text-slate-400">
        FastDataUpload · sicherer Direkt-Upload
      </footer>
    </div>
  );
}
