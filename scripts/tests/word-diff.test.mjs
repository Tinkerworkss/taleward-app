// Korrektur-Entwurf: Wortvergleich
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordDiff } from '../../src/review/wordDiff.ts';

const join = (parts, kinds) => parts.filter((p) => kinds.includes(p.kind)).map((p) => p.text).join('');

test('alter und neuer Text lassen sich zusammensetzen', () => {
  const before = 'Pipo stirbt am Ufer, und die Gruppe zieht weiter.';
  const after = 'Pipo bleibt verletzt am Ufer zurück, und die Gruppe zieht weiter.';
  const d = wordDiff(before, after);
  assert.equal(join(d, ['same', 'del']), before);
  assert.equal(join(d, ['same', 'ins']), after);
  assert.ok(d.some((p) => p.kind === 'del' && p.text.includes('stirbt')));
  assert.ok(d.some((p) => p.kind === 'ins' && p.text.includes('verletzt')));
});

test('gleicher Text ist ein Stück', () => {
  assert.deepEqual(wordDiff('Ein Satz.', 'Ein Satz.'), [{ kind: 'same', text: 'Ein Satz.' }]);
});

test('Ergänzung am Ende', () => {
  const d = wordDiff('Sie erreichten das Tor.', 'Sie erreichten das Tor. Mara zog Tavin aus dem Wasser.');
  assert.equal(d[d.length - 1].kind, 'ins');
  assert.equal(join(d, ['same', 'ins']), 'Sie erreichten das Tor. Mara zog Tavin aus dem Wasser.');
});
