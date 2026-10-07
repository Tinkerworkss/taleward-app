import { VoiceProfileHint } from '../components/VoiceProfileHint';
import { CloudNotice, cloudUse, providerName, useServerInfo } from '../components/CloudNotice';
import { isDeletedMember } from '../api/types';
import { InviteBox } from '../components/InviteBox';
import { confirmDialog } from '../components/confirm';
import { PENDING_LABEL } from './Chronicle';
import { GameSystemFields, systemLabel } from '../components/GameSystemFields';
import { apiAtLeast, p } from '../api/connections';
import { OpenSeatDialog, OrphanNoticeCard, SeatClaimedCard } from '../components/Seats';
import { characterIncomplete } from '../components/CharacterForm';
import { Avatar } from '../components/Avatar';
import { hasCover } from '../covers/CampaignCover';
import { CoverPicker } from '../covers/CoverPicker';
import { getLang, t, tn } from '../i18n';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { Campaign, GameSystem, GmNotice, Member, SessionSummary, Usage } from '../api/types';
import { IconInfo, IconLock } from '../components/Icons';
import { Divider, ErrorBox, Screen, rememberCampaign } from '../components/Screen';
import { formatDateFull, formatDateTime } from '../components/format';
import { CONSENT_STANDING, CONSENT_SUMMARY } from '../consent';

/** Startseite einer Kampagne: Stand, Welt-Hintergrund, Mitspielende, Einladen. */
const needsMe = (state: SessionSummary['state']) => state === 'awaiting_speakers' || state === 'awaiting_review' || state === 'failed';

