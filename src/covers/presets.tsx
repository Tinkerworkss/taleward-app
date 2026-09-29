import type { ReactElement, ReactNode } from 'react';
import { tk } from '../i18n';

/**
 * Mitgelieferte Titelbilder als SVG – klein, offline verfügbar, im Stil der App.
 * viewBox 400×200; angezeigt wird mit "slice", also passend beschnitten.
 * Die IDs sind Teil der Schnittstelle (Campaign.coverPreset) und dürfen sich nicht ändern.
 */

type Scene = () => ReactElement;

// Deterministische "Zufalls"-Punkte für Sterne, Blumen usw.
function dots(n: number, seed: number, w = 400, h = 200) {
  let x = seed;
  const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, () => ({ x: rnd() * w, y: rnd() * h, r: rnd() }));
}

// Rein dekorativ: für Screenreader ausgeblendet
const Svg = ({ children }: { children: ReactNode; label?: string }) => (
  <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"
    style={{ display: 'block', width: '100%', height: '100%' }}>
    {children}
  </svg>
);

const meadow: Scene = () => (
  <Svg label="Wiese">
    <defs><linearGradient id="cv-meadow-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a9c9d6" /><stop offset="1" stopColor="#f2e8d5" /></linearGradient></defs>
    <rect width="400" height="200" fill="url(#cv-meadow-sky)" />
    <circle cx="320" cy="52" r="22" fill="#f6d98b" />
    <path d="M0 120 Q90 80 190 115 T400 105 V200 H0Z" fill="#9bb77a" />
    <path d="M0 150 Q120 115 240 145 T400 140 V200 H0Z" fill="#7a9a5c" />
    <path d="M0 175 Q150 150 300 172 T400 168 V200 H0Z" fill="#5f7f45" />
    <rect x="96" y="92" width="4" height="26" fill="#4a3a2a" /><circle cx="98" cy="86" r="16" fill="#5f7f45" />
    <g fill="#f2e8d5"><polygon points="250,108 256,96 262,108" /><rect x="253" y="108" width="6" height="12" fill="#e6d7b8" /></g>
    {dots(40, 7, 400, 40).map((d, i) => <circle key={i} cx={d.x} cy={160 + d.y} r={1.2 + d.r} fill={i % 3 ? '#c0503c' : '#5a7fc0'} />)}
  </Svg>
);

const forest: Scene = () => (
  <Svg label="Wald">
    <defs><linearGradient id="cv-forest-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d9c7a3" /><stop offset="1" stopColor="#b9c49a" /></linearGradient></defs>
    <rect width="400" height="200" fill="url(#cv-forest-sky)" />
    {[{ c: '#8ea27a', y: 120, s: 0.8, n: 14 }, { c: '#5f7a52', y: 150, s: 1, n: 11 }, { c: '#3a5238', y: 185, s: 1.3, n: 8 }].map((row, r) =>
      Array.from({ length: row.n }, (_, i) => {
        const x = (i + (r % 2) * 0.5) * (400 / (row.n - 1));
        const h = 70 * row.s;
        return <polygon key={`${r}-${i}`} points={`${x},${row.y - h} ${x - 18 * row.s},${row.y} ${x + 18 * row.s},${row.y}`} fill={row.c} />;
      })
    )}
    <rect y="185" width="400" height="15" fill="#2e4230" />
  </Svg>
);

const desert: Scene = () => (
  <Svg label="Wüste">
    <defs><linearGradient id="cv-desert-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e39a5a" /><stop offset="1" stopColor="#f5d7a1" /></linearGradient></defs>
    <rect width="400" height="200" fill="url(#cv-desert-sky)" />
    <circle cx="110" cy="95" r="38" fill="#fbe7b0" opacity="0.9" />
    <rect x="286" y="96" width="6" height="22" fill="#6b4a2e" /><rect x="284" y="92" width="10" height="5" fill="#6b4a2e" />
    <path d="M0 125 Q100 100 200 122 T400 115 V200 H0Z" fill="#d9a466" />
    <path d="M0 155 Q140 120 260 150 T400 145 V200 H0Z" fill="#c68a4c" />
    <path d="M0 185 Q120 160 230 180 T400 175 V200 H0Z" fill="#a86f38" />
    <g fill="#6b4a2e"><ellipse cx="150" cy="148" rx="7" ry="4" /><rect x="146" y="148" width="2" height="7" /><rect x="152" y="148" width="2" height="7" /><rect x="155" y="140" width="2" height="8" /></g>
  </Svg>
);

