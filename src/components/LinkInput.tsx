import { useState } from 'react';
import { t } from '../i18n';
import { findInviteInText, readClipboard } from '../invite';
import { IconPaste, IconScan } from './Icons';
import { QrScanner } from './QrScanner';

/**
 * Eingabefeld für Einladungslink oder Serveradresse – mit zwei unauffälligen Symbolen im Feld:
 * Einfügen aus der Zwischenablage und QR-Code scannen. Die Hauptaktion („Weiter“, „Beitreten“) bleibt der
 * große Knopf darunter; die Symbole sollen nicht mit ihm verwechselt werden.
 */
export function LinkInput({ id, value, onChange, placeholder, autoFocus }: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [scanning, setScanning] = useState(false);
  const take = (text: string) => {
    const link = findInviteInText(text) ?? text.trim();
    if (link) onChange(link);
  };
  return (
    <div className="input-actions">
      <input id={id} type="text" autoCapitalize="none" autoCorrect="off" value={value} autoFocus={autoFocus}
        placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      <div className="input-actions-buttons">
        <button type="button" className="icon-btn" aria-label={t('Einfügen')} title={t('Einfügen')} onClick={async () => take(await readClipboard())}>
          <IconPaste size={20} />
        </button>
        <button type="button" className="icon-btn" aria-label={t('QR-Code scannen')} title={t('QR-Code scannen')} onClick={() => setScanning(true)}>
          <IconScan size={20} />
        </button>
      </div>
      {scanning && <QrScanner onClose={() => setScanning(false)} onResult={(text) => { setScanning(false); take(text); }} />}
    </div>
  );
}
