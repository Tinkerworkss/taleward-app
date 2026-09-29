import { useEffect, useState } from 'react';

/*
 * Wortmarke aus den Markendateien unter src/assets/taleward.
 * Eingebunden über import.meta.glob: Fehlen die Dateien, baut die App trotzdem und zeigt
 * den Namen als Text in Alegreya ExtraBold. Hell: lockup, dunkel: lockup-inverse.
 */
const files = import.meta.glob('../assets/taleward/**/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

function find(test: (name: string) => boolean): string | null {
  const key = Object.keys(files).find((k) => test(k.split('/').pop()!.toLowerCase()));
  return key ? files[key] : null;
}

const raws = import.meta.glob('../assets/taleward/**/*.svg', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

/**
 * Inhalt einer Marken-SVG als Text, Füllfarbe auf currentColor umgestellt – so lässt sich das Zeichen
 * direkt einbetten und per CSS einfärben/animieren. null, wenn die Datei fehlt.
 */
export function brandSvgInline(fileName: string): string | null {
  const key = Object.keys(raws).find((k) => k.split('/').pop()!.toLowerCase() === fileName);
  if (!key) return null;
  return raws[key]
    .replace(/fill="#[0-9a-fA-F]{3,6}"/g, 'fill="currentColor"')
    .replace(/<title>.*?<\/title>/, '')
    .replace(/ role="img"| aria-label="[^"]*"/g, '')
    .replace(/ width="\d+" height="\d+"/, ' width="100%" height="100%" aria-hidden="true"');
}

/**
 * Die Formen einer Zeichen-SVG (Pfade samt Farbe und Koordinatensystem) – zum Nachzeichnen als Linien.
 * Liest die Originaldatei, damit das Ergebnis deckungsgleich mit dem Logo bleibt.
 */
export function brandMarkShapes(fileName: string): { viewBox: string; transform: string; paths: { d: string; fill: string }[] } | null {
  const key = Object.keys(raws).find((k) => k.split('/').pop()!.toLowerCase() === fileName);
  if (!key) return null;
  const s = raws[key];
  const viewBox = s.match(/<svg[^>]*\sx="0"[^>]*viewBox="([^"]+)"/)?.[1];
  const transform = s.match(/<g transform="([^"]+)"/)?.[1] ?? '';
  const paths = [...s.matchAll(/<path fill="([^"]+)" d="([^"]+)"/g)].map((m) => ({ fill: m[1], d: m[2] }));
  return viewBox && paths.length ? { viewBox, transform, paths } : null;
}

/** URL einer Markendatei (z. B. das einfarbige Zeichen) – oder null, wenn sie fehlt */
export const brandAsset = (fileName: string): string | null => find((n) => n === fileName);

const light = find((n) => n.includes('lockup') && !n.includes('inverse') && !n.includes('stack') && !n.includes('mono'));
const dark = find((n) => n.includes('lockup') && n.includes('inverse') && !n.includes('stack'));

function useDarkTheme(): boolean {
  const read = () => {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr) return attr === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  };
  const [isDark, setDark] = useState(read);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const update = () => setDark(read());
    mq?.addEventListener('change', update);
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { mq?.removeEventListener('change', update); obs.disconnect(); };
  }, []);
  return isDark;
}

export function Wordmark({ width = 220 }: { width?: number }) {
  const isDark = useDarkTheme();
  const src = isDark ? dark ?? light : light;
  if (src) return <img src={src} alt="Taleward" style={{ width, maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto' }} />;
  return <div style={{ font: '800 40px/44px var(--font-serif)', textAlign: 'center', color: 'var(--ink)' }}>Taleward</div>;
}
