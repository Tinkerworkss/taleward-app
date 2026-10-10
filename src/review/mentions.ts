/*
 * Kommt ein Vorschlag (z. B. „Hauptfrau Veyra Dornfeld“, „Das gestohlene Siegel“) in einem Absatz vor? Für die
 * Hervorhebung im Arbeitsplatz. Gesucht werden die großgeschriebenen Wörter des Titels ab 4 Buchstaben, ohne
 * Artikel – „Veyra“ oder „Dornfeld“ genügt. Ohne Laufzeit-Importe (Test: scripts/tests/mentions.test.mjs).
 */
const SKIP = new Set(['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'the', 'and', 'von', 'und']);

/** Prüffunktion für Absätze; null, wenn der Titel nichts Brauchbares enthält */
export function mentions(title: string): ((paragraph: string) => boolean) | null {
  const words = (title.match(/[\p{Lu}][\p{L}'-]{3,}/gu) ?? []).filter((w) => !SKIP.has(w.toLowerCase()));
  if (!words.length) return null;
  const tests = words.map((w) => new RegExp(`(^|[^\\p{L}])${w.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')}`, 'u'));
  return (paragraph) => tests.some((re) => re.test(paragraph));
}
