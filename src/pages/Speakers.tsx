import { p } from '../api/connections';
import { t } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, isApiError } from '../api/client';
import type { Campaign, Speaker } from '../api/types';
import { IconPlay } from '../components/Icons';
import { ErrorBox, Screen } from '../components/Screen';

const IGNORE = '__ignore';

export function Speakers() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const [speakers, setSpeakers] = useState<Speaker[] | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const session = await api.session(sessionId);
        const [c, sp] = await Promise.all([api.campaign(session.campaignId), api.speakers(sessionId)]);
        setCampaign(c);
        setSpeakers(sp);
        setMapping(Object.fromEntries(sp.map((s) => [s.id, s.suggestedMemberId ?? ''])));
      } catch (e) {
        setError(e);
      }
    })();
  }, [sessionId]);

  const play = async (speakerId: string) => {
    try {
      // Hörprobe mit Token laden, dann lokal abspielen
      let blob: Blob;
      try {
        blob = await api.speakerSample(sessionId, speakerId);
      } catch (e) {
        if (isApiError(e) && e.status === 410) throw new Error(t('Die Aufnahme ist schon gelöscht, Hörproben gibt es nicht mehr.'));
        throw e;
      }
      const url = URL.createObjectURL(blob);
      audio.current?.pause();
      audio.current = new Audio(url);
      await audio.current.play();
    } catch (e) {
      setError(e);
    }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      await api.assignSpeakers(
        sessionId,
        Object.entries(mapping).map(([speakerId, v]) => ({ speakerId, memberId: v === IGNORE ? null : v }))
      );
      navigate(p(`/s/${sessionId}`), { replace: true });
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  };

  const complete = speakers?.every((s) => mapping[s.id]) ?? false;
  const autoCount = speakers?.filter((s) => s.source === 'intro_round' || s.source === 'voice_match').length ?? 0;

  return (
    <Screen narrow back title={t('Stimmen zuordnen')} overline={t('Transkript fertig')}>
      <ErrorBox error={error} />
      {speakers && (
        <p className="muted small" style={{ margin: 0 }}>
          {t('{n} Stimmen erkannt, {auto} davon automatisch zugeordnet.', { n: speakers.length, auto: autoCount })}
        </p>
      )}

      {speakers?.map((s) => {
        const unsure = !mapping[s.id];
        return (
          <div key={s.id} className={unsure ? 'card warn' : 'card'}>
            <div className="row">
              <button type="button" className="icon-btn" aria-label={t('Hörprobe {label} abspielen', { label: s.label })} onClick={() => play(s.id)}>
                <IconPlay />
              </button>
              <div style={{ flex: 1 }}>
                <div className="card-title">{s.label}</div>
                <div className="quote">{s.sampleText}</div>
                {s.source === 'voice_match' && <div className="muted small">{t('Über Stimmprofil erkannt')}</div>}
                {s.source === 'intro_round' && <div className="muted small">{t('Aus der Vorstellungsrunde')}</div>}
                {s.suggestedMemberId && s.confidence < 0.8 && mapping[s.id] === s.suggestedMemberId && (
                  <div className="small" style={{ color: 'var(--siegel-text)', fontWeight: 500 }}>{t('Unsicher – bitte prüfen.')}</div>
                )}
              </div>
            </div>
            <div className="field">
              <label htmlFor={`sp-${s.id}`}>{t('Person')}</label>
              <select id={`sp-${s.id}`} value={mapping[s.id] ?? ''} onChange={(e) => setMapping({ ...mapping, [s.id]: e.target.value })}>
                <option value="">{t('Bitte wählen …')}</option>
                {campaign?.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName} · {m.characterName ?? t('Spielleitung')}
                  </option>
                ))}
                <option value={IGNORE}>{t('Gast / ignorieren')}</option>
              </select>
            </div>
            {unsure && <strong style={{ color: 'var(--seal)', fontSize: 15 }}>{t('Nicht automatisch erkannt – bitte auswählen.')}</strong>}
          </div>
        );
      })}

      {speakers?.length === 0 && (
        <div className="empty">{t('Noch keine Stimmen vom Server. Du kannst trotzdem weitermachen.')}</div>
      )}

      {speakers && (
        <button type="button" className="btn" disabled={!complete || busy} onClick={confirm}>
          {busy ? t('Wird gesendet …') : t('Zusammenfassung erstellen')}
        </button>
      )}
    </Screen>
  );
}
