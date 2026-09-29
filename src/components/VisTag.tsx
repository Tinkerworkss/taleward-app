import { t } from '../i18n';
import { IconEye, IconLock } from './Icons';

/** Sichtbarkeit – immer Symbol plus Wort, nie nur Farbe (Markenhandbuch) */
export function VisTag({ gm }: { gm: boolean }) {
  return gm
    ? <span className="vis gm"><IconLock size={16} /> {t('Nur SL')}</span>
    : <span className="vis public"><IconEye size={16} /> {t('Öffentlich')}</span>;
}

/** Geheimer Teil (gmNotes) im Kasten auf siegel-soft */
export function SecretBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="secret-box">
      <span className="secret-label"><IconLock size={14} /> {t('Nur SL')}</span>
      {children}
    </div>
  );
}
