import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { apiAtLeast, p } from '../api/connections';
import type { Campaign } from '../api/types';
import { IconBack } from '../components/Icons';
import { ErrorBox, rememberCampaign } from '../components/Screen';
import { t } from '../i18n';
import { BackgroundRecorder, hasNativeRecorder, type NativeStatus } from '../recorder/native';
import { BiblePanel } from '../table/BiblePanel';
import { DocsPanel } from '../table/DocsPanel';
import { GroupPanel } from '../table/GroupPanel';
import { PANELS, loadLayout, saveLayout, type PanelId } from '../table/layout';
import { PlanPanel } from '../table/PlanPanel';

const native = hasNativeRecorder();

function clock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Schmale Leiste, wenn dieses Gerät gerade aufnimmt. Sonst nichts. */
function RecordingBar({ campaignId }: { campaignId: string }) {
  const [st, setSt] = useState<NativeStatus | null>(null);
  useEffect(() => {
    if (!native) return;
    const poll = () => BackgroundRecorder.getStatus().then(setSt).catch(() => setSt(null));
    poll();
    const id = window.setInterval(poll, 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!st || (st.state !== 'recording' && st.state !== 'paused')) return null;
  const paused = st.state === 'paused';
  const toggle = async () => setSt(paused ? await BackgroundRecorder.resume() : await BackgroundRecorder.pause());
  return (
    <div className="table-rec" role="status">
      <span className={paused ? 'table-rec-dot paused' : 'table-rec-dot'} aria-hidden />
      <span style={{ flex: 1 }}>{paused ? t('Aufnahme pausiert') : t('Aufnahme läuft')} · {clock(st.elapsedMs)}</span>
      <button type="button" className="btn small outline" onClick={toggle}>{paused ? t('Weiter') : t('Pause')}</button>
      <Link className="btn small ghost" to={p(`/k/${campaignId}/aufnahme`)}>{t('Zur Aufnahme')}</Link>
    </div>
  );
}

/** Spalten und ihren Inhalt wählen; gilt nur auf diesem Gerät. */
function LayoutChooser({ layout, onChange, onClose }: { layout: PanelId[]; onChange: (l: PanelId[]) => void; onClose: () => void }) {
  const setCount = (n: number) => {
    const next = [...layout];
    while (next.length < n) next.push(PANELS.find((pn) => !next.includes(pn.id))?.id ?? 'bible');
    onChange(next.slice(0, n));
  };
  // Jede Ansicht nur einmal: liegt die gewählte schon in einer anderen Spalte, tauschen beide
  const pick = (i: number, id: PanelId) => layout.map((x, j) => (j === i ? id : x === id ? layout[i] : x));
  return (
    <div className="card" style={{ gap: 12 }}>
      <strong>{t('Was liegt auf deinem Schirm?')}</strong>
      <div className="field">
        <span id="tl-count" className="small" style={{ fontWeight: 700 }}>{t('Spalten')}</span>
        <div className="segmented" role="group" aria-labelledby="tl-count" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          {[1, 2, 3].map((n) => (
            <button key={n} type="button" aria-pressed={layout.length === n} onClick={() => setCount(n)}>{n}</button>
          ))}
        </div>
      </div>
      <div className="row wrap" style={{ gap: 12 }}>
        {layout.map((id, i) => (
          <div key={i} className="field" style={{ flex: '1 1 180px' }}>
            <label htmlFor={`tl-col-${i}`}>{t('Spalte {n}', { n: i + 1 })}</label>
            <select id={`tl-col-${i}`} value={id} onChange={(e) => onChange(pick(i, e.target.value as PanelId))}>
              {PANELS.map((pn) => <option key={pn.id} value={pn.id}>{t(pn.label)}</option>)}
            </select>
          </div>
        ))}
      </div>
      <span className="muted small">{t('Auf schmalen Bildschirmen siehst du eine Spalte und wechselst oben. Die Auswahl gilt nur auf diesem Gerät.')}</span>
      <button type="button" className="btn small" style={{ alignSelf: 'flex-start' }} onClick={onClose}>{t('Fertig')}</button>
    </div>
  );
}

/**
 * SL-Schirm: alles für den Spielabend nebeneinander, für Tablet quer oder Laptop. Welche Spalten, sucht sich die SL
 * aus. Nur für die Spielleitung.
 */
export function TablePage() {
  const { campaignId = '' } = useParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [nextNumber, setNextNumber] = useState(1);
  const [error, setError] = useState<unknown>(null);
  const [layout, setLayoutState] = useState<PanelId[]>(loadLayout);
  const [choosing, setChoosing] = useState(false);
  const [active, setActive] = useState(0);
  const [bibleQuery, setBibleQuery] = useState('');
  const [focusEntryId, setFocusEntryId] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.campaign(campaignId), api.sessions(campaignId)]).then(([c, s]) => {
      rememberCampaign(c);
      setCampaign(c);
      setNextNumber(Math.max(0, ...s.map((x) => x.number ?? 0)) + 1);
    }).catch(setError);
  }, [campaignId]);

  const setLayout = (l: PanelId[]) => {
    setLayoutState(l);
    saveLayout(l);
    setActive((a) => Math.min(a, l.length - 1));
  };

  /** Zu einer Spalte springen (auf schmalen Bildschirmen umschalten); liegt sie nicht auf dem Schirm, die letzte ersetzen */
  const show = (id: PanelId) => {
    let i = layout.indexOf(id);
    if (i < 0) {
      i = layout.length - 1;
      setLayoutState(layout.map((x, j) => (j === i ? id : x)));
    }
    setActive(i);
  };
  const openEntry = (id: string) => {
    setBibleQuery('');
    setFocusEntryId(null);
    window.setTimeout(() => setFocusEntryId(id), 0);
    show('bible');
  };
  const openDoc = (id: string | null) => {
    setDocId(id);
    if (id) show('docs');
  };

  const panel = (id: PanelId) => {
    if (!campaign) return null;
    switch (id) {
      case 'plan':
        return apiAtLeast('0.4.12')
          ? <PlanPanel campaignId={campaign.id} nextNumber={nextNumber} onEntry={openEntry} onDoc={openDoc} />
          : <div className="table-panel-body"><div className="empty">{t('Kapitelpläne kann dein Server noch nicht speichern. Nach dem nächsten Update des Servers sind sie da.')}</div></div>;
      case 'docs':
        return <DocsPanel campaignId={campaign.id} docId={docId} onDoc={openDoc} />;
      case 'bible':
        return <BiblePanel campaignId={campaign.id} members={campaign.members} query={bibleQuery} onQuery={setBibleQuery} focusEntryId={focusEntryId} />;
      case 'group':
        return <GroupPanel campaign={campaign} onEntry={openEntry} />;
    }
  };

  const label = (id: PanelId) => t(PANELS.find((pn) => pn.id === id)!.label);

  return (
    <div className="table-screen">
      <header className="table-header">
        <Link className="btn ghost small" to={p(`/k/${campaignId}`)}><IconBack size={20} /> {t('Übersicht')}</Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="overline">{campaign?.title ?? ' '}</div>
          <h1 className="table-title">{t('SL-Schirm')}</h1>
        </div>
        {campaign?.myRole === 'gm' && (
          <button type="button" className="btn small outline" aria-expanded={choosing} onClick={() => setChoosing(!choosing)}>{t('Spalten anpassen')}</button>
        )}
      </header>
      <ErrorBox error={error} />
      {!campaign && !error && <div className="empty">{t('Lade …')}</div>}
      {campaign && campaign.myRole !== 'gm' && (
        <div className="empty">{t('Den SL-Schirm hat nur die Spielleitung. Was du über die Welt weißt, steht in der Bibel.')}</div>
      )}
      {campaign?.myRole === 'gm' && (
        <>
          <RecordingBar campaignId={campaign.id} />
          {choosing && <LayoutChooser layout={layout} onChange={setLayout} onClose={() => setChoosing(false)} />}
          {layout.length > 1 && (
            <div className="segmented table-switch" role="group" aria-label={t('Spalte wählen')} style={{ gridTemplateColumns: `repeat(${layout.length}, minmax(0, 1fr))` }}>
              {layout.map((id, i) => (
                <button key={i} type="button" aria-pressed={active === i} onClick={() => setActive(i)}>{label(id)}</button>
              ))}
            </div>
          )}
          <div className="table-grid" style={{ ['--cols' as string]: layout.length }}>
            {layout.map((id, i) => (
              <section key={`${i}-${id}`} className={active === i ? 'table-panel active' : 'table-panel'} aria-label={label(id)}>
                <h2 className="table-panel-title">{label(id)}</h2>
                {panel(id)}
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
