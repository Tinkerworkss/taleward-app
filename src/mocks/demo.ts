/*
 * Demo-Datensatz „Die leisen Wasser“ / „The quiet waters“ für Website- und Store-Aufnahmen.
 * Liegt auf einem eigenen Test-„Server“: https://taleward.euer-verein.de (Anmeldung als anja, lea oder tom,
 * beliebiges Passwort). Alle Personen, Namen und Texte sind erfunden.
 * Wissen je Figur: Mara (Lea) sieht den Ring, nie das Klopfen; Tavin (Tom) sieht das Klopfen, nie den Ring;
 * Spielende sehen Iria Sehl nie.
 */
import type { DatePoll, Entry, Proposal, Recap, Speaker } from '../api/types';
import { seedDemoCharacters } from './demoCharacters';
import { campaigns, datePolls, entries, gmNotes, proposals, recaps, seen, sessions, type MockSession } from './db';

export const DEMO_HOST = 'taleward.euer-verein.de';

export const DEMO_USERS: Record<string, { id: string; username: string; displayName: string }> = {
  anja: { id: 'u-anja', username: 'anja', displayName: 'Anja' },
  lea: { id: 'u-lea', username: 'lea', displayName: 'Lea' },
  tom: { id: 'u-tom', username: 'tom', displayName: 'Tom' }
};

type Lang = 'de' | 'en';
const T = {
  de: {
    id: 'c-wasser', title: 'Die leisen Wasser', description: 'Eine Reise durch das Moor nach Hohenwacht.',
    world: 'Zwischen Grauwehr und Hohenwacht liegt das Moor. Wer es durchqueren will, braucht einen Führer oder eine Fähre.',
    gm: 'Spielleitung', mara: 'Mara Venn', tavin: 'Tavin Rook',
    chapters: ['Der Weg nach Grauwehr', 'Salz im Brunnen', 'Die Zollbrücke', 'Ein Brief ohne Siegel', 'Nacht im Moorkrug', 'Stimmen im Schilf'],
    ch7: 'Die letzte Fähre von Grauwehr',
    recap: 'Bei Grauwehr setzte uns Oren Silt über den Fluss. Eine Kupfermünze pro Person, die Laterne aus. Am anderen Ufer lag der Weg nach Hohenwacht im Nebel. Warum der Fährmann so wenig Licht wollte, blieb offen.',
    thread: 'Warum wollte der Fährmann so wenig Licht?',
    gmNote: 'Iria Sehl liegt unter den vorderen Planken. Oren weiß es.',
    oren: ['Oren Silt', 'Fährmann bei Grauwehr. Verlangt eine Kupfermünze pro Person.', 'Hilft Iria Sehl gegen Bezahlung bei ihrer Flucht; ihr Ring dient als Pfand.'],
    orenQuote: 'Eine Kupfermünze pro Person. Und die Laterne bleibt aus.',
    ferry: ['Fährstelle Grauwehr', 'Ein Übergang durch das Moor auf dem Weg nach Hohenwacht.', 'Die Wachen suchen an den Ufern nach Iria Sehl.'],
    ring: ['Siegelring des Archivs', 'Oren Silt trägt einen Siegelring des Archivs von Hohenwacht.'],
    knock: ['Klopfen unter den Planken', 'Dreimaliges Klopfen unter den vorderen Planken der Fähre.'],
    iria: ['Iria Sehl', 'Archivarin auf der Flucht. Versteckt sich auf der Fähre und führt Abschriften veränderter Grenzregister mit sich.'],
    voices: ['„Lea hier, ich spiele Mara Venn, die Kundschafterin.“', '„Die Laterne bleibt aus? Dann halte ich mich am Bug fest.“', '„Oren Silt hebt die Hand: Eine Kupfermünze pro Person.“'],
    poll: 'Kapitel 8 – wann passt es?'
  },
  en: {
    id: 'c-waters', title: 'The quiet waters', description: 'A journey across the moor to Hohenwacht.',
    world: 'Between Grauwehr and Hohenwacht lies the moor. Anyone who wants to cross it needs a guide or a ferry.',
    gm: 'Game master', mara: 'Mara Venn', tavin: 'Tavin Rook',
    chapters: ['The road to Grauwehr', 'Salt in the well', 'The toll bridge', 'A letter without a seal', 'Night at the Moor Inn', 'Voices in the reeds'],
    ch7: 'The last ferry at Grauwehr',
    recap: 'At Grauwehr, Oren Silt took us across the river. One copper coin each, and the lantern out. On the far bank, the road to Hohenwacht disappeared into the mist. Why the ferryman wanted so little light remained an open question.',
    thread: 'Why did the ferryman want so little light?',
    gmNote: 'Iria Sehl is hiding under the front planks. Oren knows.',
    oren: ['Oren Silt', 'Ferryman at Grauwehr. Charges one copper coin per person.', 'Helps Iria Sehl escape for payment; her ring serves as a pledge.'],
    orenQuote: 'One copper coin per person. And the lantern stays out.',
    ferry: ['Grauwehr ferry crossing', 'A crossing through the moor on the way to Hohenwacht.', 'The guards are searching the banks for Iria Sehl.'],
    ring: ['Seal ring of the archive', 'Oren Silt wears a seal ring of the Hohenwacht archive.'],
    knock: ['Knocking under the planks', 'Three knocks under the front planks of the ferry.'],
    iria: ['Iria Sehl', 'An archivist on the run. Hides on the ferry and carries copies of altered border registers.'],
    voices: ['"Lea here, I play Mara Venn, the scout."', '"The lantern stays out? Then I\'ll hold on at the bow."', '"Oren Silt raises his hand: one copper coin per person."'],
    poll: 'Chapter 8 – when works for you?'
  }
};

