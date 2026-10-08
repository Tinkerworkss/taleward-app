/*
 * SL-Schirm: bis zu 3 Spalten mit je bis zu 5 Karten. Jede Ansicht (Modul) liegt höchstens einmal auf dem Schirm.
 * Gilt je Gerät (Tablet und Laptop wollen oft Verschiedenes) und bleibt nur im Speicher dieses Geräts.
 */
// Ohne Importe, damit die Tests (scripts/tests/table-layout.test.mjs) die Datei direkt laden können

/** Neue Module hier eintragen und in TablePage (MODULES) eine kleine und eine große Ansicht dazu */
export const PANEL_IDS = ['plan', 'docs', 'bible', 'group'] as const;
export type PanelId = (typeof PANEL_IDS)[number];
/** Spalten von links nach rechts, je Spalte die Karten von oben nach unten */
export type Layout = PanelId[][];

export const MAX_COLUMNS = 3;
export const MAX_CARDS = 5;

const KEY = 'taleward.slSchirm';
const DEFAULT: Layout = [['plan'], ['bible'], ['group']];
const known = (x: unknown): x is PanelId => (PANEL_IDS as readonly unknown[]).includes(x);

/** Bringt jede gespeicherte Form in Ordnung: alte Liste (eine Karte je Spalte), Unbekanntes und Doppeltes fallen weg */
export function normalizeLayout(raw: unknown): Layout {
  if (!Array.isArray(raw)) return DEFAULT;
  const seen = new Set<PanelId>();
  const cols = raw.slice(0, MAX_COLUMNS).map((col) => (Array.isArray(col) ? col : [col])
    .filter((x): x is PanelId => known(x) && !seen.has(x) && !!seen.add(x))
    .slice(0, MAX_CARDS));
  const kept = cols.filter((c) => c.length > 0);
  return kept.length ? kept : DEFAULT;
}

export function loadLayout(): Layout {
  try {
    return normalizeLayout(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
  } catch {
    return DEFAULT;
  }
}

export function saveLayout(layout: Layout): void {
  try { localStorage.setItem(KEY, JSON.stringify(layout)); } catch { /* egal */ }
}

/** Module, die noch auf keiner Karte liegen */
export function unusedPanels(layout: Layout): PanelId[] {
  const used = new Set(layout.flat());
  return PANEL_IDS.filter((id) => !used.has(id));
}
