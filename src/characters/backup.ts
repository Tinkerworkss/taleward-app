/*
 * Sammlung sichern und zurückholen. Die Sammlung liegt nur im Gerät; geht das Handy verloren oder wird die App
 * gelöscht, wäre sie weg. Eine Sicherung ist eine Datei taleward-charaktere/1 (JSON) mit allen eigenen Charakteren,
 * auch Bildern, mitgebrachter Welt, Abschriften und privaten Notizen. Sie bleibt beim Menschen, nie auf einem Server.
 */
import { APP_VERSION, listConnections } from '../api/connections';
import { t } from '../i18n';
import { mergeCharacter } from './merge';
import { allStoredCharacters, listCharacters, myAccountKeys, putCharacters, type StoredCharacter } from './store';

export const BACKUP_FORMAT = 'taleward-charaktere/1';
/** Ein einzelner Charakter als Datei (zum Weitergeben an ein anderes Gerät) */
export const CHARACTER_FORMAT = 'taleward-charakter/1';

interface CharacterFileData {
  format: typeof CHARACTER_FORMAT;
  exportedAt: string;
  appVersion: string;
  character: StoredCharacter;
}

interface BackupFile {
  format: typeof BACKUP_FORMAT;
  exportedAt: string;
  appVersion: string;
  characters: StoredCharacter[];
}

/** Datei mit der ganzen eigenen Sammlung */
export function backupFile(now = new Date()): File {
  const data: BackupFile = { format: BACKUP_FORMAT, exportedAt: now.toISOString(), appVersion: APP_VERSION, characters: listCharacters() };
  return new File([JSON.stringify(data)], `taleward-charaktere-${now.toISOString().slice(0, 10)}.json`, { type: 'application/json' });
}

/** Datei mit einem Charakter: Stammdaten, Bild, mitgebrachte Welt, Abschriften und private Notizen */
export function characterFile(c: StoredCharacter, now = new Date()): File {
  const { owners: _owners, ...character } = c;
  const data: CharacterFileData = { format: CHARACTER_FORMAT, exportedAt: now.toISOString(), appVersion: APP_VERSION, character: character as StoredCharacter };
  const slug = c.name.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'charakter';
  return new File([JSON.stringify(data)], `taleward-charakter-${slug}.json`, { type: 'application/json' });
}

/** Auf dem Handy über „Teilen“ (Speichern, Mail …), im Browser als Download */
export async function saveOrShare(file: File, title: string): Promise<void> {
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) throw e;
    }
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

const isText = (v: unknown) => typeof v === 'string';

/** Grobe Prüfung eines Charakters aus einer fremden Datei – alles Unbekannte wird verworfen */
function valid(c: unknown): c is StoredCharacter {
  if (!c || typeof c !== 'object') return false;
  const x = c as Record<string, unknown>;
  return isText(x.id) && isText(x.name) && (x.name as string).trim() !== '' && isText(x.updatedAt)
    && Array.isArray(x.world) && Array.isArray(x.links) && typeof x.chronicles === 'object' && x.chronicles !== null
    && (x.portrait === null || x.portrait === undefined || (isText(x.portrait) && (x.portrait as string).startsWith('data:image/')));
}

export interface RestoreResult { added: number; updated: number; unchanged: number }

/**
 * Sicherung oder Charakter-Datei zurückholen. Neue Charaktere kommen dazu; bei vorhandenen gewinnt der neuere Stand,
 * Abschriften und mitgebrachte Welt werden zusammengeführt (siehe merge.ts). Verknüpfungen mit Servern, die dieses
 * Gerät nicht kennt, fallen weg (dort muss man sich erst anmelden).
 */
export function restoreBackup(text: string): RestoreResult {
  const wrong = () => new Error(t('Das ist weder eine Charakter-Datei noch eine Sicherung der Sammlung.'));
  let data: { format?: string; characters?: unknown[]; character?: unknown } | null;
  try {
    data = JSON.parse(text);
  } catch {
    throw wrong();
  }
  let incoming: unknown[];
  if (data?.format === BACKUP_FORMAT && Array.isArray(data.characters)) incoming = data.characters;
  else if (data?.format === CHARACTER_FORMAT && data.character) incoming = [data.character];
  else throw wrong();
  const known = new Set(listConnections().map((c) => c.id));
  const mine = myAccountKeys();
  // Ohne Anmeldung gehörte der Charakter niemandem und bliebe unsichtbar
  if (!mine.length) throw new Error(t('Melde dich erst bei einem Server an, dann kannst du die Sammlung zurückholen.'));
  const all = new Map(allStoredCharacters().map((c) => [c.id, c]));
  const result: RestoreResult = { added: 0, updated: 0, unchanged: 0 };
  const take: StoredCharacter[] = [];
  for (const raw of incoming.filter(valid)) {
    const c: StoredCharacter = { ...raw, notes: isText(raw.notes) ? raw.notes : '' };
    const old = all.get(c.id);
    const { result: merged, outcome } = mergeCharacter(old, c, known);
    result[outcome]++;
    if (outcome === 'unchanged') continue;
    take.push({ ...merged, owners: [...new Set([...(old?.owners ?? []), ...mine])] });
  }
  if (take.length) putCharacters(take);
  return result;
}
