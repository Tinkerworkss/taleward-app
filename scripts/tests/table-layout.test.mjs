// SL-Schirm: Raster, Platzsuche und Übernahme älterer Einrichtungen
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultLayout, firstFree, fits, normalizeLayout, readingOrder, tryChange, unusedPanels } from '../../src/table/layout.ts';

test('älteste Form (eine Karte je Spalte) wird ins Raster übernommen', () => {
  assert.deepEqual(normalizeLayout(['plan', 'bible']), [
    { id: 'plan', x: 0, y: 0, w: 3, h: 5 },
    { id: 'bible', x: 3, y: 0, w: 3, h: 5 }
  ]);
});

test('Spalten mit mehreren Karten teilen die Höhe', () => {
  const l = normalizeLayout([['plan', 'group', 'docs'], ['bible']]);
  assert.deepEqual(l.filter((c) => c.x === 0).map((c) => [c.id, c.y, c.h]), [['plan', 0, 2], ['group', 2, 2], ['docs', 4, 1]]);
  assert.deepEqual(l.find((c) => c.id === 'bible'), { id: 'bible', x: 3, y: 0, w: 3, h: 5 });
});

test('Unbekanntes, Doppeltes, Überlappendes und Ungültiges fällt weg', () => {
  const l = normalizeLayout([
    { id: 'plan', x: 0, y: 0, w: 4, h: 3 },
    { id: 'plan', x: 4, y: 0, w: 2, h: 1 },
    { id: 'zauber', x: 4, y: 0, w: 2, h: 1 },
    { id: 'bible', x: 2, y: 2, w: 2, h: 2 },
    { id: 'group', x: 4, y: 4, w: 3, h: 1 },
    { id: 'docs', x: 0, y: 3, w: 6, h: 2 }
  ]);
  assert.deepEqual(l, [{ id: 'plan', x: 0, y: 0, w: 4, h: 3 }, { id: 'docs', x: 0, y: 3, w: 6, h: 2 }]);
});

test('Unbrauchbares ergibt die Grundeinstellung', () => {
  assert.deepEqual(normalizeLayout(null), defaultLayout());
  assert.deepEqual(normalizeLayout([]), defaultLayout());
});

test('zwei Drittel und ein Drittel nebeneinander', () => {
  const l = [{ id: 'plan', x: 0, y: 0, w: 4, h: 5 }];
  assert.ok(fits(l, { id: 'bible', x: 4, y: 0, w: 2, h: 5 }));
  assert.ok(!fits(l, { id: 'bible', x: 3, y: 0, w: 2, h: 5 }));
  assert.ok(!fits(l, { id: 'bible', x: 5, y: 0, w: 1, h: 5 }), 'schmaler als ein Drittel geht nicht');
});

test('freier Platz und Ändern nur, wenn es passt', () => {
  const l = defaultLayout();
  assert.equal(firstFree(l, 'docs'), null);
  const smaller = tryChange(l, 'group', { h: 3 });
  assert.ok(smaller);
  assert.deepEqual(firstFree(smaller, 'docs'), { id: 'docs', x: 4, y: 3, w: 2, h: 1 });
  assert.equal(tryChange(l, 'plan', { w: 4 }), null);
});

test('Lesereihenfolge und freie Module', () => {
  const l = [{ id: 'group', x: 2, y: 1, w: 2, h: 1 }, { id: 'plan', x: 0, y: 0, w: 2, h: 2 }, { id: 'bible', x: 2, y: 0, w: 2, h: 1 }];
  assert.deepEqual(readingOrder(l).map((c) => c.id), ['plan', 'bible', 'group']);
  assert.deepEqual(unusedPanels(l), ['docs', 'notes', 'clock', 'links']);
});
