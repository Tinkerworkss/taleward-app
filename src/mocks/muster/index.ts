/*
 * Musterkampagne „Die leisen Wasser“: Texte je Sprache, aus zwei Teilen zusammengesetzt. Spielfiguren in den Sammlungen
 * bekommen ihren Hintergrund aus den Mitgliedsdaten, damit er nur an einer Stelle steht.
 */
import type { MusterText, MusterTextA, MusterTextB } from './types';
import { deA } from './de-a';
import { deB } from './de-b';
import { enA } from './en-a';
import { enB } from './en-b';

function join(a: MusterTextA, b: MusterTextB): MusterText {
  const collections = Object.fromEntries(Object.entries(b.collections).map(([who, list]) => [who,
    list.map((c) => (c.inCampaign ? { ...c, backstory: a.members[who as keyof typeof a.members].backstory } : c))])) as MusterText['collections'];
  return { ...a, ...b, collections };
}

export const musterText: Record<'de' | 'en', MusterText> = { de: join(deA, deB), en: join(enA, enB) };
