import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

import { palette } from '@design/tokens';

/** Nội dung QR — khớp với app: scan.tsx bỏ tiền tố miwacare://p/ rồi gửi mã lên server. */
export const qrPayload = (code: string) => `miwacare://p/${code}`;

export function useQrDataUrl(code: string, width = 512) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(qrPayload(code), { width, margin: 2, errorCorrectionLevel: 'M', color: { dark: palette.brand.navy['900'], light: palette.brand.white } }).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [code, width]);
  return url;
}

export function QrImage({ code, size = 160 }: { code: string; size?: number }) {
  const url = useQrDataUrl(code);
  return url ? <img src={url} width={size} height={size} alt={`Mã QR ${code}`} style={{ borderRadius: 8, display: 'block' }} /> : <div className="skeleton" style={{ width: size, height: size }} />;
}
