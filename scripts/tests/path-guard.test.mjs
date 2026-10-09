// Kennungen und Pfade nach dem Muster der Schnittstelle 0.4.14
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSafeId, isSafePath } from '../../src/api/pathGuard.ts';

test('gültige Kennungen', () => {
  for (const id of ['c-wasser', '3f2a9c1e-0b4d-4a5e-9f00-1234567890ab', 'SPEAKER_00', 'link-c-wasser-karte']) assert.ok(isSafeId(id), id);
});

test('ungültige Kennungen', () => {
  for (const id of ['../sessions/x?', 'a/b', '', 'x'.repeat(65), 'a b', 'a%2F', null, 42]) assert.ok(!isSafeId(id), String(id));
});

test('Pfade', () => {
  assert.ok(isSafePath('/campaigns/c-wasser/members/me/character'));
  assert.ok(isSafePath('/campaigns/c1/entries?type=npc&q=Iria Sehl'));
  assert.ok(isSafePath('/info'));
  assert.ok(!isSafePath('/campaigns/../sessions/x'));
  assert.ok(!isSafePath('/campaigns/x/./y'));
  assert.ok(!isSafePath('/campaigns//members'));
  assert.ok(!isSafePath('/campaigns/a%2Fb'));
  assert.ok(!isSafePath('campaigns/x'));
});
