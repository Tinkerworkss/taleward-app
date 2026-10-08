// Fehlertolerante Namenssuche „Wer war das?“
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fuzzyFilter, matchScore } from '../../src/search/fuzzy.ts';

const names = ['Kasmyrin', 'Oren Silt', 'Ohm Tessel', 'Sefa Morr', 'Grauwehr', 'Hohenwacht'];
const find = (q) => fuzzyFilter(names, q, (n) => [n]);

test('wörtlich und unabhängig von Groß- und Kleinschreibung', () => {
  assert.deepEqual(find('oren'), ['Oren Silt']);
  assert.deepEqual(find('wacht'), ['Hohenwacht']);
});

test('Umlaute und y/i werden gleich behandelt', () => {
  assert.deepEqual(find('Kasmürin'), ['Kasmyrin']);
  assert.deepEqual(find('kasmirin'), ['Kasmyrin']);
});

test('leicht verschrieben findet trotzdem', () => {
  assert.deepEqual(find('Tesel'), ['Ohm Tessel']);
  assert.deepEqual(find('Grauwer'), ['Grauwehr']);
  assert.deepEqual(find('Hohenwach'), ['Hohenwacht']);
});

test('zu weit weg findet nichts', () => {
  assert.deepEqual(find('Drache'), []);
  assert.equal(matchScore('xy', 'Oren Silt'), 0);
});

test('wörtliche Treffer stehen vorn', () => {
  const list = fuzzyFilter(['Sefa Morr', 'Morra', 'Mor'], 'Morr', (n) => [n]);
  assert.equal(list[0] === 'Sefa Morr' || list[0] === 'Morra', true);
  assert.equal(list.includes('Mor'), true);
});
