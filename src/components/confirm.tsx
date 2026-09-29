import { useEffect, useState } from 'react';
import { t } from '../i18n';
import { Dialog } from './Dialog';

/**
 * Bestätigungen im Stil der App statt des grauen Systemfensters.
 * Aufruf: if (!(await confirmDialog(t('Kommentar löschen?'), { confirmLabel: t('Löschen'), danger: true }))) return;
 */
interface Request {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

let push: ((r: Request) => void) | null = null;

export function confirmDialog(message: string, opts: Omit<Request, 'message' | 'resolve'> = {}): Promise<boolean> {
  return new Promise((resolve) => {
    if (!push) return resolve(window.confirm(message)); // Rückfall, falls noch nichts gerendert ist
    push({ message, ...opts, resolve });
  });
}

export function ConfirmHost() {
  const [req, setReq] = useState<Request | null>(null);
  useEffect(() => {
    push = setReq;
    return () => { push = null; };
  }, []);
  if (!req) return null;
  // Erste Frage als Überschrift, der Rest als Erklärung
  const q = req.message.indexOf('?');
  const title = q > 0 ? req.message.slice(0, q + 1) : req.message;
  const body = q > 0 ? req.message.slice(q + 1).trim() : '';
  const close = (ok: boolean) => { req.resolve(ok); setReq(null); };
  return (
    <Dialog title={title} onClose={() => close(false)}>
      {body && <p style={{ margin: 0 }}>{body}</p>}
      {/* Untereinander und volle Breite: auch lange Beschriftungen passen, Daumen erreicht beide */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button type="button" className={req.danger ? 'btn danger' : 'btn'} autoFocus onClick={() => close(true)}>
          {req.confirmLabel ?? t('Bestätigen')}
        </button>
        <button type="button" className="btn outline" onClick={() => close(false)}>{req.cancelLabel ?? t('Abbrechen')}</button>
      </div>
    </Dialog>
  );
}
