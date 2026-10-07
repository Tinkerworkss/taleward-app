/*
 * Sammlung sichern und zurückholen. Die Sammlung liegt nur im Gerät; geht das Handy verloren oder wird die App
 * gelöscht, wäre sie weg. Eine Sicherung ist eine Datei taleward-charaktere/1 (JSON) mit allen eigenen Charakteren,
 * auch Bildern, mitgebrachter Welt, Abschriften und privaten Notizen. Sie bleibt beim Menschen, nie auf einem Server.
 */
import { APP_VERSION, listConnections } from '../api/connections';
import { t } from '../i18n';
import { allStoredCharacters, listCharacters, myAccountKeys, putCharacters, type StoredCharacter } from './store';

export const BACKUP_FORMAT = 'taleward-charaktere/1';

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
 * Sicherung zurückholen. Neue Charaktere kommen dazu, vorhandene werden nur durch einen neueren Stand ersetzt.
 * Verknüpfungen mit Servern, die dieses Gerät nicht kennt, fallen weg (dort muss man sich erst anmelden).
 */
export function restoreBackup(text: string): RestoreResult {
  let data: Partial<BackupFile>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(t('Das ist keine Sicherung der Charakter-Sammlung.'));
  }
  if (data?.format !== BACKUP_FORMAT || !Array.isArray(data.characters)) {
    throw new Error(t('Das ist keine Sicherung der Charakter-Sammlung.'));
  }
  const known = new Set(listConnections().map((c) => c.id));
  const mine = myAccountKeys();
  // Ohne Anmeldung gehörte der Charakter niemandem und bliebe unsichtbar
  if (!mine.length) throw new Error(t('Melde dich erst bei einem Server an, dann kannst du die Sammlung zurückholen.'));
  const all = new Map(allStoredCharacters().map((c) => [c.id, c]));
  const result: RestoreResult = { added: 0, updated: 0, unchanged: 0 };
  const take: StoredCharacter[] = [];
  for (const c of data.characters.filter(valid)) {
    const old = all.get(c.id);
    if (old && Date.parse(old.updatedAt) >= Date.parse(c.updatedAt)) {
      result.unchanged++;
      continue;
    }
    take.push({
      ...c,
      notes: isText(c.notes) ? c.notes : '',
      owners: [...new Set([...(old?.owners ?? []), ...mine])],
      links: c.links.filter((l) => l && known.has(l.connId))
    });
    if (old) result.updated++;
    else result.added++;
  }
  if (take.length) putCharacters(take);
  return result;
}
