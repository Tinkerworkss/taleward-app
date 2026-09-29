import type { Member } from '../api/types';
import { t } from '../i18n';

/**
 * Mehrfachauswahl von Spielern mit „Alle“: „Alle“ setzt bzw. löscht alle Haken;
 * wer einen einzelnen Spieler abwählt, wählt damit auch „Alle“ ab.
 */
export function PlayerPicker({ players, selected, onChange }: {
  players: Member[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const all = players.length > 0 && players.every((m) => selected.includes(m.id));
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <div>
      <label className="check" style={{ fontWeight: 700 }}>
        <input type="checkbox" checked={all} onChange={() => onChange(all ? [] : players.map((m) => m.id))} />
        <span>{t('Alle')}</span>
      </label>
      {players.map((m) => (
        <label key={m.id} className="check" style={{ paddingLeft: 24 }}>
          <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} />
          <span>{m.characterName ?? m.displayName} <span className="muted small">· {m.displayName}</span></span>
        </label>
      ))}
    </div>
  );
}
