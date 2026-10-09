// „Original öffnen“: Anzeige nach Dateiendung
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { downloadName, originalKind } from '../../src/table/docKind.ts';

test('nur PDF und Text werden geöffnet', () => {
  assert.equal(originalKind('vorbereitung.pdf'), 'application/pdf');
  assert.equal(originalKind('NOTIZ.MD'), 'text/plain;charset=utf-8');
  for (const f of ['seite.html', 'bild.svg', 'brief.docx', 'skript.js', 'x.pdf.html']) assert.equal(originalKind(f), null, f);
});

test('Dateiname zum Speichern ohne Pfadteile', () => {
  assert.equal(downloadName('../../geheim.docx'), '_.._geheim.docx');
  assert.equal(downloadName('a:b*c.docx'), 'a_b_c.docx');
  assert.equal(downloadName('...'), 'unterlage');
});
