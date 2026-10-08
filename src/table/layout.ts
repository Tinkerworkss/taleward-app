/*
 * SL-Schirm: ein Raster aus 6 × 5 Feldern. Jede Karte belegt ein Rechteck darin (mindestens 2 Felder breit = ein
 * Drittel, mindestens 1 Feld hoch), Karten überlappen nie. Jede Ansicht (Modul) liegt höchstens einmal auf dem Schirm.
 * Gilt je Gerät (Tablet und Laptop wollen oft Verschiedenes) und bleibt nur im Speicher dieses Geräts.
 */
// Ohne Importe, damit die Tests (scripts/tests/table-layout.test.mjs) die Datei direkt laden können

/** Neue Module hier eintragen, dazu in TablePage einen Namen (LABELS) und einen Fall in panel() */
export const PANEL_IDS = ['plan', 'docs', 'bible', 'group', 'notes', 'clock', 'links'] as const;
export type PanelId = (typeof PANEL_IDS)[number];

/** Breite in Feldern: 2 = ein Drittel, 3 = die Hälfte, 4 = zwei Drittel, 6 = ganz */
export const GRID_COLS = 6;
export const GRID_ROWS = 5;
export const MIN_W = 2;
export const MIN_H = 1;

export interface CardPos {
  id: PanelId;
  x: number;
  y: number;
  w: number;
  h: number;
}
export type Layout = CardPos[];

const KEY = 'taleward.slSchirm';
const known = (x: unknown): x is PanelId => (PANEL_IDS as readonly unknown[]).includes(x);

export function defaultLayout(): Layout {
  return [
    { id: 'plan', x: 0, y: 0, w: 2, h: 5 },
    { id: 'bible', x: 2, y: 0, w: 2, h: 5 },
    { id: 'group', x: 4, y: 0, w: 2, h: 5 }
  ];
}

/** Liegt die Karte im Raster und überdeckt keine andere? */
export function fits(layout: Layout, c: CardPos): boolean {
  if (c.x < 0 || c.y < 0 || c.w < MIN_W || c.h < MIN_H || c.x + c.w > GRID_COLS || c.y + c.h > GRID_ROWS) return false;
  return layout.every((o) => o.id === c.id || o.x >= c.x + c.w || c.x >= o.x + o.w || o.y >= c.y + c.h || c.y >= o.y + o.h);
}

/** Erster freier Platz für eine Karte der Größe w × h (von oben links), sonst null */
export function firstFree(layout: Layout, id: PanelId, w = MIN_W, h = MIN_H): CardPos | null {
  for (let y = 0; y + h <= GRID_ROWS; y++) {
    for (let x = 0; x + w <= GRID_COLS; x++) {
      const c = { id, x, y, w, h };
      if (fits(layout, c)) return c;
    }
  }
  return null;
}

/** Ältere Form (Spalten mit Karten übereinander) ins Raster übertragen */
function fromColumns(cols: unknown[][]): Layout {
  const usable = cols.slice(0, 3);
  const w = GRID_COLS / usable.length;
  const out: Layout = [];
  usable.forEach((col, ci) => {
    const ids = col.filter(known).slice(0, GRID_ROWS);
    let y = 0;
    ids.forEach((id, i) => {
      // Zeilen gleichmäßig verteilen, der Rest geht an die oberen Karten
      const h = Math.floor(GRID_ROWS / ids.length) + (i < GRID_ROWS % ids.length ? 1 : 0);
      out.push({ id, x: ci * w, y, w, h });
      y += h;
    });
  });
  return out;
}

/** Bringt jede gespeicherte Form in Ordnung: alte Formen werden übernommen, Ungültiges, Doppeltes und Überlappendes fällt weg */
export function normalizeLayout(raw: unknown): Layout {
  let cards: unknown[] = [];
  if (Array.isArray(raw) && raw.length && raw.every((c) => Array.isArray(c) || typeof c === 'string')) {
    cards = fromColumns(raw.map((c) => (Array.isArray(c) ? c : [c])));
  } else if (Array.isArray(raw)) {
    cards = raw;
  }
  const out: Layout = [];
  for (const c of cards) {
    if (!c || typeof c !== 'object') continue;
    const { id, x, y, w, h } = c as Record<string, unknown>;
    if (!known(id) || out.some((o) => o.id === id)) continue;
    if (![x, y, w, h].every((n) => Number.isInteger(n))) continue;
    const pos = { id, x: x as number, y: y as number, w: w as number, h: h as number };
    if (fits(out, pos)) out.push(pos);
  }
  return out.length ? out : defaultLayout();
}

export function loadLayout(): Layout {
  try {
    return normalizeLayout(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
  } catch {
    return defaultLayout();
  }
}

export function saveLayout(layout: Layout): void {
  try { localStorage.setItem(KEY, JSON.stringify(layout)); } catch { /* egal */ }
}

/** Module, die noch auf keiner Karte liegen */
export function unusedPanels(layout: Layout): PanelId[] {
  return PANEL_IDS.filter((id) => !layout.some((c) => c.id === id));
}

/** Eine Karte ändern, wenn das Ergebnis passt; sonst bleibt alles, wie es war */
export function tryChange(layout: Layout, id: PanelId, change: Partial<Omit<CardPos, 'id'>>): Layout | null {
  const card = layout.find((c) => c.id === id);
  if (!card) return null;
  const next = { ...card, ...change };
  return fits(layout, next) ? layout.map((c) => (c.id === id ? next : c)) : null;
}

/** Reihenfolge zum Lesen (schmale Bildschirme, Screenreader): Zeile für Zeile, links nach rechts */
export function readingOrder(layout: Layout): Layout {
  return [...layout].sort((a, b) => a.y - b.y || a.x - b.x);
}

/**
 * Platz für ein weiteres Modul schaffen: erst ein freier Platz; sonst wird die größte Karte, die es verträgt, um eine
 * Zeile niedriger (oder ein Drittel schmaler) und das neue Modul kommt in die frei gewordene Lücke. null, wenn
 * wirklich nichts mehr geht (alle Karten schon so klein wie möglich).
 */
export function placeNew(layout: Layout, id: PanelId): Layout | null {
  const free = firstFree(layout, id);
  if (free) return [...layout, free];
  const bySize = [...layout].sort((a, b) => b.w * b.h - a.w * a.h || a.y - b.y || a.x - b.x);
  for (const c of bySize) {
    const tries: [Partial<CardPos>, CardPos][] = [
      [{ h: c.h - 1 }, { id, x: c.x, y: c.y + c.h - 1, w: c.w, h: 1 }],
      [{ w: c.w - MIN_W }, { id, x: c.x + c.w - MIN_W, y: c.y, w: MIN_W, h: c.h }]
    ];
    for (const [change, card] of tries) {
      const smaller = tryChange(layout, c.id, change);
      if (smaller && fits(smaller, card)) return [...smaller, card];
    }
  }
  return null;
}
