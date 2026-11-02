import { useEffect, useState } from 'react';
import { qrSvg } from '@/lib/sharedPhotoLink';

interface QrCodeProps {
  value: string;
  label: string;
  className?: string;
}

/** Renders a QR code for `value` as inline SVG. */
export default function QrCode({ value, label, className }: QrCodeProps) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let cancelled = false;
    qrSvg(value).then((markup) => { if (!cancelled) setSvg(markup); }).catch(() => { if (!cancelled) setSvg(''); });
    return () => { cancelled = true; };
  }, [value]);
  if (!svg) return <div className={className} role="img" aria-label={label} />;
  // The markup comes from the qrcode library for a URL we built, not from user content.
  return <div className={className} role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} />;
}