export function Overview() {
  const { campaignId = '' } = useParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [pickingCover, setPickingCover] = useState(false);

  const load = async () => {
    try {
      const [c, s] = await Promise.all([api.campaign(campaignId), api.sessions(campaignId)]);
      rememberCampaign(c);
      setCampaign(c);
      setSessions(s);
    } catch (e) {
      setError(e);
    }
  };

  useEffect(() => {
    setCampaign(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const gm = campaign?.myRole === 'gm';
  const { user } = useAuth();
  const me = campaign?.members.find((m) => m.userId === user?.id);
  const serverInfo = useServerInfo();
  const pending = sessions?.filter((s) => s.state !== 'published') ?? [];
  const latest = sessions?.find((s) => s.state === 'published');

  return (
    <Screen backTo={{ to: '/', label: t('Alle Kampagnen') }} overline={gm ? t('Du leitest') : campaign?.myCharacterName ? t('Du spielst {name}', { name: campaign.myCharacterName }) : ' '} title={campaign?.title ?? ' '} hero={{ campaign, large: true }}>
      <ErrorBox error={error} />
      {!campaign && !error && <div className="empty">{t('Lade …')}</div>}

      {campaign && (
        <>
          {gm && !pickingCover && (
            <button type="button" className="btn ghost small" style={{ alignSelf: 'flex-end', marginTop: hasCover(campaign) ? -6 : 0 }} onClick={() => setPickingCover(true)}>
              {hasCover(campaign) ? t('Titelbild ändern') : t('Titelbild wählen')}
            </button>
          )}
          {gm && pickingCover && <CoverPicker campaign={campaign} onChanged={setCampaign} onClose={() => setPickingCover(false)} />}

          {(campaign.description || systemLabel(campaign.system, campaign.systemName)) && (
            <p className="muted" style={{ margin: 0 }}>
              {systemLabel(campaign.system, campaign.systemName) && <strong>{systemLabel(campaign.system, campaign.systemName)}</strong>}
              {systemLabel(campaign.system, campaign.systemName) && campaign.description ? ' · ' : ''}
              {campaign.description}
            </p>
          )}

          {campaign.archivedAt && (
            <div className="notice"><strong>{t('Abgeschlossen')}</strong>&nbsp;{t('– nur noch zum Nachlesen, keine neuen Kapitel.')}</div>
          )}
          <div className="split">
          <div className="a">
          {/* Zuerst, was jetzt zu tun ist: Zustimmung (nur wenn sie fehlt), Charakter, offenes Kapitel, Termin, neuer Recap */}
          {me && !me.recordingConsentAt && <RecordingConsent campaign={campaign} onChanged={load} />}
          {characterIncomplete(me) && (
            <Link to={p(`/k/${campaignId}/charakter/${me!.id}`)} className="card warn">
              <strong>{t('Dein Charakter ist noch unvollständig')}</strong>
              <span className="muted small">{t('Name, Bild und Kurzbeschreibung helfen allen am Tisch.')}</span>
            </Link>
          )}

          {/* Stand der Kampagne */}
          {gm && pending.length > 0 && (
            <Link to={p(`/s/${pending[0].id}`)} className={needsMe(pending[0].state) ? 'card warn' : 'card'}>
              <div className="row between">
                <strong>{t('Kapitel {n}', { n: pending[0].number })}</strong>
                {/* Rot nur, wenn die SL etwas tun muss; sonst arbeitet gerade der Server */}
                <span className={needsMe(pending[0].state) ? 'pill seal' : 'pill'}>
                  {PENDING_LABEL[pending[0].state] ? t(PENDING_LABEL[pending[0].state]!) : pending[0].state}
                </span>
              </div>
              <span className="muted small">
                {needsMe(pending[0].state)
                  ? t('Tippen, um weiterzumachen.')
                  : t('Der Server arbeitet. Tippen für den Fortschritt.')}
                {pending.length > 1 ? ' ' + t('Insgesamt {n} Kapitel in Arbeit.', { n: pending.length }) : ''}
              </span>
            </Link>
          )}
          {gm && !!campaign.openCharacterProposals && (
            <Link to={p(`/k/${campaignId}/mitgebracht`)} className="card warn">
              <div className="row between">
                <strong>{t('Mitgebrachte Welt')}</strong>
                <span className="pill seal">{tn(campaign.openCharacterProposals, '{n} offen', '{n} offen')}</span>
              </div>
              <span className="muted small">{t('Die Charaktere bringen Einträge für die Bibel mit. Tippen zum Prüfen.')}</span>
            </Link>
          )}
          {gm && campaign.gmNotices?.map((n) => <GmNoticeCard key={n.id} campaign={campaign} notice={n} onDone={load} />)}
          {/* Nächste Runde */}
          <Link to={p(`/k/${campaignId}/termin`)} className={campaign.datePollNeedsMyVote ? 'card warn' : 'card'}>
            <div className="row between">
              <span className="overline">{t('Nächste Runde')}</span>
              {campaign.datePollNeedsMyVote && <span className="pill seal">{t('Abstimmen')}</span>}
            </div>
            {campaign.nextSessionAt
              ? <strong style={{ fontFamily: 'var(--display)', fontSize: 19 }}>{formatDateTime(campaign.nextSessionAt)}</strong>
              : <strong>{campaign.datePollNeedsMyVote ? t('Terminabstimmung läuft') : t('Noch kein Termin')}</strong>}
            <span className="muted small">
              {campaign.datePollNeedsMyVote ? t('Sag, welche Termine dir passen.') : gm ? t('Termin abstimmen oder Stand ansehen') : t('Terminabstimmung ansehen')}
            </span>
          </Link>

          {latest && (
            <Link to={p(`/s/${latest.id}/recap`)} className="card">
              <div className="row between">
                <span className="overline">{t('Zuletzt gespielt')} · {t('Kapitel {n}', { n: latest.number })}</span>
                {!!campaign.unread?.recaps && <span className="pill seal">{t('Neu')}</span>}
              </div>
              <strong>{latest.title ?? t('Kapitel {n}', { n: latest.number })}</strong>
              <span className="muted small">
                {t('Recap lesen')}
                {!!latest.unreadComments && ` · ${tn(latest.unreadComments, '{n} neuer Kommentar', '{n} neue Kommentare')}`}
              </span>
            </Link>
          )}
          {sessions?.length === 0 && (
            <div className="notice">
              <span style={{ flexShrink: 0, color: 'var(--ink-faint)' }}><IconInfo /></span>
              <span>{gm ? t('Noch kein Kapitel. Nimm unten über „Aufnahme“ die erste Runde auf.') : t('Noch kein Kapitel veröffentlicht.')}</span>
            </div>
          )}

          <CloudNotice info={serverInfo} campaign={campaign} />
          <Divider />
          <WorldInfo campaign={campaign} onSaved={setCampaign} />
          </div>

          <div className="b">
          <Divider />
          <Members campaign={campaign} onChanged={load} />
          {me?.recordingConsentAt && <RecordingConsent campaign={campaign} onChanged={load} />}

          {gm && <InviteBox campaignId={campaignId} campaignTitle={campaign.title} />}
          {gm && <UsageLine campaignId={campaignId} />}
          {me && <CampaignManage campaign={campaign} me={me} onChanged={load} />}
          </div>
          </div>
        </>
      )}
    </Screen>
  );
}

/** Eigene, stehende Zustimmung zu Aufnahmen in dieser Kampagne. Ohne Zustimmung: auffällig oben. */
export function RecordingConsent({ campaign, onChanged }: { campaign: Campaign; onChanged: () => void }) {
  const { user } = useAuth();
  // Frist und Cloud-Dienst gehören in den Wortlaut, den die Person bestätigt
  const info = useServerInfo();
  const consentCtx = { retention: info?.audioRetention, cloudProvider: cloudUse(info, campaign).transcription?.provider ?? null };
  const me = campaign.members.find((m) => m.userId === user?.id);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  if (!me) return null;
  const granted = !!me.recordingConsentAt;

  const change = async (value: boolean) => {
    if (!value && !(await confirmDialog(t('Zustimmung widerrufen? Ab sofort kann nicht mehr aufgenommen werden, solange du am Tisch sitzt. Bereits veröffentlichte Zusammenfassungen bleiben bestehen.'), { confirmLabel: t('Widerrufen'), danger: true }))) return;
    setBusy(true);
    setError(null);
    try {
      await api.setRecordingConsent(campaign.id, value);
      setOpen(false);
      onChanged();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  if (granted && !open) {
    return (
      <button type="button" className="row between" onClick={() => setOpen(true)}
        style={{ minHeight: 44, background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'var(--ink-soft)', cursor: 'pointer', textAlign: 'left' }}>
        <span className="small">{t('Du hast Aufnahmen zugestimmt (seit {date}).', { date: formatDateFull(me.recordingConsentAt!) })}</span>
        <span className="small" style={{ color: 'var(--seal)', fontWeight: 700 }}>{t('Ändern')}</span>
      </button>
    );
  }

  return (
    <section className={granted ? 'card' : 'card warn'}>
      <h2>{t('Aufnahmen')}</h2>
      <p style={{ margin: 0 }}>{CONSENT_SUMMARY(consentCtx)}</p>
      <details>
        <summary className="small" style={{ cursor: 'pointer', fontWeight: 700, minHeight: 32, display: 'flex', alignItems: 'center' }}>{t('Genauer Wortlaut')}</summary>
        <p className="small" style={{ margin: '4px 0 0' }}>{CONSENT_STANDING(campaign.title, consentCtx)}</p>
      </details>
      <ErrorBox error={error} />
      {granted ? (
        <div className="row wrap" style={{ gap: 8 }}>
          <button type="button" className="btn small outline" disabled={busy} onClick={() => change(false)}>{t('Zustimmung widerrufen')}</button>
          <button type="button" className="btn small ghost" onClick={() => setOpen(false)}>{t('Schließen')}</button>
        </div>
      ) : (
        <>
          <button type="button" className="btn" disabled={busy} onClick={() => change(true)}>{t('Ich stimme zu')}</button>
          <p className="muted small" style={{ margin: 0 }}>
            {t('Ohne Zustimmung wird nicht aufgenommen, solange du am Tisch sitzt.')}
          </p>
        </>
      )}
    </section>
  );
}

export function WorldInfo({ campaign, onSaved }: { campaign: Campaign; onSaved: (c: Campaign) => void }) {
  const gm = campaign.myRole === 'gm';
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(campaign.description ?? '');
  const [world, setWorld] = useState(campaign.worldInfo ?? '');
  const [language, setLanguage] = useState<'de' | 'en'>(campaign.language ?? 'de');
  const [system, setSystem] = useState<GameSystem | null>(campaign.system ?? null);
  const [systemName, setSystemName] = useState(campaign.systemName ?? '');
  const [allowExternal, setAllowExternal] = useState(!!campaign.allowExternalTranscription);
  // Nur wenn der Betreiber einen externen Dienst freigegeben hat, gibt es den Schalter überhaupt
  const [externalProvider, setExternalProvider] = useState<string | null>(null);
  const [primary, setPrimary] = useState(false);
  const [summaryProvider, setSummaryProvider] = useState<string | null>(null);
  const [allowSummary, setAllowSummary] = useState(!!campaign.allowCloudSummary);
  // Namenshilfe (ab 0.4.6): nur vorhanden, wenn der Server sie der SL mitschickt
  const [hotwords, setHotwords] = useState<string[]>(campaign.hotwords ?? []);
  const [newWord, setNewWord] = useState('');
  const addWord = () => {
    const w = newWord.trim();
    if (w && !hotwords.includes(w) && hotwords.length < 200) setHotwords([...hotwords, w]);
    setNewWord('');
  };
  useEffect(() => {
    if (editing) api.info().then((i) => {
      setExternalProvider(i.externalTranscription ?? null);
      setPrimary(i.externalTranscriptionMode === 'primary');
      setSummaryProvider(i.cloudSummary ?? null);
    }).catch(() => undefined);
  }, [editing]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const [showAll, setShowAll] = useState(false);
  const paragraphs = (campaign.worldInfo ?? '').split(/\n\s*\n/).filter((p) => p.trim());
  // Einklappen merkt sich die App je Kampagne (nur auf diesem Gerät)
  const closedKey = `session-chronik.worldClosed.${campaign.id}`;
  const [closed, setClosed] = useState(() => {
    try { return localStorage.getItem(closedKey) === '1'; } catch { return false; }
  });
  const toggleClosed = () => {
    const next = !closed;
    setClosed(next);
    setShowAll(false);
    try { if (next) localStorage.setItem(closedKey, '1'); else localStorage.removeItem(closedKey); } catch { /* egal */ }
  };
  const long = paragraphs.length > 1 || (paragraphs[0]?.length ?? 0) > 280;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      onSaved(await api.updateCampaign(campaign.id, {
        description: description.trim(), worldInfo: world.trim(), language,
        system, systemName: system === 'other' ? systemName.trim() || null : null,
        ...(externalProvider ? { allowExternalTranscription: allowExternal } : {}),
        ...(summaryProvider ? { allowCloudSummary: allowSummary } : {}),
        ...(campaign.hotwords !== undefined ? { hotwords } : {})
      }));
      setEditing(false);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <section className="card">
        <h2>{t('Kampagne und Welt bearbeiten')}</h2>
        <div className="field">
          <label htmlFor="w-desc">{t('Kurzbeschreibung (erscheint oben)')}</label>
          <input id="w-desc" type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="w-info">{t('Hintergrund für alle Mitspielenden')}</label>
          <textarea id="w-info" rows={10} value={world} onChange={(e) => setWorld(e.target.value)}
            placeholder={t('Was die Charaktere zu Beginn über die Welt wissen: Ort, Lage, Götter, Regeln am Tisch …')} />
        </div>
        <GameSystemFields idPrefix="w" system={system} systemName={systemName}
          onChange={(s, n) => { setSystem(s); setSystemName(n); }} />
        {externalProvider && (
          <div className="field">
            <label className="check" style={{ alignItems: 'flex-start' }}>
              <input type="checkbox" checked={allowExternal} onChange={(e) => setAllowExternal(e.target.checked)} style={{ marginTop: 3 }} />
              <span>{t('Transkription über {provider} erlauben', { provider: providerName(externalProvider) })}</span>
            </label>
            <span className="muted small">
              {primary
                ? t('Dieser Server transkribiert Aufnahmen direkt über {provider}. Die Stimmen verlassen dann den Verein – sag es vorher allen am Tisch.', { provider: providerName(externalProvider) })
                : t('Ist 24 Stunden lang kein Worker erreichbar, darf der Server ersatzweise {provider} nutzen (kostet wenige Cent pro Stunde Aufnahme). Die Stimmen verlassen dann den Verein – sag es vorher allen am Tisch.', { provider: providerName(externalProvider) })}
            </span>
          </div>
        )}
        {summaryProvider && (
          <div className="field">
            <label className="check" style={{ alignItems: 'flex-start' }}>
              <input type="checkbox" checked={allowSummary} onChange={(e) => setAllowSummary(e.target.checked)} style={{ marginTop: 3 }} />
              <span>{t('Zusammenfassung und Unterlagen über {provider} erlauben', { provider: providerName(summaryProvider) })}</span>
            </label>
            <span className="muted small">
              {t('Für Recap, Vorschläge und das Auswerten von Unterlagen geht Text an {provider} – Namen und Gespräche der Runde bzw. der Inhalt der Unterlage, keine Stimmen. Ohne Erlaubnis wartet beides auf ein lokales Modell.', { provider: providerName(summaryProvider) })}
            </span>
          </div>
        )}
        <div className="field">
          <label htmlFor="w-lang">{t('Sprache der Runde (für Recaps)')}</label>
          <select id="w-lang" value={language} onChange={(e) => setLanguage(e.target.value as 'de' | 'en')}>
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="notice">
          <span style={{ flexShrink: 0, color: 'var(--ink-faint)' }}><IconInfo /></span>
          <span>{t('Sehen alle Spieler. Geheimes gehört in die Bibel.')}</span>
        </div>
        {campaign.hotwords !== undefined && (
          <div className="field">
            <label htmlFor="w-hot" className="row" style={{ gap: 6 }}><IconLock size={14} /> {t('Namenshilfe für die Transkription')}</label>
            <span className="muted small">{t('Namen und Begriffe aus euren Runden – damit erkennt die Transkription sie besser. Nur du siehst diese Liste.')}</span>
            {hotwords.length > 0 && (
              <div className="term-choices">
                {hotwords.map((w) => (
                  <button key={w} type="button" className="btn small outline" aria-label={t('{name} entfernen', { name: w })}
                    onClick={() => setHotwords(hotwords.filter((x) => x !== w))}>
                    {w} <span aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
            )}
            <div className="row" style={{ gap: 8 }}>
              <input id="w-hot" type="text" maxLength={40} value={newWord} placeholder={t('z. B. Kaltenfurt')}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addWord(); } }} />
              <button type="button" className="btn small outline" disabled={!newWord.trim() || hotwords.length >= 200} onClick={addWord}>{t('Hinzufügen')}</button>
            </div>
          </div>
        )}
        <ErrorBox error={error} />
        <div className="row">
          <button type="button" className="btn small" disabled={busy} onClick={save}>{busy ? t('Speichern …') : t('Speichern')}</button>
          <button type="button" className="btn small ghost" onClick={() => setEditing(false)}>{t('Abbrechen')}</button>
        </div>
      </section>
    );
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="row between">
        <h2 style={{ margin: 0 }}>
          <button type="button" className="fold-toggle" aria-expanded={!closed} aria-controls="world-text" onClick={toggleClosed}>
            <span aria-hidden="true" className="fold-chevron">›</span>
            {t('Die Welt')}
          </button>
        </h2>
        {gm && <button type="button" className="btn ghost small" onClick={() => setEditing(true)}>{t('Bearbeiten')}</button>}
      </div>
      {closed ? null : paragraphs.length > 0 ? (
        <div id="world-text" className="card recap" style={{ gap: 12 }}>
          {showAll
            ? paragraphs.map((p, i) => <p key={i}>{p}</p>)
            : <p className={long ? 'clamp-4' : undefined}>{paragraphs[0]}</p>}
          {long && (
            <button type="button" className="btn small quiet" style={{ alignSelf: 'flex-start' }} onClick={() => setShowAll(!showAll)}>
              {showAll ? t('Weniger anzeigen') : t('Weiterlesen')}
            </button>
          )}
        </div>
      ) : (
        <div id="world-text" className="muted small">
          {gm ? t('Noch leer. Trag hier ein, was alle über die Welt wissen sollen.') : t('Die Spielleitung hat noch keinen Hintergrund eingetragen.')}
        </div>
      )}
    </section>
  );
}

function Members({ campaign, onChanged }: { campaign: Campaign; onChanged: () => void }) {
  const { user } = useAuth();
  const me = campaign.members.find((m) => m.userId === user?.id);
  const gm = me?.role === 'gm';
  const [seat, setSeat] = useState<Member | null>(null);
  const label = (m: Member) => (m.role === 'gm' ? t('Spielleitung') : m.characterName ?? t('noch ohne Charakter'));
  const active = campaign.members.filter((m) => m.openSeat || !isDeletedMember(m));
  const former = campaign.members.filter((m) => !m.openSeat && isDeletedMember(m));

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h2>{t('Am Tisch')}</h2>
      <div className="card" style={{ gap: 2, padding: '8px 12px' }}>
        {active.map((m) => m.openSeat ? (
          // Offener Platz nach einem Umzug: Die SL kann gezielt einladen oder sich selbst daraufsetzen
          gm ? (
            <button key={m.id} type="button" className="row" onClick={() => setSeat(m)}
              style={{ minHeight: 52, gap: 10, background: 'none', border: 0, padding: 0, textAlign: 'left', color: 'var(--ink)', font: 'inherit', cursor: 'pointer' }}>
              <Avatar campaignId={campaign.id} member={m} size={40} />
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span>{m.characterName ?? (m.role === 'gm' ? t('Spielleitung') : t('Offener Platz'))}</span>
                <span className="muted small">{t('noch frei · tippen zum Einladen')}</span>
              </span>
              <span aria-hidden style={{ color: 'var(--ink-faint)' }}>›</span>
            </button>
          ) : (
            <div key={m.id} className="row muted" style={{ minHeight: 52, gap: 10 }}>
              <Avatar campaignId={campaign.id} member={m} size={40} />
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span>{m.characterName ?? t('Offener Platz')}</span>
                <span className="small">{t('noch frei')}</span>
              </span>
            </div>
          )
        ) : (
          <Link key={m.id} to={p(`/k/${campaign.id}/charakter/${m.id}`)} className="row"
            style={{ minHeight: 52, gap: 10, color: 'var(--ink)', textDecoration: 'none' }}>
            <Avatar campaignId={campaign.id} member={m} size={40} />
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <span>{label(m)}</span>
              <span className="muted small">{m.displayName}{m === me ? ` (${t('du')})` : ''}</span>
            </span>
            <span aria-hidden style={{ color: 'var(--ink-faint)' }}>›</span>
          </Link>
        ))}
      </div>
      {/* Ausgetretene und gelöschte Konten bleiben im Hintergrund (Kapitel, Kommentare), stehen aber nicht mehr am Tisch */}
      {former.length > 0 && (
        <details className="card" style={{ gap: 2, padding: '8px 12px' }}>
          <summary className="muted small" style={{ cursor: 'pointer', minHeight: 32, fontWeight: 700 }}>
            {t('Ehemalige ({n})', { n: former.length })}
          </summary>
          {former.map((m) => (
            <div key={m.id} className="row muted" style={{ minHeight: 48, gap: 10, opacity: 0.7 }}>
              <Avatar campaignId={campaign.id} member={m} size={32} />
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span>{m.characterName ?? t('Gelöschtes Konto')}</span>
                <span className="small">{m.leftAt ? t('Nicht mehr dabei') : t('Gelöschtes Konto')}</span>
              </span>
            </div>
          ))}
        </details>
      )}
      {me && (
        <Link className="btn ghost small" style={{ alignSelf: 'flex-start' }} to={p(`/k/${campaign.id}/charakter/${me.id}`)}>
          {me.role === 'gm' ? t('Mein Bild') : t('Meinen Charakter ansehen')}
        </Link>
      )}
      {me && me.role === 'player' && apiAtLeast('0.4.8') && <MoveConsent campaign={campaign} me={me} onChanged={onChanged} />}
      {me && <VoiceProfileHint />}
      {seat && <OpenSeatDialog campaign={campaign} seat={seat} onClose={() => setSeat(null)} onDone={() => { setSeat(null); onChanged(); }} />}
    </section>
  );
}

/**
 * „Meine Charakterdaten dürfen bei einem Umzug mit“ (0.4.8). Standard aus; ohne Zustimmung geht bei einem Umzug nur
 * der Platz mit (Figurenname), nicht Beschreibung, Hintergrund, Bild und Kommentare.
 */
function MoveConsent({ campaign, me, onChanged }: { campaign: Campaign; me: Member; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const toggle = async (granted: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await api.setMoveConsent(campaign.id, granted);
      onChanged();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label className="check">
        <input type="checkbox" checked={!!me.moveConsentAt} disabled={busy} onChange={(e) => toggle(e.target.checked)} />
        <span>{t('Meine Charakterdaten dürfen bei einem Umzug mit')}</span>
      </label>
      <span className="muted small" style={{ marginLeft: 28 }}>
        {t('Zieht die Spielleitung mit der Kampagne auf einen anderen Server, gehen dann Beschreibung, Hintergrund, Bild und deine öffentlichen Kommentare mit. Ohne Haken nur der Name deiner Figur.')}
      </span>
      <ErrorBox error={error} />
    </div>
  );
}

/** Verbrauch dieses Monats – Grundlage für spätere Abrechnung; zahlt der Betreiber der Kampagne (SL) */
function UsageLine({ campaignId }: { campaignId: string }) {
  const [usage, setUsage] = useState<Usage | null>(null);
  useEffect(() => {
    api.usage(campaignId).then(setUsage).catch(() => undefined); // älterer Server: einfach nichts anzeigen
  }, [campaignId]);
  if (!usage) return null;
  const hours = (usage.audioSeconds / 3600).toFixed(1).replace('.', getLang() === 'de' ? ',' : '.');
  return (
    <div className="muted small" style={{ textAlign: 'center' }}>
      {t('Verarbeitet diesen Monat: {sessions} · {hours} h Aufnahme', { sessions: tn(usage.sessions, '{n} Kapitel', '{n} Kapitel'), hours })}
      {usage.costEstimateCents != null && ' · ' + t('ca. {eur} € API-Kosten', { eur: (usage.costEstimateCents / 100).toFixed(2).replace('.', getLang() === 'de' ? ',' : '.') })}
    </div>
  );
}


export { InviteBox };

/**
 * Unten auf der Übersicht: Kampagne abschließen/wieder aufnehmen oder löschen (SL), Kampagne verlassen (alle,
 * die letzte SL nur, wenn es eine zweite gibt). Schnittstelle 0.4.5.
 */
function CampaignManage({ campaign, me, onChanged }: { campaign: Campaign; me: Member; onChanged: () => void }) {
  const navigate = useNavigate();
  const gm = me.role === 'gm';
  const otherGms = campaign.members.filter((m) => m.role === 'gm' && m.id !== me.id && !isDeletedMember(m)).length;
  const [deleting, setDeleting] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const run = async (action: () => Promise<unknown>, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      after ? after() : onChanged();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const archive = async (value: boolean) => {
    const q = value
      ? t('Kampagne abschließen? Sie bleibt zum Nachlesen erhalten, neue Kapitel gibt es dann nicht mehr. Du kannst sie später wieder aufnehmen.')
      : t('Kampagne wieder aufnehmen?');
    if (await confirmDialog(q, { confirmLabel: value ? t('Abschließen') : t('Wieder aufnehmen') })) {
      run(() => api.updateCampaign(campaign.id, { archived: value }));
    }
  };

  const leave = async () => {
    if (await confirmDialog(t('Kampagne verlassen? Du siehst sie danach nicht mehr. Deine Kommentare bleiben stehen. Zurück geht es nur mit einer neuen Einladung.'), { confirmLabel: t('Verlassen'), danger: true })) {
      run(() => api.removeMember(campaign.id, me.id), () => navigate('/', { replace: true }));
    }
  };

  return (
    <details className="card" style={{ gap: 10 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 700, minHeight: 32 }}>{gm ? t('Kampagne verwalten') : t('Kampagne verlassen')}</summary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
      <ErrorBox error={error} />
      {gm && (
        <Link className="btn outline" to={p(`/k/${campaign.id}/spielleitung`)}>{t('Spielleitung übergeben')}</Link>
      )}
      {gm && apiAtLeast('0.4.8') && (
        <Link className="btn outline" to={p(`/k/${campaign.id}/umziehen`)}>{t('Kampagne umziehen')}</Link>
      )}
      {gm && (
        <button type="button" className="btn outline" disabled={busy} onClick={() => archive(!campaign.archivedAt)}>
          {campaign.archivedAt ? t('Wieder aufnehmen') : t('Kampagne abschließen')}
        </button>
      )}
      {(!gm || otherGms > 0) && (
        <button type="button" className="btn danger outline" disabled={busy} onClick={leave}>{t('Kampagne verlassen')}</button>
      )}
      {gm && otherGms === 0 && <span className="muted small">{t('Verlassen kannst du erst, wenn jemand anderes die Spielleitung hat („Spielleitung übergeben“).')}</span>}
      {gm && (deleting ? (
        <div className="card warn" style={{ gap: 8 }}>
          <strong>{t('Kampagne endgültig löschen')}</strong>
          <span className="small">{t('Gelöscht werden alle Kapitel, Recaps, Aufnahmen, die Bibel, Kommentare und Bilder – für alle. Das lässt sich nicht rückgängig machen.')}</span>
          <div className="field">
            <label htmlFor="del-title">{t('Zur Bestätigung den Titel eingeben: {title}', { title: campaign.title })}</label>
            <input id="del-title" type="text" value={confirmTitle} onChange={(e) => setConfirmTitle(e.target.value)} />
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn danger" disabled={busy || confirmTitle.trim() !== campaign.title}
              onClick={() => run(() => api.deleteCampaign(campaign.id, confirmTitle.trim()), () => navigate('/', { replace: true }))}>
              {t('Endgültig löschen')}
            </button>
            <button type="button" className="btn outline" onClick={() => setDeleting(false)}>{t('Abbrechen')}</button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn small quiet" style={{ alignSelf: 'flex-start' }} onClick={() => setDeleting(true)}>{t('Kampagne löschen …')}</button>
      ))}
      </div>
    </details>
  );
}

/** Hinweis an die SL (ab 0.4.7), z. B. ein Neuzugang ist vor teilweise verborgenen Einträgen verborgen */
function GmNoticeCard({ campaign, notice, onDone }: { campaign: Campaign; notice: GmNotice; onDone: () => void }) {
  if (notice.code === 'seat_claimed') return <SeatClaimedCard campaign={campaign} notice={notice} onDone={onDone} />;
  if (notice.code === 'character_orphaned') return <OrphanNoticeCard campaign={campaign} notice={notice} onDone={onDone} />;
  return <NewcomerNoticeCard campaign={campaign} notice={notice} onDone={onDone} />;
}

function NewcomerNoticeCard({ campaign, notice, onDone }: { campaign: Campaign; notice: GmNotice; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const m = campaign.members.find((x) => x.id === notice.memberId);
  const name = m ? m.characterName ?? m.displayName : t('Ein neues Mitglied');
  const dismiss = async () => {
    setBusy(true);
    try {
      await api.dismissGmNotice(campaign.id, notice.id);
      onDone();
    } catch {
      setBusy(false);
    }
  };
  if (notice.code !== 'hidden_entries_for_newcomer') return null;
  return (
    <div className="card">
      <strong>{t('{name} ist neu am Tisch', { name })}</strong>
      <span className="muted small">
        {tn(notice.entryIds.length,
          '{n} Eintrag der Bibel ist nur für einige Spieler sichtbar – für {name} bleibt er verborgen, bis du ihn freigibst.',
          '{n} Einträge der Bibel sind nur für einige Spieler sichtbar – für {name} bleiben sie verborgen, bis du sie freigibst.', { name })}
      </span>
      <div className="row wrap" style={{ gap: 8 }}>
        <Link className="btn small outline" to={p(`/k/${campaign.id}/bibel`)}>{t('Zur Bibel')}</Link>
        <button type="button" className="btn small ghost" disabled={busy} onClick={dismiss}>{t('Erledigt')}</button>
      </div>
    </div>
  );
}
