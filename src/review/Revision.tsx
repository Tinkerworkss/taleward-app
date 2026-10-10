import { useEffect, useState } from 'react';
import { api, isApiError } from '../api/client';
import type { Recap } from '../api/types';
import { t, tn } from '../i18n';
import { ErrorBox } from '../components/Screen';
import { wordDiff } from './wordDiff';

/*
 * Kapitel per Hinweis korrigieren (Schnittstelle 0.4.15, nur SL). Bewusst schmal: ein Feld, ein Knopf. Der Server
 * ordnet die Hinweise selbst den Absätzen zu und legt einen Entwurf vor; die App zeigt ihn wie eine Korrektur auf
 * Papier (neu unterstrichen, gestrichen durchgestrichen) mit „Übernehmen“ / „Verwerfen“ für das Ganze.
 */

/** Liegt ein Entwurf vor oder läuft einer? Dann ist Bearbeiten von Hand gesperrt. */
export function revisionOpen(recap: Recap): boolean {
  return recap.revision?.state === 'running' || recap.revision?.state === 'ready';
}

/** Das Kapitel mit den vorgeschlagenen Änderungen im Text */
export function RevisionDraft({ recap }: { recap: Recap }) {
  const v = recap.revision;
  if (!v || v.state !== 'ready') return null;
  const paragraphs = recap.text.split(/\n\s*\n/);
  return (
    <div className="recap revision-draft" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {paragraphs.map((para, i) => {
        const change = v.changes.find((c) => c.index === i);
        if (!change) return <p key={i}>{para}</p>;
        return (
          <p key={i} className="revision-changed">
            {wordDiff(change.before, change.after).map((part, k) =>
              part.kind === 'same' ? <span key={k}>{part.text}</span>
                : part.kind === 'del' ? <del key={k}>{part.text}</del>
                  : <ins key={k}>{part.text}</ins>
            )}
          </p>
        );
      })}
    </div>
  );
}

/** Feld „Stimmt etwas nicht oder fehlt etwas?“ bzw. Stand des Auftrags und die Entscheidung */
export function RevisionBox({ sessionId, recap, onRecap }: { sessionId: string; recap: Recap; onRecap: (r: Recap) => void }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const v = recap.revision;

  // Während der Server korrigiert, alle paar Sekunden nachsehen
  useEffect(() => {
    if (v?.state !== 'running') return;
    const timer = window.setTimeout(() => { api.recap(sessionId).then(onRecap).catch(setError); }, 2500);
    return () => window.clearTimeout(timer);
  }, [v?.state, recap, sessionId, onRecap]);

  const run = async (action: () => Promise<Recap>, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      onRecap(await action());
      after?.();
    } catch (e) {
      setError(e);
      // Hat sich das Kapitel geändert, den aktuellen Stand holen
      if (isApiError(e) && e.status === 409) api.recap(sessionId).then(onRecap).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  if (v?.state === 'running') {
    return <p className="muted small" role="status" style={{ margin: 0 }}>{t('Wird korrigiert …')}</p>;
  }

  if (v?.state === 'ready') {
    const missed = v.notes.filter((n) => !n.applied);
    return (
      <div className="revision-box">
        <ErrorBox error={error} />
        <p className="small" style={{ margin: 0 }}>
          {v.changes.length
            ? tn(v.changes.length, 'Vorschlag: {n} Absatz geändert. Neues ist unterstrichen, Gestrichenes durchgestrichen.', 'Vorschlag: {n} Absätze geändert. Neues ist unterstrichen, Gestrichenes durchgestrichen.')
            : t('Es wurde nichts geändert.')}
        </p>
        {missed.map((n, i) => (
          <p key={i} className="small muted" style={{ margin: 0 }}>
            {t('Dazu wurde nichts geändert: {q} Schreib es noch einmal eindeutig: wer tat was.', { q: t('„{q}“', { q: n.text }) })}
          </p>
        ))}
        <div className="row wrap" style={{ gap: 8 }}>
          {v.changes.length > 0 && (
            <button type="button" className="btn small" disabled={busy} onClick={() => run(() => api.decideRevision(sessionId, true), () => setNote(''))}>{t('Übernehmen')}</button>
          )}
          <button type="button" className="btn small outline" disabled={busy} onClick={() => run(() => api.decideRevision(sessionId, false))}>
            {v.changes.length ? t('Verwerfen') : t('Schließen')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="revision-box">
      {v?.state === 'failed' && (
        <p className="small" role="alert" style={{ margin: 0 }}>{v.message || t('Die Korrektur hat nicht geklappt. Versuch es noch einmal.')}</p>
      )}
      <ErrorBox error={error} />
      <div className="field">
        <label htmlFor={`rev-${sessionId}`}>{t('Stimmt etwas nicht oder fehlt etwas?')}</label>
        <textarea id={`rev-${sessionId}`} rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder={t('In deinen Worten, z. B.: Das Schwert heißt Eisenschwert. Pipo stirbt nicht, er bleibt verletzt zurück.')} />
        <span className="muted small">{t('Nur du siehst das. Geändert werden nur die betroffenen Absätze, und du entscheidest danach.')}</span>
      </div>
      <button type="button" className="btn small outline" style={{ alignSelf: 'flex-start' }} disabled={busy || !note.trim()}
        onClick={() => run(() => api.requestRevision(sessionId, note.trim(), recap.text))}>
        {t('Korrigieren lassen')}
      </button>
    </div>
  );
}