const city: Scene = () => (
  <Svg label="Stadt">
    <defs><linearGradient id="cv-city-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5d6b8a" /><stop offset="1" stopColor="#e3b98a" /></linearGradient></defs>
    <rect width="400" height="200" fill="url(#cv-city-sky)" />
    <path d="M0 200 V130 H30 L45 110 L60 130 H80 V100 L95 85 L110 100 V130 H130 L150 105 L170 130 H190 V70 L200 40 L210 70 V130 H225 L240 112 L255 130 H275 V105 L292 90 L309 105 V130 H330 L350 108 L370 130 H400 V200Z" fill="#3b3140" />
    <path d="M0 200 V160 H40 L55 145 L70 160 H100 L118 140 L136 160 H170 L185 148 L200 160 H240 L262 138 L284 160 H320 L338 146 L356 160 H400 V200Z" fill="#2a2118" />
    {[[88, 115], [100, 115], [198, 90], [198, 110], [290, 115], [300, 115], [52, 170], [122, 168], [262, 168], [340, 172]].map(([x, y], i) =>
      <rect key={i} x={x} y={y} width="5" height="7" fill="#f3c768" />)}
  </Svg>
);

const cyber: Scene = () => (
  <Svg label="Cyberstadt">
    <defs><linearGradient id="cv-cyber-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#140f2a" /><stop offset="1" stopColor="#4b1f5c" /></linearGradient></defs>
    <rect width="400" height="200" fill="url(#cv-cyber-sky)" />
    <circle cx="200" cy="120" r="46" fill="#ff5fa2" opacity="0.35" />
    {[[10, 70, 30], [45, 50, 22], [75, 85, 34], [115, 40, 26], [150, 65, 30], [235, 45, 28], [270, 80, 24], [300, 35, 36], [342, 60, 26], [372, 90, 28]].map(([x, top, w], i) => (
      <g key={i}>
        <rect x={x} y={top} width={w} height={130 - top} fill="#1d1638" stroke={i % 2 ? '#34e0e8' : '#ff5fa2'} strokeWidth="1" />
        {Array.from({ length: Math.floor((130 - top) / 12) }, (_, j) => <rect key={j} x={x + 4} y={top + 6 + j * 12} width={w - 8} height="2" fill={i % 2 ? '#34e0e8' : '#ff5fa2'} opacity={j % 3 ? 0.35 : 0.8} />)}
      </g>
    ))}
    <rect y="130" width="400" height="70" fill="#0d0a1c" />
    {Array.from({ length: 9 }, (_, i) => <line key={i} x1={200} y1={130} x2={-200 + i * 100} y2={200} stroke="#34e0e8" strokeWidth="0.8" opacity="0.6" />)}
    {[140, 152, 168, 190].map((y, i) => <line key={i} x1="0" y1={y} x2="400" y2={y} stroke="#ff5fa2" strokeWidth="0.8" opacity="0.5" />)}
  </Svg>
);

const mountains: Scene = () => (
  <Svg label="Gebirge">
    <defs><linearGradient id="cv-mount-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9fb6c8" /><stop offset="1" stopColor="#eef0ea" /></linearGradient></defs>
    <rect width="400" height="200" fill="url(#cv-mount-sky)" />
    <polygon points="0,150 70,70 130,140 190,40 260,130 320,65 400,140 400,200 0,200" fill="#7d8ea0" />
    <polygon points="190,40 172,72 182,68 190,78 200,66 210,70" fill="#f7f7f2" />
    <polygon points="320,65 305,90 316,86 323,94 332,84 338,88" fill="#f7f7f2" />
    <polygon points="70,70 58,92 68,88 74,96 82,86" fill="#f7f7f2" />
    <polygon points="0,175 90,120 170,170 250,115 330,160 400,130 400,200 0,200" fill="#56677a" />
    <path d="M250 60 q8 -6 16 0 q8 -6 16 0" stroke="#3b3140" strokeWidth="2" fill="none" />
  </Svg>
);

