// Arbeitsplatz: Vorschlag im Kapitel wiederfinden
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mentions } from '../../src/review/mentions.ts';

test('Name im Absatz', () => {
  const m = mentions('Hauptfrau Veyra Dornfeld');
  assert.ok(m('Erst Veyra ließ sie passieren.'));
  assert.ok(!m('Sie fanden einen Schlüssel.'));
});

test('Artikel und kleine Wörter zählen nicht', () => {
  const m = mentions('Das gestohlene Siegel');
  assert.ok(m('… das Zeichen wie das gestohlene Siegel.'));
  assert.ok(!m('Das Tor war zu.'));
});

test('ohne brauchbares Wort', () => {
  assert.equal(mentions('der Ort'), null);
});
