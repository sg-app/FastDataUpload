import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { NotFoundPage } from './pages/NotFoundPage';
import { QRCodePage } from './pages/QRCodePage';
import { UploadPage } from './pages/UploadPage';

/**
 * Application routes.
 *  - "/"                 -> operator QR code page
 *  - "/upload/:token"    -> mobile upload page
 *  - everything else     -> not found
 */
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<QRCodePage />} />
        <Route path="/upload/:token" element={<UploadPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
