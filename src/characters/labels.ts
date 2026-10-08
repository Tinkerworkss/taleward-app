import type { CharacterStatus, WorldEntryStatus } from '../api/types';
import { t, tk } from '../i18n';
import type { CharacterLink, WorldItem } from './store';

export const STATUS_LABEL: Record<CharacterStatus, string> = {
  active: tk('Aktiv'),
  retired: tk('Im Ruhestand'),
  deceased: tk('Verstorben')
};

/** Kurze Namen für den Filter in „Meine Charaktere“ (passt auch auf schmale Handys) */
export const STATUS_FILTER_LABEL: Record<CharacterStatus, string> = {
  active: tk('Aktiv'),
  retired: tk('Ruhestand'),
  deceased: tk('Verstorben')
};

/** Stand eines mitgebrachten Eintrags in einer Kampagne, in Worten (null = noch nicht geschickt) */
export function worldState(item: WorldItem, link: CharacterLink): { label: string; tone: 'seal' | 'ok' | 'muted' } | null {
  const sent = link.submitted?.[item.id];
  if (!sent) return null;
  const s: WorldEntryStatus | undefined = link.world?.find((w) => w.id === item.id);
  const newer = item.version > sent;
  if (!s) return { label: t('Geschickt'), tone: 'muted' };
  if (s.state === 'pending') return { label: newer ? t('Geändert – noch nicht geschickt') : t('Liegt bei der SL'), tone: 'muted' };
  if (s.state === 'rejected') return { label: t('Nicht übernommen'), tone: 'muted' };
  if (newer) return { label: t('Geändert – noch nicht geschickt'), tone: 'seal' };
  return { label: t('In der Bibel'), tone: 'ok' };
}
