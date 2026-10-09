/*
 * Wie die App eine Unterlage anzeigt: nach der Dateiendung PDF oder Text, alles andere zum Speichern
 * (Schnittstelle 0.4.14). Ohne Laufzeit-Importe (Test: doc-kind.test.mjs).
 */
export function originalKind(fileName: string): 'application/pdf' | 'text/plain;charset=utf-8' | null {
  if (/\.pdf$/i.test(fileName)) return 'application/pdf';
  if (/\.(txt|md)$/i.test(fileName)) return 'text/plain;charset=utf-8';
  return null;
}

/** Dateiname zum Speichern ohne Pfadteile und Sonderzeichen */
export function downloadName(fileName: string): string {
  return fileName.replace(/[\\/:*?"<>|\x00-\x1f]+/g, '_').replace(/^\.+/, '') || 'unterlage';
}
