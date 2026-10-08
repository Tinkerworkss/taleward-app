/*
 * Fehlertolerante Namenssuche „Wer war das?“: findet „Kasmyrin“ auch bei „Kasmürin“ oder „kasmirin“.
 * Läuft nur über das, was die App ohnehin hat (die Liste, die der Server dieser Person zeigt) – kein Spoiler.
 */

/** Kleinbuchstaben, Umlaute und Akzente vereinfacht, y/i und ph/f gleichgesetzt */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/y/g, 'i').replace(/ph/g, 'f').replace(/th/g, 't')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Bearbeitungsabstand (Levenshtein), bricht ab, sobald er größer als max wird */
export function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Wie gut passt die Suche zu einem Text? 0 = gar nicht, 3 = enthält die Suche wörtlich, 2 = nach Vereinfachung,
 * 1 = ein Wort ist nur leicht verschrieben (bis 1 Fehler bei kurzen, bis 2 bei längeren Wörtern).
 */
export function matchScore(query: string, text: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  if (text.toLowerCase().includes(q)) return 3;
  const fq = fold(q);
  const ft = fold(text);
  if (!fq) return 0;
  if (ft.includes(fq)) return 2;
  const words = ft.split(' ');
  const parts = fq.split(' ').filter((w) => w.length >= 3);
  if (!parts.length) return 0;
  const ok = parts.every((p) => {
    const max = p.length >= 7 ? 2 : 1;
    return words.some((w) => distance(p, w, max) <= max || (w.length > p.length && distance(p, w.slice(0, p.length), 1) <= 1));
  });
  return ok ? 1 : 0;
}

/** Filtert und sortiert: wörtliche Treffer zuerst, dann vereinfachte, dann leicht verschriebene */
export function fuzzyFilter<T>(items: T[], query: string, fields: (item: T) => string[]): T[] {
  if (!query.trim()) return items;
  return items
    .map((item) => {
      const [name, ...rest] = fields(item);
      // Treffer im Namen zählen mehr als in Beschreibung oder Notizen
      const s = Math.max(matchScore(query, name ?? '') * 2, ...rest.map((r) => matchScore(query, r ?? '')));
      return { item, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.item);
}
