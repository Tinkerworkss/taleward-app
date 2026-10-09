/*
 * Kennungen in Pfaden (Schnittstelle 0.4.14): nur Buchstaben, Ziffern, „-“ und „_“, höchstens 64 Zeichen. Pfade baut
 * die App nur aus solchen Teilen. Ohne Laufzeit-Importe (Test: scripts/tests/path-guard.test.mjs).
 */

export const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** Ist das eine gültige Kennung? */
export function isSafeId(id: unknown): id is string {
  return typeof id === 'string' && ID_PATTERN.test(id);
}

/** Ist der Pfad (vor „?“) aus lauter harmlosen Teilen gebaut? Erlaubt sind Buchstaben, Ziffern, „-“, „_“ und „.“ (nicht allein). */
export function isSafePath(path: string): boolean {
  const [pathOnly] = path.split('?');
  if (!pathOnly.startsWith('/')) return false;
  return pathOnly.slice(1).split('/').every((seg) => /^[A-Za-z0-9_.-]+$/.test(seg) && seg !== '.' && seg !== '..');
}
