import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { endMuster, musterConnection, musterPath, startMuster } from '../api/musterRuntime';
import type { MusterRole } from '../api/muster';
import { t } from '../i18n';
import { confirmDialog } from './confirm';
import { ErrorBox } from './Screen';

/** „Ohne Server ausprobieren“ auf der Verbinden-Seite: Musterkampagne als Spielleitung oder Spielerin öffnen */
export function MusterTry() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const existing = musterConnection();

  const open = async (role: MusterRole) => {
    setBusy(true);
    setError(null);
    try {
      const conn = await startMuster(role);
      // Neu laden, damit alle Teile der App den neuen Server kennen
      navigate(musterPath(conn), { replace: true });
      window.location.reload();
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  };

  return (
    <section className="card" aria-labelledby="muster-title">
      <h2 id="muster-title">{t('Ohne Server ausprobieren')}</h2>
      <p className="muted small" style={{ margin: 0 }}>
        {t('Eine erfundene Kampagne mit acht Kapiteln, Bibel, Geheimnissen und Charakteren. Alles bleibt auf diesem Gerät, nichts geht ins Netz.')}
      </p>
      <ErrorBox error={error} />
      {existing ? (
        <button type="button" className="btn outline" onClick={() => navigate(musterPath(existing))}>{t('Zur Musterkampagne')}</button>
      ) : (
        <>
          <span className="muted small">{t('Als Spielleitung prüfst du Kapitel 8, Stimmen und Unterlagen. Als Spielerin liest du nach, kommentierst und siehst deinen Charakter.')}</span>
          <div className="row wrap" style={{ gap: 8 }}>
            <button type="button" className="btn outline" disabled={busy} onClick={() => open('anja')}>{t('Als Spielleitung')}</button>
            <button type="button" className="btn outline" disabled={busy} onClick={() => open('lea')}>{t('Als Spielerin')}</button>
          </div>
        </>
      )}
    </section>
  );
}

/** Hinweis in der Kampagnenliste, solange die Musterkampagne läuft */
export function MusterNotice() {
  if (!musterConnection()) return null;
  const end = async () => {
    const ok = await confirmDialog(
      t('Musterkampagne beenden? Sie verschwindet mit ihren Charakteren von diesem Gerät. Deine eigenen Kampagnen und Charaktere bleiben.'),
      { confirmLabel: t('Beenden'), danger: true }
    );
    if (ok) endMuster();
  };
  return (
    <section className="card" aria-labelledby="muster-notice">
      <strong id="muster-notice">{t('Musterkampagne')}</strong>
      <span className="muted small">{t('Alles darin ist erfunden und bleibt auf diesem Gerät. Was du änderst, ist nach einem Neustart der App wieder wie vorher.')}</span>
      <button type="button" className="btn small ghost" style={{ alignSelf: 'flex-start' }} onClick={end}>{t('Musterkampagne beenden')}</button>
    </section>
  );
}
