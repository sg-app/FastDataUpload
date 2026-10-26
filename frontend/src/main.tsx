import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { getAppName, loadRuntimeConfig } from './lib/env';
import './index.css';

/**
 * The runtime configuration (public base URL, app name) is provided by the
 * container environment via GET /api/config. It is fetched before the first
 * render so the QR code always contains the configured public URL.
 */
async function bootstrap(): Promise<void> {
  await loadRuntimeConfig();

  document.title = getAppName();

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void bootstrap();
