/*
 * Zwei Stände desselben Charakters zusammenführen (Charakter-Datei, Sicherung). Ohne Laufzeit-Importe, damit der Test
 * (scripts/tests/character-merge.test.mjs) die Datei direkt laden kann.
 *
 * - Stammdaten, Bild und private Notizen: der neuere Stand (updatedAt) gewinnt.
 * - Mitgebrachte Welt: beide Listen vereinigt, je Eintrag gewinnt die höhere Version.
 * - Abschriften: beide vereinigt, je Kampagne gewinnt die jüngere Abschrift.
 * - Verknüpfungen mit Kampagnen: vereinigt, nur zu Servern, die dieses Gerät kennt.
 */
import type { CharacterLink, StoredCharacter } from './store';

export type MergeOutcome = 'added' | 'updated' | 'unchanged';

const time = (s: string | null | undefined) => (s ? Date.parse(s) || 0 : 0);

export function mergeCharacter(
  old: StoredCharacter | undefined,
  incoming: StoredCharacter,
  knownConnIds: Set<string>
): { result: StoredCharacter; outcome: MergeOutcome } {
  const links = (list: CharacterLink[]) => list.filter((l) => l && knownConnIds.has(l.connId));
  if (!old) return { result: { ...incoming, links: links(incoming.links) }, outcome: 'added' };

  const newer = time(incoming.updatedAt) > time(old.updatedAt);
  const base = newer ? incoming : old;

  const world = new Map(old.world.map((w) => [w.id, w]));
  for (const w of incoming.world) {
    const have = world.get(w.id);
    if (!have || w.version > have.version) world.set(w.id, w);
  }

  const chronicles = { ...old.chronicles };
  for (const [k, ch] of Object.entries(incoming.chronicles)) {
    if (!chronicles[k] || time(ch.takenAt) > time(chronicles[k].takenAt)) chronicles[k] = ch;
  }

  const allLinks = [...old.links];
  for (const l of links(incoming.links)) {
    if (!allLinks.some((x) => x.connId === l.connId && x.campaignId === l.campaignId)) allLinks.push(l);
  }

  const result: StoredCharacter = {
    ...base,
    id: old.id,
    version: Math.max(old.version, incoming.version),
    world: [...world.values()],
    chronicles,
    links: allLinks,
    createdAt: time(old.createdAt) && time(old.createdAt) <= time(incoming.createdAt) ? old.createdAt : incoming.createdAt,
    owners: old.owners
  };

  const changed = newer
    || result.world.length !== old.world.length
    || result.world.some((w) => old.world.find((x) => x.id === w.id)?.version !== w.version)
    || Object.keys(chronicles).some((k) => chronicles[k] !== old.chronicles[k])
    || allLinks.length !== old.links.length;
  return { result: changed ? result : old, outcome: changed ? 'updated' : 'unchanged' };
}
