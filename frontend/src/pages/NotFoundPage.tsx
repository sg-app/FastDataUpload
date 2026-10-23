import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

/** Fallback page for unknown routes. */
export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col items-center justify-center px-6 text-center">
      <Logo className="mb-8" />
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Seite nicht gefunden</h1>
      <p className="mt-3 text-sm text-slate-500">
        Diese Adresse ist kein gültiger Upload-Link. Bitte scanne den QR-Code erneut.
      </p>
      <Link
        to="/"
        className="mt-8 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        Zur Startseite
      </Link>
    </div>
  );
}
