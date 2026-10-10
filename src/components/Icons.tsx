import type { SVGProps } from 'react';

/*
 * Linienicons nach Markenhandbuch: 24 px, Strich 1,75, runde Enden.
 * Fester Wortschatz: Schlüsselloch = nur SL, offenes Auge = öffentlich, Bändchen = Kapitel/Recap,
 * Mikrofon = Aufnahme, Buch = Bibel, Kalender = Termin, Sprechblase = Kommentar, Schirm = SL-Schirm.
 */
const base = (size = 24): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true
});

/** Übersicht der Kampagne */
export const IconShield = ({ size }: { size?: number }) => (
  <svg {...base(size)}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /><path d="M10 20v-6h4v6" /></svg>
);
export const IconMic = ({ size }: { size?: number }) => (
  <svg {...base(size)}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
);
/** Bändchen = Kapitel/Recap (Chronik) */
export const IconScroll = ({ size }: { size?: number }) => (
  <svg {...base(size)}><path d="M7 3h10v18l-5-4-5 4z" /></svg>
);
export const IconBook = ({ size }: { size?: number }) => (
  <svg {...base(size)}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5M9 8h6" /></svg>
);
/** Schlüsselloch = nur SL */
export const IconLock = ({ size = 16 }: { size?: number }) => (
  <svg {...base(size)}><circle cx="12" cy="9" r="3.5" /><path d="M10.5 12 9.5 20h5l-1-8" /></svg>
);
/** Offenes Auge = öffentlich */
export const IconEye = ({ size = 16 }: { size?: number }) => (
  <svg {...base(size)}><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const IconCalendar = ({ size = 20 }: { size?: number }) => (
  <svg {...base(size)}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
);
export const IconChat = ({ size = 20 }: { size?: number }) => (
  <svg {...base(size)}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>
);
export const IconInfo = ({ size = 22 }: { size?: number }) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v5h1" /></svg>
);
export const IconPlay = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
);
export const IconSpeaker = ({ size = 18 }: { size?: number }) => (
  <svg {...base(size)}><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M17 9a4 4 0 0 1 0 6" /></svg>
);
export const IconBack = ({ size = 24 }: { size?: number }) => (
  <svg {...base(size)}><path d="M15 5l-7 7 7 7" /></svg>
);
export const IconCheck = ({ size = 14 }: { size?: number }) => (
  <svg {...base(size)}><path d="M5 12.5 10 17 19 7" /></svg>
);
/** Einfügen aus der Zwischenablage (zwei Blätter, wie üblich) */
export const IconPaste = ({ size }: { size?: number }) => (
  <svg {...base(size)}><rect x="8" y="3" width="12" height="15" rx="2.5" /><path d="M5 7.5v10A3.5 3.5 0 0 0 8.5 21H16" /></svg>
);
/** QR-Code scannen (Suchrahmen) */
export const IconScan = ({ size }: { size?: number }) => (
  <svg {...base(size)}><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" /><path d="M8 12h8" /></svg>
);
/** SL-Schirm: dreiteiliger, aufgestellter Schirm */
export const IconScreen = ({ size = 18 }: { size?: number }) => (
  <svg {...base(size)}><path d="M3 6.5 8 4.5v14l-5 2z" /><path d="M8 4.5l8 2v14l-8-2z" /><path d="M16 6.5l5-2v14l-5 2z" /></svg>
);
/** Absenden (Pfeil nach oben, z. B. Korrektur-Hinweis) */
export const IconSend = ({ size = 18 }: { size?: number }) => (
  <svg {...base(size)}><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></svg>
);
/** Suchen (Lupe) */
export const IconSearch = ({ size = 18 }: { size?: number }) => (
  <svg {...base(size)}><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5.5 5.5" /></svg>
);
