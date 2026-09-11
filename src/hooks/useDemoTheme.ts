import { useEffect, useRef } from 'react';
import { isDemoMode } from '@/demo/demoConfig';
import { generateOklchScale } from '@/lib/colorUtils';

interface DemoSettingsRaw {
  themeColor?: string;
  themeAccent?: string;
}

const SETTINGS_KEY = 'vowora.demo.settings.v1';

/**
 * Reads demo theme colours from localStorage, converts hex → OKLCH scales,
 * and injects CSS custom properties to override primary/accent colours
 * across the guest portal.
 *
 * Only applies in demo mode.
 */
export function useDemoTheme() {
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    if (!isDemoMode) return;

    // Read settings
    let primaryHex = '#c4846d';   // default Rose
    let accentHex = '#8a9a7b';    // default Sage

    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed: DemoSettingsRaw = JSON.parse(raw);
        if (parsed.themeColor && /^#[0-9a-fA-F]{6}$/.test(parsed.themeColor)) {
          primaryHex = parsed.themeColor;
        }
        if (parsed.themeAccent && /^#[0-9a-fA-F]{6}$/.test(parsed.themeAccent)) {
          accentHex = parsed.themeAccent;
        }
      }
    } catch {
      // use defaults
    }

    // Generate OKLCH scales
    const primaryScale = generateOklchScale(primaryHex);
    const accentScale = generateOklchScale(accentHex);

    if (!primaryScale || !accentScale) return;

    // Build CSS
    let css = '';
    for (const step of ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']) {
      css += `--primary-${step}: ${primaryScale[step]};\n`;
      css += `--accent-${step}: ${accentScale[step]};\n`;
    }

    // Inject style
    const style = document.createElement('style');
    style.setAttribute('data-demo-theme', 'true');
    style.textContent = `:root {\n${css}}`;
    document.head.appendChild(style);
    styleRef.current = style;

    return () => {
      if (styleRef.current) {
        try { document.head.removeChild(styleRef.current); } catch { /* already removed */ }
        styleRef.current = null;
      }
    };
  }, []);
}