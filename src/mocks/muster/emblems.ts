/*
 * Wappen der Musterkampagne statt Gesichtern: schlichte Zeichen in Pergament und Messing auf der Farbe des Charakters.
 */
import type { MusterCharacter } from './types';

const P = '#f2e8d5';
const M = '#c49235';

const SHAPES: Record<MusterCharacter['emblem']['shape'], string> = {
  // Drei geknotete Schilfhalme
  reeds: `<g stroke="${P}" stroke-width="10" stroke-linecap="round" fill="none"><path d="M110 250 C112 190 104 130 96 64"/><path d="M150 250 L150 56"/><path d="M190 250 C188 190 196 130 204 64"/></g>`
    + `<path d="M96 150 C120 132 180 132 204 150 C180 170 120 170 96 150Z" fill="${M}"/><ellipse cx="94" cy="70" rx="10" ry="24" transform="rotate(-8 94 70)" fill="${M}"/><ellipse cx="150" cy="58" rx="10" ry="26" fill="${M}"/><ellipse cx="206" cy="70" rx="10" ry="24" transform="rotate(8 206 70)" fill="${M}"/>`,
  // Schreibfeder über einem offenen Buch
  quill: `<path d="M64 196 C100 180 132 182 150 200 C168 182 200 180 236 196 L236 244 C200 230 168 232 150 248 C132 232 100 230 64 244Z" fill="${P}"/><path d="M150 200 L150 248" stroke="${M}" stroke-width="6"/>`
    + `<path d="M214 52 C156 70 122 120 112 186 L124 188 C138 148 158 118 194 92 C176 120 160 146 146 176 C186 152 220 108 214 52Z" fill="${M}"/>`,
  // Posttasche über zwei gekreuzten Wanderstäben
  satchel: `<path d="M70 250 L230 60 M230 250 L70 60" stroke="${M}" stroke-width="12" stroke-linecap="round"/>`
    + `<rect x="88" y="118" width="124" height="96" rx="14" fill="${P}"/><path d="M88 132 C88 120 98 112 110 112 L190 112 C202 112 212 120 212 132 L212 160 L88 160Z" fill="${M}"/><circle cx="150" cy="160" r="9" fill="${P}"/>`
    + `<path d="M108 112 C108 76 192 76 192 112" stroke="${P}" stroke-width="8" fill="none"/>`,
  // Mörser mit Distelzweig
  mortar: `<path d="M150 150 L196 60" stroke="${P}" stroke-width="10" stroke-linecap="round"/><circle cx="198" cy="56" r="16" fill="${M}"/><path d="M186 44 L180 30 M198 40 L198 24 M210 44 L216 30" stroke="${M}" stroke-width="6" stroke-linecap="round"/>`
    + `<path d="M76 140 L224 140 C222 196 192 230 150 230 C108 230 78 196 76 140Z" fill="${P}"/><rect x="112" y="228" width="76" height="20" rx="6" fill="${P}"/><path d="M76 140 L224 140" stroke="${M}" stroke-width="8"/>`,
  // Kochlöffel quer über einem Kessel
  spoon: `<path d="M70 132 L230 132 C230 196 196 236 150 236 C104 236 70 196 70 132Z" fill="${P}"/><path d="M62 132 L238 132" stroke="${M}" stroke-width="10" stroke-linecap="round"/>`
    + `<path d="M96 236 L86 256 M204 236 L214 256" stroke="${P}" stroke-width="10" stroke-linecap="round"/><path d="M92 210 L206 72" stroke="${M}" stroke-width="10" stroke-linecap="round"/><ellipse cx="214" cy="62" rx="18" ry="26" transform="rotate(40 214 62)" fill="${M}"/>`,
  // Halb geöffneter Schlagbaum
  barrier: `<rect x="70" y="120" width="28" height="130" rx="6" fill="${P}"/><rect x="58" y="238" width="52" height="16" rx="4" fill="${P}"/><circle cx="84" cy="132" r="14" fill="${M}"/>`
    + `<g transform="rotate(-28 84 132)"><rect x="84" y="122" width="160" height="22" rx="6" fill="${P}"/><rect x="118" y="122" width="22" height="22" fill="${M}"/><rect x="170" y="122" width="22" height="22" fill="${M}"/><rect x="222" y="122" width="22" height="22" fill="${M}"/></g>`
};

export function emblemSvg(e: MusterCharacter['emblem']): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="${e.color}"/>${SHAPES[e.shape]}</svg>`;
}

export const emblemBuffer = (e: MusterCharacter['emblem']) => new TextEncoder().encode(emblemSvg(e)).buffer as ArrayBuffer;
export const emblemDataUrl = (e: MusterCharacter['emblem']) => `data:image/svg+xml;base64,${btoa(emblemSvg(e))}`;
