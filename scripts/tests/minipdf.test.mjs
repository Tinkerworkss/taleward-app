// Testmodus: Unterlagen als echte PDF-Datei
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textToPdf } from '../../src/mocks/minipdf.ts';

const latin1 = (b) => Array.from(b, (c) => String.fromCharCode(c)).join('');

test('gültiger Aufbau mit Seiten, Verweistabelle und Umlauten', () => {
  const pdf = latin1(textToPdf(['Aushang an der Zollbrücke\nGesucht: „Fährleute“ – gut (bezahlt)', 'Seite zwei'], 'Aushang'));
  assert.ok(pdf.startsWith('%PDF-1.4\n'));
  assert.ok(pdf.trimEnd().endsWith('%%EOF'));
  assert.match(pdf, /\/Count 2\b/);
  assert.ok(pdf.includes('Zollbr\\374cke'), 'ü als Oktal');
  assert.ok(pdf.includes('\\204F\\344hrleute\\223'), '„ und “ aus Windows-1252');
  assert.ok(pdf.includes('gut \\(bezahlt\\)'), 'Klammern geschützt');
  // Jeder Eintrag der Verweistabelle zeigt auf den Anfang seines Objekts
  const xref = Number(pdf.match(/startxref\n(\d+)/)[1]);
  const rows = pdf.slice(xref).split('\n').slice(3).filter((r) => / n $/.test(r));
  rows.forEach((r, i) => assert.equal(pdf.slice(Number(r.slice(0, 10))).split('\n')[0], `${i + 1} 0 obj`));
});

test('lange Seiten werden umbrochen und verteilt', () => {
  const pdf = latin1(textToPdf([Array.from({ length: 900 }, (_, i) => `Wort${i}`).join(' ')]));
  assert.match(pdf, /\/Count 2\b/);
});
