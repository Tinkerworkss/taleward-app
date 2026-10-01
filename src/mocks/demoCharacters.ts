/*
 * Charaktere der Demo „Die leisen Wasser“ (Schnittstelle 0.4.7): Wappen-Bilder statt Gesichter, mitgebrachte Welt
 * von Mara und Tavin, Sammlungen für die Aufnahmen. Alles erfunden.
 */
import type { Entry, Member, Proposal } from '../api/types';
import type { StoredCharacter } from '../characters/store';
import { entries, portraits, proposals, world } from './db';

type Lang = 'de' | 'en';

/** Schlichte Wappen (300 × 300) in den Markenfarben */
const SHAPES = {
  compass: '<circle cx="150" cy="150" r="78" fill="none" stroke="#f2e8d5" stroke-width="10"/><path d="M150 62 L172 150 L150 238 L128 150Z" fill="#f2e8d5"/><path d="M150 62 L172 150 L128 150Z" fill="#c49235"/><circle cx="150" cy="150" r="10" fill="#17313b"/>',
  quill: '<path d="M206 58 C140 80 104 140 96 214 L110 214 C126 168 150 128 190 100 C170 132 150 160 132 196 C176 170 214 120 206 58Z" fill="#f2e8d5"/><path d="M96 214 L84 246" stroke="#c49235" stroke-width="9" stroke-linecap="round"/>',
  leaf: '<path d="M150 56 C220 96 226 186 150 244 C74 186 80 96 150 56Z" fill="#f2e8d5"/><path d="M150 84 L150 236 M150 130 L118 108 M150 160 L184 136 M150 192 L120 170" stroke="#3d6a48" stroke-width="7" stroke-linecap="round" fill="none"/>',
  shield: '<path d="M150 58 L226 86 C226 160 200 214 150 242 C100 214 74 160 74 86Z" fill="#f2e8d5"/><path d="M150 58 L150 242 M74 128 L226 128" stroke="#c49235" stroke-width="10"/>'
};

