/**
 * Hauptknöpfe bleiben antippbar. Fehlt noch etwas, sagt diese Zeile nach dem Tippen, was – statt eines grauen
 * Knopfs ohne Begründung. text = null: nichts fehlt; shown = erst nach dem ersten Versuch zeigen.
 */
export function Missing({ text, shown }: { text: string | null; shown: boolean }) {
  if (!text || !shown) return null;
  return <span className="small missing" role="status">{text}</span>;
}