/** Mitglieds-IDs je Kampagne */
export const demoMember = (lang: Lang, who: 'anja' | 'lea' | 'tom') => `m-${lang === 'de' ? 'w' : 'q'}-${who}`;

const PLAYED = ['2026-06-13', '2026-06-27', '2026-07-11', '2026-07-25', '2026-08-22', '2026-09-05'];

export function demoSessionId(lang: Lang) {
  return `s-${T[lang].id}-7`;
}

for (const lang of ['de', 'en'] as Lang[]) {
  const t = T[lang];
  const m = (who: 'anja' | 'lea' | 'tom') => demoMember(lang, who);
  campaigns.push({
    id: t.id, host: DEMO_HOST, title: t.title, description: t.description, worldInfo: t.world, language: lang,
    system: null, systemName: null, coverPreset: 'swamp', inviteCode: 'K7Q2M9', nextSessionAt: null,
    members: [
      // Anja hat (noch) keine dauerhafte Zustimmung – am Tisch steht bei ihr „Zustimmen lassen“
      { id: m('anja'), userId: 'u-anja', displayName: 'Anja', characterName: null, role: 'gm', recordingConsentAt: null },
      { id: m('lea'), userId: 'u-lea', displayName: 'Lea', characterName: t.mara, role: 'player', recordingConsentAt: '2026-06-01T10:00:00Z',
        characterSummary: lang === 'de' ? 'Kundschafterin' : 'Scout' },
      { id: m('tom'), userId: 'u-tom', displayName: 'Tom', characterName: t.tavin, role: 'player', recordingConsentAt: '2026-06-01T10:00:00Z',
        characterSummary: lang === 'de' ? 'Wandernder Schreiber' : 'Wandering scribe' }
    ]
  });

  seedDemoCharacters(lang, campaigns[campaigns.length - 1].members);

  // Kapitel 1–6: nur Titel
  t.chapters.forEach((title, i) => {
    const id = `s-${t.id}-${i + 1}`;
    const at = `${PLAYED[i]}T17:00:00Z`;
    sessions.push({
      id, campaignId: t.id, number: i + 1, title, playedAt: at, state: 'published', source: 'table', attendees: [],
      durationSeconds: 12600, audioDeletedAt: at, publishedAt: at, phaseStartedAt: null
    } as MockSession);
    recaps[id] = { sessionId: id, number: i + 1, title, publishedAt: at, text: '', openThreads: [] } as Recap;
  });

  // Kapitel 7: wartet auf „Stimmen zuordnen“, danach Entwurf mit Recap und einem Vorschlag
  const s7 = demoSessionId(lang);
  sessions.push({
    id: s7, campaignId: t.id, number: 7, title: t.ch7, playedAt: '2026-09-19T17:00:00Z', state: 'awaiting_speakers', source: 'table',
    attendees: [
      { memberId: m('anja'), consent: true, consentSource: 'on_site' },
      { memberId: m('lea'), consent: true, consentSource: 'app' },
      { memberId: m('tom'), consent: true, consentSource: 'app' }
    ],
    durationSeconds: 11640, audioDeletedAt: null, publishedAt: null, phaseStartedAt: null, transcriptionEngine: 'local'
  } as MockSession);
  recaps[s7] = { sessionId: s7, number: 7, title: t.ch7, publishedAt: null, text: t.recap, openThreads: [t.thread] } as Recap;
  gmNotes[s7] = t.gmNote;
  proposals.push({
    id: `${s7}-oren`, sessionId: s7, entryType: 'npc', action: 'create', targetEntryId: null,
    title: t.oren[0], detail: t.oren[1], gmNotes: t.oren[2], suggestedVisibility: 'public', confidence: 0.92, flags: [],
    evidence: [{ start: 1840, quote: t.orenQuote }], decision: 'open'
  } as Proposal);

  // Bibel: Wissen je Figur über „verborgen vor“
  const e = (id: string, type: Entry['type'], name: string, summary: string, extra: Partial<Entry> = {}): Entry => ({
    id: `e-${t.id}-${id}`, campaignId: t.id, type, name, summary, visibility: 'public', status: null, holderMemberId: null,
    firstSessionNumber: 7, lastSessionNumber: 7, mentions: [], updatedAt: '2026-09-19T21:00:00Z', ...extra
  } as Entry);
  entries.push(
    e('ferry', 'location', t.ferry[0], t.ferry[1], { gmNotes: t.ferry[2], firstSessionNumber: 1 }),
    e('ring', 'item', t.ring[0], t.ring[1], { hiddenFromMemberIds: [m('tom')] }),
    e('knock', 'other', t.knock[0], t.knock[1], { hiddenFromMemberIds: [m('lea')] }),
    e('iria', 'npc', t.iria[0], t.iria[1], { visibility: 'gm_only', firstSessionNumber: null, lastSessionNumber: null })
  );

  datePolls.push({
    id: `poll-${t.id}`, campaignId: t.id, status: 'open', note: t.poll, createdAt: '2026-09-20T09:00:00Z', chosenOptionId: null,
    options: [
      { id: `${t.id}-o1`, startsAt: '2026-10-03T16:00:00Z', proposedByMemberId: m('anja'), votes: [
        { memberId: m('anja'), answer: 'yes' }, { memberId: m('lea'), answer: 'yes' }, { memberId: m('tom'), answer: 'maybe' }] },
      { id: `${t.id}-o2`, startsAt: '2026-10-09T17:00:00Z', proposedByMemberId: m('lea'), votes: [
        { memberId: m('lea'), answer: 'yes' }, { memberId: m('tom'), answer: 'yes' }, { memberId: m('anja'), answer: 'no' }] },
      { id: `${t.id}-o3`, startsAt: '2026-10-17T16:00:00Z', proposedByMemberId: m('tom'), votes: [
        { memberId: m('tom'), answer: 'yes' }, { memberId: m('anja'), answer: 'yes' }] }
    ]
  } as DatePoll);

  // Keine Ungelesen-Punkte in den Aufnahmen
  seen.chronicle[t.id] = '2099-01-01T00:00:00Z';
  seen.bible[t.id] = '2099-01-01T00:00:00Z';
}

/** Stimmen für Kapitel 7: Lea aus der Vorstellungsrunde, Tom über Stimmprofil, Anja unsicher */
export function demoSpeakers(sessionId: string): Speaker[] | null {
  const lang: Lang | null = sessionId === demoSessionId('de') ? 'de' : sessionId === demoSessionId('en') ? 'en' : null;
  if (!lang) return null;
  const v = T[lang].voices;
  return [
    { id: 'sp1', label: lang === 'de' ? 'Stimme 1' : 'Voice 1', speakingSeconds: 2840, sampleText: v[0], suggestedMemberId: demoMember(lang, 'lea'), confidence: 0.94, source: 'intro_round' },
    { id: 'sp2', label: lang === 'de' ? 'Stimme 2' : 'Voice 2', speakingSeconds: 2610, sampleText: v[1], suggestedMemberId: demoMember(lang, 'tom'), confidence: 0.91, source: 'voice_match' },
    { id: 'sp3', label: lang === 'de' ? 'Stimme 3' : 'Voice 3', speakingSeconds: 5920, sampleText: v[2], suggestedMemberId: demoMember(lang, 'anja'), confidence: 0.68, source: 'intro_round' }
  ] as Speaker[];
}
