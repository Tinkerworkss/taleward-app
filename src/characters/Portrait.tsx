import type { PortraitMeta } from './store';

const COLORS = ['var(--tinte)', '#3d6a48', '#6b4a6e', '#5d6b8a', '#7a5a2f'];

function colorFor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

/** Charakterbild aus der Sammlung im Kreis (Ausschnitt wie gewählt); ohne Bild der Anfangsbuchstabe. */
export function CharacterPortrait({ id, name, portrait, meta, size = 56, faded }: {
  id: string;
  name: string;
  portrait: string | null | undefined;
  meta?: PortraitMeta | null;
  size?: number;
  /** Im Ruhestand oder verstorben: etwas zurückgenommen */
  faded?: boolean;
}) {
  const base = {
    width: size, height: size, flexShrink: 0, borderRadius: '50%', overflow: 'hidden',
    border: '2px solid var(--paper-raised)', boxShadow: '0 0 0 1px var(--line)',
    filter: faded ? 'grayscale(0.7)' : undefined, opacity: faded ? 0.85 : 1
  } as const;
  if (!portrait) {
    return (
      <span aria-hidden style={{
        ...base, display: 'grid', placeItems: 'center', background: colorFor(id), color: '#f3f3ee',
        fontFamily: 'var(--font-serif)', fontWeight: 800, fontSize: Math.round(size * 0.45)
      }}>
        {name.trim().charAt(0).toUpperCase() || '?'}
      </span>
    );
  }
  const crop = meta?.crop;
  const f = crop ? size / crop.size : 0;
  return (
    <span aria-hidden style={{
      ...base, display: 'block', backgroundImage: `url(${portrait})`, backgroundRepeat: 'no-repeat',
      ...(crop && meta
        ? { backgroundSize: `${meta.w * f}px ${meta.h * f}px`, backgroundPosition: `${-crop.x * f}px ${-crop.y * f}px` }
        : { backgroundSize: 'cover', backgroundPosition: 'center' })
    }} />
  );
}
