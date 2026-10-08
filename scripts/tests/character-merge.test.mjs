// Charakter-Datei und Sicherung: zwei Stände desselben Charakters zusammenführen
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeCharacter } from '../../src/characters/merge.ts';

const base = {
  id: 'c1', version: 2, name: 'Litha', status: 'active', notes: 'alt', portrait: null,
  world: [{ id: 'w1', version: 1, type: 'npc', name: 'Bruder', summary: '', secret: false }],
  links: [{ connId: 'k1', serverName: 'A', campaignId: 'x', campaignTitle: 'X', memberId: 'm', linkedAt: '2026-01-01', syncedVersion: 2 }],
  chronicles: { 'k1:x': { takenAt: '2026-05-01T00:00:00Z' } },
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z', owners: ['me']
};
const known = new Set(['k1', 'k2']);

test('neuer Charakter kommt dazu, unbekannte Server fallen weg', () => {
  const inc = { ...base, links: [...base.links, { ...base.links[0], connId: 'fremd' }] };
  const { result, outcome } = mergeCharacter(undefined, inc, known);
  assert.equal(outcome, 'added');
  assert.deepEqual(result.links.map((l) => l.connId), ['k1']);
});

test('gleicher Stand bleibt unverändert', () => {
  assert.equal(mergeCharacter(base, structuredClone(base), known).outcome, 'unchanged');
});

test('neuerer Stand gewinnt bei Stammdaten, Besitzer bleiben', () => {
  const inc = { ...structuredClone(base), name: 'Litha vom Moor', notes: 'neu', version: 3, updatedAt: '2026-07-01T00:00:00Z', owners: undefined };
  const { result, outcome } = mergeCharacter(base, inc, known);
  assert.equal(outcome, 'updated');
  assert.equal(result.name, 'Litha vom Moor');
  assert.equal(result.notes, 'neu');
  assert.equal(result.version, 3);
  assert.deepEqual(result.owners, ['me']);
});

test('älterer Stand bringt trotzdem neue Abschriften und Einträge mit', () => {
  const inc = {
    ...structuredClone(base), name: 'Alt', updatedAt: '2026-02-01T00:00:00Z',
    world: [{ ...base.world[0], version: 3, name: 'Bruder Tamo' }, { id: 'w2', version: 1, type: 'location', name: 'Dorf', summary: '', secret: true }],
    chronicles: { 'k1:x': { takenAt: '2026-04-01T00:00:00Z' }, 'k2:y': { takenAt: '2026-03-01T00:00:00Z' } }
  };
  const { result, outcome } = mergeCharacter(base, inc, known);
  assert.equal(outcome, 'updated');
  assert.equal(result.name, 'Litha', 'Stammdaten vom neueren Stand');
  assert.deepEqual(result.world.map((w) => [w.id, w.version]), [['w1', 3], ['w2', 1]]);
  assert.equal(result.chronicles['k1:x'].takenAt, '2026-05-01T00:00:00Z', 'jüngere Abschrift bleibt');
  assert.ok(result.chronicles['k2:y']);
});
