/*
 * SL-Schirm: Welche Spalten mit welchem Inhalt. Gilt je Gerät (Tablet und Laptop wollen oft Verschiedenes) und bleibt
 * nur im Speicher dieses Geräts.
 */
import { tk } from '../i18n';

export type PanelId = 'plan' | 'docs' | 'bible' | 'group';

export const PANELS: { id: PanelId; label: string }[] = [
  { id: 'plan', label: tk('Kapitelplan') },
  { id: 'docs', label: tk('Unterlagen') },
  { id: 'bible', label: tk('Bibel') },
  { id: 'group', label: tk('Die Gruppe') }
];

const KEY = 'taleward.slSchirm';
const DEFAULT: PanelId[] = ['plan', 'bible', 'group'];

export function loadLayout(): PanelId[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (Array.isArray(raw) && raw.length >= 1 && raw.length <= 3 && raw.every((x) => PANELS.some((p) => p.id === x))) return raw;
  } catch { /* Standard */ }
  return DEFAULT;
}

export function saveLayout(layout: PanelId[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(layout)); } catch { /* egal */ }
}