const coast: Scene = () => (
  <Svg label="Küste">
    <defs><linearGradient id="cv-coast-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8fb3c4" /><stop offset="1" stopColor="#f2e3c6" /></linearGradient></defs>
    <rect width="400" height="200" fill="url(#cv-coast-sky)" />
    <rect y="115" width="400" height="85" fill="#3f6f86" />
    {[128, 145, 165, 185].map((y, i) => <path key={i} d={`M0 ${y} ${Array.from({ length: 10 }, () => `q10 -4 20 0 q10 4 20 0`).join(' ')}`} stroke="#9cc3cf" strokeWidth="1.5" fill="none" opacity={0.7 - i * 0.12} />)}
    <g transform="translate(250 72)">
      <path d="M0 42 H70 L60 54 H10Z" fill="#3b2a1e" />
      <rect x="33" y="0" width="3" height="44" fill="#3b2a1e" />
      <path d="M36 4 Q58 18 36 38Z" fill="#f2e8d5" /><path d="M33 8 Q14 20 33 36Z" fill="#e6d7b8" />
    </g>
    <path d="M80 50 q6 -5 12 0 q6 -5 12 0 M120 64 q5 -4 10 0 q5 -4 10 0" stroke="#3b3140" strokeWidth="1.5" fill="none" />
    <path d="M0 200 V160 Q40 140 90 150 T150 200Z" fill="#c9a86e" />
  </Svg>
);

const swamp: Scene = () => (
  <Svg label="Moor">
    <rect width="400" height="200" fill="#b7bfa8" />
    <rect y="120" width="400" height="80" fill="#6f7c5c" />
    <ellipse cx="220" cy="160" rx="120" ry="14" fill="#8e9a86" />
    {[[70, 60], [300, 40], [360, 75]].map(([x, top], i) => (
      <path key={i} d={`M${x} 150 V${top} M${x} ${top + 30} l-18 -16 M${x} ${top + 18} l14 -14 M${x} ${top + 50} l16 -10`} stroke="#3a3a2c" strokeWidth={i === 1 ? 5 : 4} strokeLinecap="round" fill="none" />
    ))}
    {Array.from({ length: 30 }, (_, i) => <line key={i} x1={10 + i * 13} y1={200} x2={12 + i * 13 + (i % 3) * 2} y2={170 - (i % 4) * 6} stroke="#4f5a3c" strokeWidth="1.5" />)}
    <rect y="95" width="400" height="30" fill="#e7eadf" opacity="0.45" />
    <rect y="135" width="400" height="18" fill="#e7eadf" opacity="0.3" />
  </Svg>
);

const dungeon: Scene = () => (
  <Svg label="Gewölbe">
    <defs><radialGradient id="cv-dungeon-glow" cx="0.5" cy="0.55" r="0.6"><stop offset="0" stopColor="#6b4a2e" /><stop offset="1" stopColor="#1c1612" /></radialGradient></defs>
    <rect width="400" height="200" fill="url(#cv-dungeon-glow)" />
    {Array.from({ length: 8 }, (_, r) => Array.from({ length: 9 }, (_, c) => (
      <rect key={`${r}-${c}`} x={c * 48 - (r % 2) * 24} y={r * 26} width="46" height="24" fill="none" stroke="#2a2118" strokeWidth="2" opacity="0.7" />
    )))}
    <path d="M130 200 V110 Q200 40 270 110 V200Z" fill="#120e0b" />
    {[95, 305].map((x, i) => (
      <g key={i}>
        <rect x={x - 3} y="95" width="6" height="22" fill="#3b2a1e" />
        <circle cx={x} cy="88" r="16" fill="#f3a93c" opacity="0.25" />
        <path d={`M${x} 76 q8 10 0 18 q-8 -8 0 -18`} fill="#f6c45c" />
      </g>
    ))}
    <rect y="185" width="400" height="15" fill="#1c1612" />
  </Svg>
);

const space: Scene = () => (
  <Svg label="Weltraum">
    <rect width="400" height="200" fill="#0f1024" />
    {dots(90, 42).map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={0.4 + d.r * 1.2} fill="#f2e8d5" opacity={0.4 + d.r * 0.6} />)}
    <circle cx="270" cy="115" r="52" fill="#c98b4a" />
    <path d="M222 100 Q270 120 318 98 M225 125 Q270 140 316 122" stroke="#a86f38" strokeWidth="6" fill="none" opacity="0.7" />
    <ellipse cx="270" cy="115" rx="92" ry="16" fill="none" stroke="#e6d7b8" strokeWidth="3" opacity="0.8" transform="rotate(-12 270 115)" />
    <circle cx="90" cy="60" r="12" fill="#8e9ab0" /><circle cx="140" cy="150" r="7" fill="#b9a38a" />
  </Svg>
);

