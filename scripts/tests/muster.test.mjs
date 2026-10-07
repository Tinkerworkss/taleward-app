// Musterkampagne: Deutsch und Englisch gleich aufgebaut, Belege stehen wörtlich in der Abschrift, keine Geheimnisse in
// Texten, die Spieler sehen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deA } from '../../src/mocks/muster/de-a.ts';
import { deB } from '../../src/mocks/muster/de-b.ts';
import { enA } from '../../src/mocks/muster/en-a.ts';
import { enB } from '../../src/mocks/muster/en-b.ts';

const de = { ...deA, ...deB };
const en = { ...enA, ...enB };

/** Alles, was keine Übersetzung ist: Schlüssel, Daten, Zahlen, Sichtbarkeit */
function shape(t) {
  return {
    hotwords: t.hotwords.length,
    chapters: t.chapters.map((c) => [c.date, c.minutes, c.present, c.guest ?? null, c.threads.length, c.recap.split('\n\n').length]),
    entries: t.entries.map((e) => [e.key, e.type, !!e.gmOnly, e.hiddenFrom ?? [], e.status ?? null, e.holder ?? null, !!e.gmNotes,
      (e.mentions ?? []).map((m) => m[0])]),
    ch8: [t.ch8.date, t.ch8.minutes, t.ch8.threads.length, t.ch8.recap.split('\n\n').length,
      t.ch8.transcript.split('\n').map((l) => l.match(/^\[[^\]]+\] \w+/)?.[0]),
      t.ch8.review.map((r) => [r.verdict, r.evidence.map((e) => [e[0], e[1]])]),
      t.ch8.proposals.map(proposalShape),
      t.ch8.terms.map((x) => [x.alternatives.length, x.occurrences, x.confidence, x.entry ?? null, x.example[0]]),
      t.ch8.speakers.map((s) => [s.who, s.source, s.confidence, s.minutes])],
    comments: t.comments.map((c) => [c.ch, c.who, c.to ?? null]),
    poll: [t.poll.createdAt, t.poll.options],
    documents: t.documents.map((d) => [d.key, d.kind, d.pages, d.createdAt, d.state, !!d.worldInfoSuggestion, d.proposals.map(proposalShape),
      d.text.split('\n').length]),
    collections: Object.fromEntries(Object.entries(t.collections).map(([who, list]) => [who, list.map((c) => [c.key, !!c.nickname,
      !!c.inCampaign, c.status, c.emblem, c.notes.split('\n').length, c.world.map((w) => [w.key, w.type, w.secret, w.state, w.entry ?? null,
        w.hiddenFrom ?? []])])])),
  };
}

function proposalShape(p) {
  return [p.key, p.action, p.type, p.target ?? null, !!p.gmOnly, p.hiddenFrom ?? null, p.confidence, p.flag ?? null, !!p.reason,
    !!p.visibilityReason, !!p.gmNotes, p.detail === '', p.evidence.map((e) => e[0]), p.decision ?? null];
}

test('Deutsch und Englisch sind gleich aufgebaut', () => {
  assert.deepEqual(shape(en), shape(de));
});

for (const [lang, t] of [['de', de], ['en', en]]) {
  test(`${lang}: Belege stehen wörtlich in der Abschrift`, () => {
    const lines = new Map(t.ch8.transcript.split('\n').map((l) => [l.slice(1, 9), l]));
    for (const p of t.ch8.proposals) {
      for (const [time, quote] of p.evidence) assert.ok(lines.get(time)?.includes(quote), `${p.key} ${time}`);
    }
    for (const r of t.ch8.review) {
      for (const [time, who, quote] of r.evidence) {
        const line = lines.get(time);
        assert.ok(line?.includes(quote), `Prüfung ${time}`);
        assert.ok(line.toLowerCase().includes(`] ${who}:`), `Prüfung ${time} Person`);
      }
    }
    for (const term of t.ch8.terms) {
      assert.ok(lines.get(term.example[0])?.includes(term.example[1]), term.heard);
      const n = t.ch8.transcript.split(term.heard).length - 1;
      assert.ok(n >= 1, `${term.heard} kommt vor`);
    }
    for (const d of t.documents) {
      for (const p of d.proposals) for (const [, quote] of p.evidence) assert.ok(d.text.includes(quote), `${d.key} ${p.key}`);
    }
  });

  test(`${lang}: Verweise zeigen auf vorhandene Einträge`, () => {
    const keys = new Set(t.entries.map((e) => e.key));
    const all = [...t.ch8.proposals, ...t.documents.flatMap((d) => d.proposals)];
    for (const p of all) if (p.target) assert.ok(keys.has(p.target), p.key);
    for (const term of t.ch8.terms) if (term.entry) assert.ok(keys.has(term.entry), term.heard);
    for (const list of Object.values(t.collections)) {
      for (const c of list) for (const w of c.world) if (w.entry) assert.ok(keys.has(w.entry), w.key);
    }
    assert.equal(t.entries.length, 25);
    assert.equal(new Set(t.entries.map((e) => e.key)).size, 25);
  });

  test(`${lang}: Texte für Spieler verraten keine Geheimnisse`, () => {
    const secret = lang === 'de'
      ? [/Quell/, /Iria/, /Liv Venn/, /Siegelring/, /Turm/, /Klopf/, /Grenzregister/, /Magazin/]
      : [/Quell/, /Iria/, /Liv Venn/, /signet/i, /tower/i, /knock/i, /border register/i, /Stacks/];
    const visible = [
      t.worldInfo, t.description,
      ...t.chapters.flatMap((c) => [c.title, c.recap, ...c.threads]),
      ...t.entries.filter((e) => !e.gmOnly && !(e.hiddenFrom ?? []).length).flatMap((e) => [e.name, e.summary, ...(e.mentions ?? []).map((m) => m[1])]),
      ...t.comments.filter((c) => !c.to).map((c) => c.text),
      ...t.documents.filter((d) => d.kind !== 'gm').flatMap((d) => [d.text, d.worldInfoSuggestion ?? '']),
      ...Object.values(t.members).map((m) => m.summary),
    ];
    for (const text of visible) for (const re of secret) assert.ok(!re.test(text), `${re} in: ${text.slice(0, 60)}`);
  });
}
