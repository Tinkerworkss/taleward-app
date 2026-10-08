// SL-Schirm: gespeicherte Einrichtung wird immer zu etwas Gültigem
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLayout, unusedPanels } from '../../src/table/layout.ts';

test('alte Form (eine Karte je Spalte) wird übernommen', () => {
  assert.deepEqual(normalizeLayout(['plan', 'bible']), [['plan'], ['bible']]);
});

test('Unbekanntes, Doppeltes und leere Spalten fallen weg', () => {
  assert.deepEqual(normalizeLayout([['plan', 'zauber', 'plan'], [], ['bible', 'group']]), [['plan'], ['bible', 'group']]);
});

test('höchstens 3 Spalten und 5 Karten je Spalte', () => {
  const l = normalizeLayout([['plan'], ['docs'], ['bible'], ['group']]);
  assert.equal(l.length, 3);
  assert.ok(l.every((c) => c.length <= 5));
});

test('Unbrauchbares ergibt die Grundeinstellung', () => {
  assert.deepEqual(normalizeLayout(null), [['plan'], ['bible'], ['group']]);
  assert.deepEqual(normalizeLayout([[]]), [['plan'], ['bible'], ['group']]);
});

test('freie Module', () => {
  assert.deepEqual(unusedPanels([['plan', 'bible']]), ['docs', 'group']);
});
