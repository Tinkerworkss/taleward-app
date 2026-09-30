import { isDeletedMember } from '../api/types';
import { confirmDialog } from '../components/confirm';
import { p } from '../api/connections';
import { t, tn } from '../i18n';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, isApiError } from '../api/client';
import type { Member, Proposal, Recap, Session } from '../api/types';
import { ProposalCard } from '../components/ProposalCard';
import { IconLock } from '../components/Icons';
import { ErrorBox, Screen } from '../components/Screen';
import { RecapReviewView, reportSentence, reviewNeedsAttention } from '../components/RecapReviewView';
import { namesSkipped, serverHasNameCheck } from './NamesPage';

export function Review() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [recap, setRecap] = useState<Recap | null>(null);
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [players, setPlayers] = useState<Member[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  // Unsichere Namen (ab 0.4.6): eigener Schritt davor; übersprungen → hier nur noch als Hinweis
  const [termCount, setTermCount] = useState(0);
  const [note, setNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const recapOrNull = api.recap(sessionId).catch((e) => {
      if (isApiError(e) && e.status === 404) return null;
      throw e;
    });
    Promise.all([api.session(sessionId), recapOrNull, api.proposals(sessionId), api.gmNote(sessionId)])
      .then(([s, r, p, n]) => {
        setSession(s);
        api.campaign(s.campaignId).then((c) => {
          setMembers(c.members);
          setPlayers(c.members.filter((m) => m.role === 'player' && !isDeletedMember(m)));
        }).catch(() => undefined);
        setRecap(r);
        setProposals(p);
        setNote(n.text);
      })
      .catch(setError);
    if (serverHasNameCheck()) {
      api.uncertainTerms(sessionId).then((u) => {
        if (u.terms.length > 0 && !namesSkipped(sessionId)) navigate(p(`/s/${sessionId}/namen`), { replace: true });
        else setTermCount(u.terms.length);
      }).catch(() => undefined); // Namensprüfung ist freiwillig – Fehler hier stören das Prüfen nicht
    }
  }, [sessionId, navigate]);


  const saveNote = async () => {
    if (noteSaved) return;
    try {
      await api.saveGmNote(sessionId, note);
      setNoteSaved(true);
    } catch (e) {
      setError(e);
    }
  };

  const openCount = proposals?.filter((p) => p.decision === 'open').length ?? 0;

  const bulk = (decision: 'accepted' | 'rejected') =>
    Promise.all((proposals ?? []).filter((p) => p.decision === 'open').map((p) => api.decide(p.id, { decision })))
      .then((updated) => setProposals((list) => list?.map((x) => updated.find((u) => u.id === x.id) ?? x) ?? null))
      .catch(setError);

  const publish = async () => {
    if (openCount > 0 && !(await confirmDialog(tn(openCount, '{n} Vorschlag ist noch offen und wird verworfen. Trotzdem veröffentlichen?', '{n} Vorschläge sind noch offen und werden verworfen. Trotzdem veröffentlichen?'), { confirmLabel: t('Veröffentlichen') }))) return;
    setBusy(true);
    try {
      await saveNote();
      const s = await api.publish(sessionId);
      navigate(p(`/k/${s.campaignId}/chronik`), { replace: true });
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  };

  return (
    <Screen
      back
      overline={<span className="row" style={{ gap: 6 }}><IconLock size={14} /> {session ? t('Kapitel {n}', { n: session.number }) + ' · ' + t('nur für dich') : t('Nur für dich')}</span>}
      title={t('Vorschläge prüfen')}
    >
      <ErrorBox error={error} />

      {/* Breit: links Recap, Notiz und Veröffentlichen – rechts die Vorschläge; schmal in dieser Reihenfolge untereinander */}
      <div className="split">
      <div className="a">
      {termCount > 0 && (
        <button type="button" className="btn small outline" style={{ alignSelf: 'flex-start' }} onClick={() => navigate(p(`/s/${sessionId}/namen`))}>
          {tn(termCount, '{n} unsicheren Namen prüfen', '{n} unsichere Namen prüfen')}
        </button>
      )}
      {recap && <RecapEditor sessionId={sessionId} recap={recap} members={members} onSaved={setRecap} onError={setError} />}
      </div>

      <div className="b">
      <p className="muted small" style={{ margin: 0 }}>
        {t('Nur Übernommenes kommt in die Bibel.')}
      </p>

      {/* Bei vielen Vorschlägen: alles Offene auf einmal entscheiden */}
      {proposals && openCount > 1 && (
        <div className="row wrap" style={{ gap: 8 }}>
          <button type="button" className="btn small moss outline" onClick={() => bulk('accepted')}>{t('Alle offenen übernehmen')}</button>
          <button type="button" className="btn small outline" onClick={() => bulk('rejected')}>{t('Alle offenen verwerfen')}</button>
        </div>
      )}
      {proposals?.map((p) => (
        <ProposalCard key={p.id} proposal={p} players={players} onError={setError}
          onChange={(u) => setProposals((list) => list?.map((x) => (x.id === u.id ? u : x)) ?? null)} />
      ))}

      {proposals?.length === 0 && (
        <div className="empty">{t('Für dieses Kapitel gibt es keine Vorschläge für die Bibel.')}</div>
      )}
      </div>

      <div className="c">

      {proposals && (
        <div className="card secret">
          <label htmlFor="gm-note" className="row" style={{ gap: 8, fontFamily: 'var(--display)', fontWeight: 700 }}>
            <IconLock /> {t('Geheime SL-Notiz')}
          </label>
          <textarea
            id="gm-note"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setNoteSaved(false);
            }}
            onBlur={saveNote}
            style={{ background: 'var(--paper-raised)' }}
          />
          <div className="muted small">{t('Erscheint nie im Recap oder in der Spieleransicht.')}{noteSaved ? '' : ' ' + t('Wird beim Verlassen des Feldes gespeichert.')}</div>
        </div>
      )}

      {proposals && (
        <>
          <p className="muted" style={{ margin: 0, textAlign: 'center' }}>
            {t('{done} von {total} Vorschlägen geprüft', { done: proposals.length - openCount, total: proposals.length })}
          </p>
          <button type="button" className="btn" disabled={busy} onClick={publish}>
            {busy ? t('Wird veröffentlicht …') : t('Recap veröffentlichen')}
          </button>
        </>
      )}
      </div>
      </div>
    </Screen>
  );
}

