import { QRCodeSVG } from 'qrcode.react';

interface QRCodeDisplayProps {
  /** The URL encoded into the QR code. */
  value: string;
  /** Rendered size in pixels. */
  size?: number;
}

/**
 * Renders the QR code inside a white card so it stays scannable in dark mode.
 */
export function QRCodeDisplay({ value, size = 240 }: QRCodeDisplayProps) {
  return (
    <div className="mx-auto w-fit rounded-2xl bg-white p-4 shadow-inner ring-1 ring-slate-200">
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        bgColor="#ffffff"
        fgColor="#0f172a"
        imageSettings={{
          src: '/favicon.svg',
          height: Math.round(size * 0.2),
          width: Math.round(size * 0.2),
          excavate: true,
        }}
      />
    </div>
  );
}