function emblem(shape: keyof typeof SHAPES, bg: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="${bg}"/>${SHAPES[shape]}</svg>`;
}
const asBuffer = (svg: string) => new TextEncoder().encode(svg).buffer as ArrayBuffer;
const asDataUrl = (svg: string) => `data:image/svg+xml;base64,${btoa(svg)}`;

const MARA = emblem('compass', '#2c5361');
const TAVIN = emblem('quill', '#6b4a6e');
const ILSA = emblem('leaf', '#3d6a48');
const EDDA = emblem('shield', '#7a5a2f');

const TX = {
  de: {
    maraSummary: 'Kundschafterin aus Grauwehr. Spricht wenig, sieht viel.',
    maraBack: 'Ist aus Hohenwacht geflohen, nachdem ihre Mutter im Archiv verschwand. Sucht seitdem nach Spuren.',
    maraNotes: 'Oren trägt einen Siegelring des Archivs – wie Mutter. Nicht vor Tavin erwähnen.',
    tavinSummary: 'Wandernder Schreiber',
    tavinBack: 'Hat im Archiv von Hohenwacht gelernt und eine Abschrift mitgenommen, die er nicht hätte haben dürfen.',
    brann: ['Onkel Brann', 'Fischer in Grauwehr. Hat Mara das Spurenlesen beigebracht und kennt jeden Pfad durchs Moor.'],
    compass: ['Kompass der Mutter', 'Zeigt nicht nach Norden, sondern immer zum Archiv von Hohenwacht. Mara weiß nicht, warum.'],
    reed: ['Die Schilfgänger', 'Kundschafter, die im Moor Wege markieren. Mara war zwei Jahre bei ihnen.'],
    aldo: ['Meister Aldo Fenn', 'Tavins Lehrmeister im Archiv von Hohenwacht. Seit dem Frühjahr verschwunden.'],
    ilsa: ['Ilsa Dorn', 'Kräuterkundige mit spitzer Zunge.', 'Das Schwarze Auge'],
    edda: ['Edda Krumm', 'Köchin einer Söldnertruppe, jetzt mit eigenem Gasthaus.', 'D&D 5e'],
    fenna: ['Fenna Graufell', 'Grenzwächterin, die lieber Fragen stellt als Befehle befolgt.', 'Das Schwarze Auge']
  },
  en: {
    maraSummary: 'Scout from Grauwehr. Says little, sees a lot.',
    maraBack: 'Fled Hohenwacht after her mother vanished in the archive. Has been looking for traces ever since.',
    maraNotes: "Oren wears an archive seal ring – just like Mother's. Don't mention it in front of Tavin.",
    tavinSummary: 'Wandering scribe',
    tavinBack: 'Trained at the Hohenwacht archive and took a copy with him that he should never have had.',
    brann: ['Uncle Brann', 'Fisherman in Grauwehr. Taught Mara to read tracks and knows every path through the moor.'],
    compass: ["Mother's compass", 'Points not north but always towards the Hohenwacht archive. Mara does not know why.'],
    reed: ['The Reedwalkers', 'Scouts who mark paths through the moor. Mara spent two years with them.'],
    aldo: ['Master Aldo Fenn', "Tavin's mentor at the Hohenwacht archive. Missing since spring."],
    ilsa: ['Ilsa Dorn', 'Herbalist with a sharp tongue.', 'The Dark Eye'],
    edda: ['Edda Krumm', 'Cook for a mercenary company, now running her own inn.', 'D&D 5e'],
    fenna: ['Fenna Graufell', 'Border warden who would rather ask questions than follow orders.', 'The Dark Eye']
  }
};

const ids = (lang: Lang) => {
  const c = lang === 'de' ? 'w' : 'q';
  return {
    campaign: lang === 'de' ? 'c-wasser' : 'c-waters', lea: `m-${c}-lea`, tom: `m-${c}-tom`,
    mara: `00000000-0000-4000-8000-00000000${lang === 'de' ? '0001' : '0101'}`,
    brann: `00000000-0000-4000-8000-00000000${lang === 'de' ? '0011' : '0111'}`,
    compass: `00000000-0000-4000-8000-00000000${lang === 'de' ? '0012' : '0112'}`,
    reed: `00000000-0000-4000-8000-00000000${lang === 'de' ? '0013' : '0113'}`,
    tavin: `00000000-0000-4000-8000-00000000${lang === 'de' ? '0002' : '0102'}`,
    aldo: `00000000-0000-4000-8000-00000000${lang === 'de' ? '0021' : '0121'}`
  };
};

/** Serverseite: Bilder, Charakter-Kennungen, Vorschläge aus mitgebrachter Welt, ein übernommener Eintrag */
export function seedDemoCharacters(lang: Lang, members: Member[]) {
  const x = TX[lang];
  const i = ids(lang);
  const at = '2026-09-12T10:00:00Z';
  portraits[i.lea] = { data: asBuffer(MARA), type: 'image/svg+xml', updatedAt: at };
  portraits[i.tom] = { data: asBuffer(TAVIN), type: 'image/svg+xml', updatedAt: at };
  const lea = members.find((m) => m.id === i.lea)!;
  // Tom spielt Tavin noch aus der Zeit vor der Sammlung (Altbestand) – so zeigt die Demo auch den Willkommens-Schritt
  Object.assign(lea, { portraitUpdatedAt: at, characterId: i.mara, characterVersion: 3, characterSummary: x.maraSummary, characterBackstory: x.maraBack });
  Object.assign(members.find((m) => m.id === i.tom)!, { portraitUpdatedAt: at, characterBackstory: x.tavinBack });

  const reedEntry: Entry = {
    id: `e-${i.campaign}-reed`, campaignId: i.campaign, type: 'faction', name: x.reed[0], summary: x.reed[1], visibility: 'public',
    status: null, holderMemberId: null, firstSessionNumber: null, lastSessionNumber: null, mentions: [], updatedAt: at
  } as Entry;
  entries.push(reedEntry);

  const prop = (key: string, by: string, origin: string, type: Proposal['entryType'], text: string[], hidden: string[], decision: Proposal['decision']): Proposal => ({
    id: `cp-${i.campaign}-${key}`, sessionId: null, documentId: null, source: 'character', originCharacterId: by === i.lea ? i.mara : i.tavin,
    originEntryId: origin, submittedByMemberId: by, entryType: type, action: 'create', targetEntryId: decision === 'accepted' ? reedEntry.id : null,
    title: text[0], detail: text[1], gmNotes: null, suggestedVisibility: 'public', hiddenFromMemberIds: hidden,
    confidence: 1, flags: [], evidence: [], decision
  } as Proposal);
  proposals.push(
    prop('brann', i.lea, i.brann, 'npc', x.brann, [], 'open'),
    prop('compass', i.lea, i.compass, 'item', x.compass, [i.tom], 'open'),
    prop('aldo', i.tom, i.aldo, 'npc', x.aldo, [], 'open'),
    prop('reed', i.lea, i.reed, 'faction', x.reed, [], 'accepted')
  );
  world[i.lea] = {
    [i.brann]: { id: i.brann, version: 1, proposalId: `cp-${i.campaign}-brann`, entryId: null, serverVersion: null },
    [i.compass]: { id: i.compass, version: 1, proposalId: `cp-${i.campaign}-compass`, entryId: null, serverVersion: null },
    [i.reed]: { id: i.reed, version: 1, proposalId: `cp-${i.campaign}-reed`, entryId: reedEntry.id, serverVersion: 1 }
  };
}

/** App-Seite: Sammlung für die Aufnahmen (lea oder tom), verknüpft mit der Demo-Kampagne auf connId */
export function demoCollection(lang: Lang, who: 'lea' | 'tom', connId: string, serverName = 'Taleward'): StoredCharacter[] {
  const x = TX[lang];
  const i = ids(lang);
  const title = lang === 'de' ? 'Die leisen Wasser' : 'The quiet waters';
  const base = { nickname: null, backstory: null, statusChangedAt: null, notes: '', portraitMeta: null, world: [], links: [], chronicles: {} };
  if (who === 'tom') {
    return [
      { ...base, id: i.tavin, version: 1, name: 'Tavin Rook', summary: x.tavinSummary, backstory: x.tavinBack, system: null, status: 'active',
        portrait: asDataUrl(TAVIN), portraitChangedAt: '2026-09-01T10:00:00Z',
        world: [{ id: i.aldo, version: 1, type: 'npc', name: x.aldo[0], summary: x.aldo[1], secret: false }],
        createdAt: '2026-09-01T10:00:00Z', updatedAt: '2026-09-21T10:00:00Z' },
      { ...base, id: 'demo-fenna-' + lang, version: 2, name: x.fenna[0], summary: x.fenna[1], system: x.fenna[2], status: 'active',
        portrait: asDataUrl(EDDA.replace('#7a5a2f', '#5d6b8a')), portraitChangedAt: '2026-05-01T10:00:00Z',
        createdAt: '2026-05-01T10:00:00Z', updatedAt: '2026-08-01T10:00:00Z' }
    ];
  }
  const now = '2026-09-21T10:00:00Z';
  return [
    {
      ...base, id: i.mara, version: 3, name: 'Mara Venn', summary: x.maraSummary, backstory: x.maraBack, system: null, status: 'active',
      notes: x.maraNotes, portrait: asDataUrl(MARA), portraitChangedAt: '2026-09-12T10:00:00Z',
      world: [
        { id: i.brann, version: 1, type: 'npc', name: x.brann[0], summary: x.brann[1], secret: false },
        { id: i.compass, version: 1, type: 'item', name: x.compass[0], summary: x.compass[1], secret: true },
        { id: i.reed, version: 1, type: 'faction', name: x.reed[0], summary: x.reed[1], secret: false }
      ],
      links: [{
        connId, serverName, campaignId: i.campaign, campaignTitle: title, memberId: i.lea, linkedAt: '2026-06-01T10:00:00Z', syncedVersion: 3,
        portraitSynced: '2026-09-12T10:00:00Z', submitted: { [i.brann]: 1, [i.compass]: 1, [i.reed]: 1 },
        world: [
          { id: i.brann, proposalId: `cp-${i.campaign}-brann`, entryId: null, state: 'pending', serverVersion: null },
          { id: i.compass, proposalId: `cp-${i.campaign}-compass`, entryId: null, state: 'pending', serverVersion: null },
          { id: i.reed, proposalId: `cp-${i.campaign}-reed`, entryId: `e-${i.campaign}-reed`, state: 'accepted', serverVersion: 1 }
        ]
      }],
      createdAt: '2026-06-01T10:00:00Z', updatedAt: now
    },
    { ...base, id: 'demo-ilsa-' + lang, version: 1, name: x.ilsa[0], summary: x.ilsa[1], system: x.ilsa[2], status: 'active',
      portrait: asDataUrl(ILSA), portraitChangedAt: '2026-08-10T10:00:00Z', createdAt: '2026-08-10T10:00:00Z', updatedAt: '2026-08-10T10:00:00Z' },
    { ...base, id: 'demo-edda-' + lang, version: 4, name: x.edda[0], summary: x.edda[1], system: x.edda[2], status: 'retired', statusChangedAt: '2026-03-01T10:00:00Z',
      portrait: asDataUrl(EDDA), portraitChangedAt: '2025-11-01T10:00:00Z', createdAt: '2025-11-01T10:00:00Z', updatedAt: '2026-03-01T10:00:00Z' }
  ];
}