const castle: Scene = () => (
  <Svg label="Burg">
    <defs><linearGradient id="cv-castle-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6a5f86" /><stop offset="1" stopColor="#e7b38c" /></linearGradient></defs>
    <rect width="400" height="200" fill="url(#cv-castle-sky)" />
    <circle cx="80" cy="50" r="14" fill="#f2e8d5" opacity="0.9" />
    <path d="M0 200 V160 Q120 110 200 118 Q290 110 400 150 V200Z" fill="#4a4a3a" />
    <g fill="#2a2118">
      <rect x="160" y="70" width="80" height="55" />
      <rect x="148" y="55" width="22" height="70" /><rect x="230" y="55" width="22" height="70" /><rect x="190" y="40" width="20" height="85" />
      {[148, 155, 162, 230, 237, 244, 190, 197, 204].map((x, i) => <rect key={i} x={x} y={i > 5 ? 34 : 49} width="5" height="7" />)}
    </g>
    <path d="M200 40 V18" stroke="#2a2118" strokeWidth="2" /><path d="M200 18 L222 23 L200 29Z" fill="#7b2d26" />
    <rect x="194" y="100" width="12" height="25" rx="6" fill="#f3c768" opacity="0.8" />
  </Svg>
);

export interface CoverPreset {
  id: string;
  label: string;
  /** Bild aus src/assets/taleward/covers (1200 × 600, WebP) – wird erst beim Anzeigen geladen */
  image?: string;
  /** Gezeichnetes Ersatzmotiv, falls das Bild fehlt (nur die ersten elf) */
  Scene?: Scene;
}

// Titelbilder aus den Markendateien: NN-name.webp. Nur Adressen – die Bilder lädt der Browser erst bei Bedarf.
const coverFiles = import.meta.glob('../assets/taleward/covers/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const imageFor = (nr: string) => coverFiles[Object.keys(coverFiles).find((k) => k.split('/').pop()!.startsWith(`${nr}-`)) ?? ''];

// Nummer der Datei → feste ID (die IDs speichert der Server, sie dürfen sich nie ändern) und Anzeigename
const TABLE: [string, string, string, Scene?][] = [
  ['01', 'meadow', tk('Wiese'), meadow],
  ['02', 'forest', tk('Wald'), forest],
  ['03', 'desert', tk('Wüste'), desert],
  ['04', 'city', tk('Stadt'), city],
  ['05', 'cyber', tk('Cyberstadt'), cyber],
  ['06', 'mountains', tk('Gebirge'), mountains],
  ['07', 'coast', tk('Küste'), coast],
  ['08', 'swamp', tk('Moor'), swamp],
  ['09', 'dungeon', tk('Gewölbe'), dungeon],
  ['10', 'space', tk('Weltraum'), space],
  ['11', 'castle', tk('Burg'), castle],
  ['12', 'dark-fantasy', tk('Dark Fantasy')],
  ['13', 'moonwood', tk('Mondwald')],
  ['14', 'ancient-ruins', tk('Alte Ruinen')],
  ['15', 'tavern', tk('Taverne')],
  ['16', 'battlefield', tk('Schlachtfeld')],
  ['17', 'frozen-north', tk('Eisiger Norden')],
  ['18', 'arcane-ruins', tk('Arkane Ruinen')],
  ['19', 'fairy-wilds', tk('Feenwildnis')],
  ['20', 'underworld', tk('Unterreich')],
  ['21', 'storm-coast', tk('Sturmküste')],
  ['22', 'steampunk', tk('Steampunk')],
  ['23', 'post-apocalypse', tk('Post-Apokalypse')],
  ['24', 'western', tk('Western')],
  ['25', 'noir', tk('Noir')],
  ['26', 'space-opera', tk('Space Opera')],
  ['27', 'orient', tk('Orient')],
  ['28', 'necropolis', tk('Nekropole')],
  ['29', 'manor', tk('Herrenhaus')],
  // 30 und 31 frei
  ['32', 'riverside-mystery', tk('Flussufer-Mysterium')]
];

export const COVER_PRESETS: CoverPreset[] = TABLE
  .map(([nr, id, label, Scene]) => ({ id, label, image: imageFor(nr), Scene }))
  .filter((p) => p.image || p.Scene);

export const findPreset = (id: string | null | undefined) => COVER_PRESETS.find((p) => p.id === id);

/** Motiv zeichnen: Bild, sonst Ersatzzeichnung */
export function PresetImage({ preset, alt = '' }: { preset: CoverPreset; alt?: string }) {
  if (preset.image) {
    return <img src={preset.image} alt={alt} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />;
  }
  return preset.Scene ? <preset.Scene /> : null;
}
