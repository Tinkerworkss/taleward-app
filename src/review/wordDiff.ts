/*
 * Wortvergleich für den Korrektur-Entwurf (Schnittstelle 0.4.15): alter und neuer Absatz als Folge von Stücken
 * „gleich“, „gestrichen“, „neu“ – wie eine Korrektur auf Papier. Wörter samt folgendem Leerraum, damit der Text beim
 * Zusammensetzen unverändert bleibt. Ohne Laufzeit-Importe (Test: scripts/tests/word-diff.test.mjs).
 */

export type DiffPart = { kind: 'same' | 'del' | 'ins'; text: string };

/** Text in Wörter mit anhängendem Leerraum zerlegen */
function tokens(s: string): string[] {
  return s.match(/\S+\s*|\s+/g) ?? [];
}

/** Vergleich über die längste gemeinsame Teilfolge; benachbarte Stücke gleicher Art werden zusammengefasst */
export function wordDiff(before: string, after: string): DiffPart[] {
  const a = tokens(before);
  const b = tokens(after);
  const key = (w: string) => w.trim();
  // Tabelle der Längen gemeinsamer Teilfolgen (Absätze sind kurz, quadratisch reicht)
  const n = a.length, m = b.length;
  const len: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      len[i][j] = key(a[i]) === key(b[j]) ? len[i + 1][j + 1] + 1 : Math.max(len[i + 1][j], len[i][j + 1]);
    }
  }
  const out: DiffPart[] = [];
  const push = (kind: DiffPart['kind'], text: string) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text;
    else out.push({ kind, text });
  };
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (key(a[i]) === key(b[j])) { push('same', b[j]); i++; j++; }
    else if (len[i + 1][j] >= len[i][j + 1]) push('del', a[i++]);
    else push('ins', b[j++]);
  }
  while (i < n) push('del', a[i++]);
  while (j < m) push('ins', b[j++]);
  return out;
}
