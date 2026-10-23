import { useCallback, useEffect, useState } from 'react';
import { Logo } from '../components/Logo';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import { Timer } from '../components/Timer';
import { useCountdown } from '../hooks/useCountdown';
import { generateToken, invalidateToken } from '../lib/api';
import { buildUploadUrl } from '../lib/env';
import type { TokenResponse } from '../types';

/**
 * Operator facing page. Generates a 10 minute upload token, renders it as a
 * QR code and lets the operator reload a fresh token at any time.
 */
export function QRCodePage() {
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(600);
  const [copied, setCopied] = useState(false);

  const { seconds, reset } = useCountdown(() => setExpired(true));

  const createToken = useCallback(
    async (invalidate?: string) => {
      setLoading(true);
      setError(null);
      setExpired(false);
      try {
        if (invalidate) {
          await invalidateToken(invalidate);
        }
        const data = await generateToken();
        setTokenData(data);
        setTotalSeconds(data.expiresInSeconds);
        reset(data.expiresInSeconds);
      } catch {
        setError('Token konnte nicht erstellt werden. Läuft das Backend?');
      } finally {
        setLoading(false);
      }
    },
    [reset],
  );

  useEffect(() => {
    void createToken();
  }, [createToken]);

  const uploadUrl = tokenData ? buildUploadUrl(tokenData.uploadPath) : '';

  const handleReload = () => {
    void createToken(tokenData?.token);
  };

  const handleCopy = async () => {
    if (!uploadUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(uploadUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col px-5 py-8">
      <header className="mb-8 flex items-center justify-between">
        <Logo />
        <span className="rounded-full bg-accent-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-600">
          Bereit
        </span>
      </header>

      <main className="grid flex-1 content-start gap-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800 sm:p-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Dateien per QR-Code empfangen
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Handy scannen und Dateien direkt und ohne App hochladen.
          </p>
        </div>

        {loading && <p className="text-center text-slate-500">Token wird erstellt…</p>}

        {error && !loading && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-600 dark:bg-red-900/20">
            {error}
          </p>
        )}

        {tokenData && !loading && !error && (
          <>
            <div className="relative flex justify-center">
              <QRCodeDisplay value={uploadUrl} size={248} />
              {expired && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-900/70 backdrop-blur-sm">
                  <span className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-600">
                    Link abgelaufen
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <Timer seconds={seconds} totalSeconds={totalSeconds} />
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
              <code className="min-w-0 flex-1 truncate text-xs text-slate-600 dark:text-slate-300">
                {uploadUrl}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-50 dark:hover:bg-brand-900/30"
              >
                {copied ? 'Kopiert!' : 'Kopieren'}
              </button>
            </div>

            <button
              type="button"
              onClick={handleReload}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.99] disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Neuen Token generieren
            </button>

            <p className="text-center text-xs text-slate-400">
              Beim Reload wird der aktuelle Link sofort ungültig.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
