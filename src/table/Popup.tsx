import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../i18n';

/** Ein Modul groß über dem Schirm; schließt mit „Schließen“ oder Escape, der Fokus kehrt zurück */
export function Popup({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      before?.focus?.();
    };
  }, [onClose]);
  return createPortal(
    <div className="table-popup-shade" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="table-popup table-panel" onClick={(e) => e.stopPropagation()}>
        <div className="table-panel-head">
          <h2 className="table-panel-title">{title}</h2>
          <button ref={close} type="button" className="btn small outline" onClick={onClose}>{t('Schließen')}</button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
