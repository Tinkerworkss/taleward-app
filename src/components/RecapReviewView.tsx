import { useState } from 'react';
import { api } from '../api/client';
import type { Member, Recap, ReviewVerdict, TranscriptSegment } from '../api/types';
import { t } from '../i18n';
import { Dialog } from './Dialog';
import { IconCheck } from './Icons';
import { ErrorBox } from './Screen';

/*
 * Gegenprüfung des Recap-Entwurfs (Schnittstelle 0.4.6, nur SL): Prüfbericht als Satz, je Absatz eine Randmarke
 * mit Symbol und Wort, aufklappbar mit Begründung und Belegstellen. Farben nach Markenhandbuch:
 * salbei = belegt, messing = teilweise (nur als Rand, nie als Schrift), siegel = nicht belegt / widersprochen,
 * grau = außerhalb des Spiels / nicht geprüft.
 */

const svg = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

function VerdictIcon({ verdict }: { verdict: ReviewVerdict }) {
  switch (verdict) {
    case 'supported': return <IconCheck size={16} />;
    case 'partial': return <svg {...svg}><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" /></svg>;
    case 'unsupported': return <svg {...svg}><circle cx="12" cy="12" r="8" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.4M12 16.5v.01" /></svg>;
    case 'contradicted': return <svg {...svg}><path d="M6 6l12 12M18 6 6 18" /></svg>;
    case 'off_game': return <svg {...svg}><path d="M4 12h16" /><path d="M8 8l-4 4 4 4M16 8l4 4-4 4" /></svg>;
    default: return <svg {...svg}><path d="M7 12h10" /></svg>;
  }
}

function verdictLabel(v: ReviewVerdict): string {
  switch (v) {
    case 'supported': return t('Belegt');
    case 'partial': return t('Teilweise belegt');
    case 'unsupported': return t('Nicht belegt');
    case 'contradicted': return t('Widerspricht dem Transkript');
    case 'off_game': return t('Vermutlich außerhalb des Spiels');
    default: return t('Nicht geprüft');
  }
}

/** Sekunden → 1:02:03 bzw. 12:34 */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** Prüfbericht als ein Satz, z. B. „3 Absätze: 1 belegt, 1 teilweise, 1 nicht belegt.“ */
export function reportSentence(recap: Recap): string | null {
  const r = recap.review?.report;
  if (!r) return null;
  const parts = [
    r.supported ? t('{n} belegt', { n: r.supported }) : '',
    r.partial ? t('{n} teilweise', { n: r.partial }) : '',
    r.unsupported ? t('{n} nicht belegt', { n: r.unsupported }) : '',
    r.contradicted ? t('{n} widersprechen dem Transkript', { n: r.contradicted }) : '',
    r.offGame ? t('{n} vermutlich außerhalb des Spiels', { n: r.offGame }) : ''
  ].filter(Boolean);
  return t('{total} Absätze geprüft: {parts}.', { total: r.total, parts: parts.join(', ') });
}

/** Braucht der Entwurf Aufmerksamkeit? (dann klappt die Ansicht von selbst auf) */
export function reviewNeedsAttention(recap: Recap): boolean {
  const r = recap.review;
  return !!r && r.state === 'done' && r.paragraphs.some((p) => p.verdict === 'unsupported' || p.verdict === 'contradicted' || p.verdict === 'partial');
}