/**
 * Recap-Entwurf vor dem Veröffentlichen: lesen und bei Bedarf korrigieren (Titel, Text, offene Fäden) –
 * z. B. falsch geschriebene Namen. Der Server nimmt Änderungen nur bis zum Veröffentlichen an.
 */
function RecapEditor({ sessionId, recap, members, onSaved, onError }: {
  sessionId: string;
  recap: Recap;
  members: Member[];
  onSaved: (r: Recap) => void;
  onError: (e: unknown) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(recap.title);
  const [text, setText] = useState(recap.text);
  const [threads, setThreads] = useState(recap.openThreads.join('\n'));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      onSaved(await api.updateRecap(sessionId, {
        title: title.trim(), text: text.trim(), openThreads: threads.split('\n').map((x) => x.trim()).filter(Boolean)
      }));
      setEditing(false);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <section className="card">
        <h2>{t('Recap bearbeiten')}</h2>
        <div className="field">
          <label htmlFor="rc-title">{t('Titel')}</label>
          <input id="rc-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="rc-text">{t('Text')}</label>
          <textarea id="rc-text" rows={12} value={text} onChange={(e) => setText(e.target.value)} />
          <span className="muted small">{t('Absätze durch eine Leerzeile trennen.')}</span>
        </div>
        <div className="field">
          <label htmlFor="rc-threads">{t('Offene Fäden (einer pro Zeile)')}</label>
          <textarea id="rc-threads" rows={4} value={threads} onChange={(e) => setThreads(e.target.value)} />
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn small" disabled={busy || !title.trim() || !text.trim()} onClick={save}>{t('Speichern')}</button>
          <button type="button" className="btn small outline" onClick={() => setEditing(false)}>{t('Abbrechen')}</button>
        </div>
      </section>
    );
  }

  return (
    <details className="card" open={reviewNeedsAttention(recap) || undefined}>
      <summary style={{ cursor: 'pointer', minHeight: 32 }}>
        <strong>{t('Recap-Entwurf:')}</strong> {recap.title}
        {recap.review?.state === 'done' && <span className="muted small" style={{ display: 'block' }}>{reportSentence(recap)}</span>}
      </summary>
      {/* Mit Gegenprüfung (ab 0.4.6) je Absatz eine Randmarke mit Belegen, sonst der reine Text */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        <RecapReviewView sessionId={sessionId} recap={recap} members={members} showReport={false} />
      </div>
      {recap.openThreads.length > 0 && (
        <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
          {recap.openThreads.map((x) => <li key={x}>{x}</li>)}
        </ul>
      )}
      <button type="button" className="btn small outline" style={{ alignSelf: 'flex-start', marginTop: 10 }}
        onClick={() => { setTitle(recap.title); setText(recap.text); setThreads(recap.openThreads.join('\n')); setEditing(true); }}>
        {t('Recap bearbeiten')}
      </button>
    </details>
  );
}