export function RecapReviewView({ sessionId, recap, members = [], showReport = true }: {
  sessionId: string;
  recap: Recap;
  members?: Member[];
  /** Prüfbericht-Satz zeigen (aus, wenn er schon in der Überschrift steht) */
  showReport?: boolean;
}) {
  const review = recap.review;
  const paragraphs = recap.text.split(/\n\s*\n/);
  const [transcript, setTranscript] = useState<TranscriptSegment[] | null>(null);
  const [excerptAt, setExcerptAt] = useState<number | null>(null);
  const [error, setError] = useState<unknown>(null);

  const speaker = (memberId: string | null) => {
    const m = memberId ? members.find((x) => x.id === memberId) : undefined;
    return m ? (m.role === 'gm' ? t('SL') : m.characterName || m.displayName) : null;
  };

  const showExcerpt = async (start: number) => {
    setExcerptAt(start);
    if (transcript) return;
    try {
      setTranscript(await api.transcript(sessionId));
    } catch (e) {
      setError(e);
    }
  };

  if (!review || review.state === 'skipped') {
    return <div className="recap" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{paragraphs.map((para, i) => <p key={i}>{para}</p>)}</div>;
  }

  const excerpt = excerptAt === null || !transcript ? [] : transcript.filter((s) => s.end >= excerptAt - 60 && s.start <= excerptAt + 60);
  const closest = excerpt.reduce<TranscriptSegment | null>((best, s) => (!best || Math.abs(s.start - excerptAt!) < Math.abs(best.start - excerptAt!) ? s : best), null);

  return (
    <div className="review">
      {review.state === 'pending' && <p className="muted small" style={{ margin: 0 }}>{t('Die Gegenprüfung läuft noch.')}</p>}
      {showReport && review.state === 'done' && <p className="small" style={{ margin: 0 }}><strong>{reportSentence(recap)}</strong></p>}
      {review.stale && <p className="muted small" style={{ margin: 0 }}>{t('Die Prüfung ist von vor deiner Änderung – die Zuordnung der Absätze kann verrutscht sein.')}</p>}
      {review.revised && <p className="muted small" style={{ margin: 0 }}>{t('Beanstandete Absätze wurden einmal neu geschrieben.')}</p>}

      {paragraphs.map((para, i) => {
        const info = review.paragraphs.find((x) => x.index === i);
        const verdict: ReviewVerdict = info?.verdict ?? 'unchecked';
        const hasDetails = !!info && (!!info.note || info.evidence.length > 0);
        return (
          <div key={i} className={`review-para v-${verdict}`}>
            <span className="review-mark"><VerdictIcon verdict={verdict} /> {verdictLabel(verdict)}</span>
            <div className="recap"><p>{para}</p></div>
            {hasDetails && (
              <details>
                <summary className="small">{info!.evidence.length ? t('Belege ({n})', { n: info!.evidence.length }) : t('Begründung')}</summary>
                {info!.note && <p className="small" style={{ margin: '6px 0' }}>{info!.note}</p>}
                {info!.evidence.map((ev, k) => (
                  <div key={k} className="review-evidence">
                    <span className="small">„{ev.quote}“</span>
                    <span className="row wrap small muted" style={{ gap: 8 }}>
                      <span>{clock(ev.start)}{speaker(ev.speakerMemberId) ? ' · ' + speaker(ev.speakerMemberId) : ''}</span>
                      <button type="button" className="btn small ghost" onClick={() => showExcerpt(ev.start)}>{t('Im Transkript zeigen')}</button>
                    </span>
                  </div>
                ))}
              </details>
            )}
          </div>
        );
      })}

      {excerptAt !== null && (
        <Dialog title={t('Transkript um {time}', { time: clock(excerptAt) })} onClose={() => setExcerptAt(null)}>
          <ErrorBox error={error} />
          {!transcript && !error && <p className="muted">{t('Wird geladen …')}</p>}
          {transcript && excerpt.length === 0 && <p className="muted">{t('An dieser Stelle ist das Transkript leer.')}</p>}
          {excerpt.map((s) => (
            <p key={s.start} className={s === closest ? 'transcript-line hit' : 'transcript-line'}>
              <span className="muted small">{clock(s.start)}{speaker(s.memberId) ? ' · ' + speaker(s.memberId) : ''}</span>
              <br />{s.text}
            </p>
          ))}
          <button type="button" className="btn small outline" onClick={() => setExcerptAt(null)}>{t('Schließen')}</button>
        </Dialog>
      )}
    </div>
  );
}
