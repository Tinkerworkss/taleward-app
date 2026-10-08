import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { apiAtLeast, p } from '../api/connections';
import type { Campaign } from '../api/types';
import { IconBack } from '../components/Icons';
import { ErrorBox, rememberCampaign } from '../components/Screen';
import { t, tk } from '../i18n';
import { BackgroundRecorder, hasNativeRecorder, type NativeStatus } from '../recorder/native';
import { BiblePanel } from '../table/BiblePanel';
import { DocsPanel } from '../table/DocsPanel';
import { GroupPanel } from '../table/GroupPanel';
import { MAX_CARDS, MAX_COLUMNS, loadLayout, saveLayout, unusedPanels, type Layout, type PanelId } from '../table/layout';
import { PlanPanel } from '../table/PlanPanel';

const native = hasNativeRecorder();

/** Namen der Module (neue Module: hier, in layout.ts und unten in panel()) */
const LABELS: Record<PanelId, string> = {
  plan: tk('Kapitelplan'),
  docs: tk('Unterlagen'),
  bible: tk('Bibel'),
  group: tk('Die Gruppe')
};
const label = (id: PanelId) => t(LABELS[id]);

/** Unter dieser Größe zeigt eine Karte nur die Kurzfassung; Tippen auf „Groß öffnen“ zeigt das Modul im Fenster */
const COMPACT_HEIGHT = 300;
const COMPACT_WIDTH = 280;
const WIDE = '(min-width: 900px)';

function clock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function useWide(): boolean {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);
  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
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

/** Spalten und Karten einrichten; gilt nur auf diesem Gerät. */
function LayoutChooser({ layout, onChange }: { layout: Layout; onChange: (l: Layout) => void }) {
  const free = unusedPanels(layout);
  const setCount = (n: number) => {
    if (n >= layout.length) {
      const next = layout.map((c) => [...c]);
      const rest = unusedPanels(layout);
      while (next.length < n) {
        if (rest.length) { next.push([rest.shift()!]); continue; }
        // Kein freies Modul: die unterste Karte der vollsten Spalte bekommt die neue Spalte
        const fullest = next.reduce((a, c) => (c.length > a.length ? c : a));
        if (fullest.length < 2) break;
        next.push([fullest.pop()!]);
      }
      onChange(next);
    } else {
      // Karten wegfallender Spalten wandern in die letzte bleibende Spalte, soweit Platz ist
      const keep = layout.slice(0, n).map((c) => [...c]);
      const moved = layout.slice(n).flat();
      keep[n - 1] = [...keep[n - 1], ...moved].slice(0, MAX_CARDS);
      onChange(keep);
    }
  };
  const edit = (fn: (l: Layout) => void) => {
    const next = layout.map((c) => [...c]);
    fn(next);
    onChange(next.filter((c) => c.length > 0));
  };
  const replace = (ci: number, ri: number, id: PanelId) => edit((l) => { l[ci][ri] = id; });
  const remove = (ci: number, ri: number) => edit((l) => { l[ci].splice(ri, 1); });
  const add = (ci: number) => edit((l) => { if (free.length) l[ci].push(free[0]); });
  const moveV = (ci: number, ri: number, d: -1 | 1) => edit((l) => { [l[ci][ri], l[ci][ri + d]] = [l[ci][ri + d], l[ci][ri]]; });
  const moveH = (ci: number, ri: number, d: -1 | 1) => edit((l) => {
    if (l[ci + d].length >= MAX_CARDS) return;
    l[ci + d].push(l[ci].splice(ri, 1)[0]);
  });
  const total = layout.flat().length;

  return (
    <div className="table-panel-body" style={{ gap: 12 }}>
      <strong>{t('Was liegt auf deinem Schirm?')}</strong>
      <div className="field">
        <span id="tl-count" className="small" style={{ fontWeight: 700 }}>{t('Spalten')}</span>
        <div className="segmented" role="group" aria-labelledby="tl-count" style={{ gridTemplateColumns: `repeat(${MAX_COLUMNS}, minmax(0, 1fr))` }}>
          {Array.from({ length: MAX_COLUMNS }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" aria-pressed={layout.length === n} disabled={n > total + free.length} onClick={() => setCount(n)}>{n}</button>
          ))}
        </div>
      </div>
      <div className="table-chooser">
        {layout.map((col, ci) => (
          <fieldset key={ci} className="table-chooser-col">
            <legend>{t('Spalte {n}', { n: ci + 1 })}</legend>
            {col.map((id, ri) => (
              <div key={id} className="table-chooser-card">
                <select aria-label={t('Spalte {c}, Karte {r}', { c: ci + 1, r: ri + 1 })} value={id} onChange={(e) => replace(ci, ri, e.target.value as PanelId)}>
                  {[id, ...free].map((pid) => <option key={pid} value={pid}>{label(pid)}</option>)}
                </select>
                <div className="row wrap" style={{ gap: 4 }}>
                  <button type="button" className="btn small ghost" disabled={ri === 0} aria-label={t('{name} nach oben', { name: label(id) })} onClick={() => moveV(ci, ri, -1)}>↑</button>
                  <button type="button" className="btn small ghost" disabled={ri === col.length - 1} aria-label={t('{name} nach unten', { name: label(id) })} onClick={() => moveV(ci, ri, 1)}>↓</button>
                  {layout.length > 1 && <>
                    <button type="button" className="btn small ghost" disabled={ci === 0 || layout[ci - 1].length >= MAX_CARDS} aria-label={t('{name} in die Spalte links', { name: label(id) })} onClick={() => moveH(ci, ri, -1)}>←</button>
                    <button type="button" className="btn small ghost" disabled={ci === layout.length - 1 || layout[ci + 1].length >= MAX_CARDS} aria-label={t('{name} in die Spalte rechts', { name: label(id) })} onClick={() => moveH(ci, ri, 1)}>→</button>
                  </>}
                  <button type="button" className="btn small ghost" disabled={total <= 1} aria-label={t('{name} vom Schirm nehmen', { name: label(id) })} onClick={() => remove(ci, ri)}>×</button>
                </div>
              </div>
            ))}
            {col.length < MAX_CARDS && free.length > 0 && (
              <button type="button" className="btn small dashed" onClick={() => add(ci)}>{t('Karte hinzufügen')}</button>
            )}
          </fieldset>
        ))}
      </div>
      <span className="muted small">{t('Liegen mehrere Karten übereinander, zeigen sie eine Kurzfassung. „Groß öffnen“ zeigt alles. Auf schmalen Bildschirmen stehen die Karten untereinander. Die Einrichtung gilt nur auf diesem Gerät.')}</span>
    </div>
  );
}

/** Eine Spalte; misst, ob ihre Karten genug Platz für die volle Ansicht haben (alle Karten einer Spalte gleich) */
function Column({ count, forceCompact, children }: { count: number; forceCompact: boolean; children: (compact: boolean) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [small, setSmall] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || forceCompact) return;
    const ro = new ResizeObserver(([e]) => {
      const share = (e.contentRect.height - 14 * (count - 1)) / count;
      setSmall(share < COMPACT_HEIGHT || e.contentRect.width < COMPACT_WIDTH);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [count, forceCompact]);
  return <div ref={ref} className="table-col">{children(forceCompact || small)}</div>;
}

/** Eine Karte auf dem Schirm */
function Card({ id, compact, onCompact, onExpand, children }: {
  id: PanelId;
  compact: boolean;
  onCompact: (id: PanelId, compact: boolean) => void;
  onExpand: () => void;
  children: ReactNode;
}) {
  useEffect(() => { onCompact(id, compact); }, [id, compact, onCompact]);
  return (
    <section className={compact ? 'table-panel compact' : 'table-panel'} aria-label={label(id)}>
      <div className="table-panel-head">
        <h2 className="table-panel-title">{label(id)}</h2>
        {compact && <button type="button" className="btn small ghost" onClick={onExpand}>{t('Groß öffnen')}</button>}
      </div>
      {children}
    </section>
  );
}

/** Ein Modul groß über dem Schirm; schließt mit „Schließen“ oder Escape, der Fokus kehrt zurück */
function Popup({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
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

/**
 * SL-Schirm: alles für den Spielabend auf einen Blick, für Tablet quer oder Laptop. Bis zu 3 Spalten mit je bis zu
 * 5 Karten; welche, sucht sich die SL aus. Nur für die Spielleitung.
 */
export function TablePage() {
  const { campaignId = '' } = useParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [nextNumber, setNextNumber] = useState(1);
  const [error, setError] = useState<unknown>(null);
  const [layout, setLayoutState] = useState<Layout>(loadLayout);
  const [choosing, setChoosing] = useState(false);
  const [popup, setPopup] = useState<PanelId | null>(null);
  /** Nach dem Schließen des Fensters laden die Karten neu (dort kann sich etwas geändert haben) */
  const [round, setRound] = useState(0);
  const compactRef = useRef<Partial<Record<PanelId, boolean>>>({});
  const [bibleQuery, setBibleQuery] = useState('');
  const [focusEntryId, setFocusEntryId] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const wide = useWide();

  useEffect(() => {
    Promise.all([api.campaign(campaignId), api.sessions(campaignId)]).then(([c, s]) => {
      rememberCampaign(c);
      setCampaign(c);
      setNextNumber(Math.max(0, ...s.map((x) => x.number ?? 0)) + 1);
    }).catch(setError);
  }, [campaignId]);

  const setLayout = (l: Layout) => {
    setLayoutState(l);
    saveLayout(l);
  };
  const onCompact = useRef((id: PanelId, c: boolean) => { compactRef.current[id] = c; }).current;
  const closeChooser = useRef(() => setChoosing(false)).current;
  const closePopup = useRef(() => { setPopup(null); setRound((r) => r + 1); }).current;

  /** Ein Modul zeigen: liegt es groß auf dem Schirm, dort; sonst im Fenster */
  const show = (id: PanelId) => {
    const onScreen = layout.flat().includes(id);
    if (!onScreen || compactRef.current[id] !== false) setPopup(id);
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

  const panel = (id: PanelId, compact: boolean) => {
    if (!campaign) return null;
    switch (id) {
      case 'plan':
        return apiAtLeast('0.4.12')
          ? <PlanPanel campaignId={campaign.id} nextNumber={nextNumber} onEntry={openEntry} onDoc={openDoc} compact={compact} />
          : <div className="table-panel-body"><div className="muted small">{t('Kapitelpläne kann dein Server noch nicht speichern. Nach dem nächsten Update des Servers sind sie da.')}</div></div>;
      case 'docs':
        return <DocsPanel campaignId={campaign.id} docId={docId} onDoc={openDoc} compact={compact} />;
      case 'bible':
        return <BiblePanel campaignId={campaign.id} members={campaign.members} query={bibleQuery} onQuery={setBibleQuery}
          focusEntryId={focusEntryId} compact={compact} onEntry={openEntry} />;
      case 'group':
        return <GroupPanel campaign={campaign} onEntry={openEntry} compact={compact} onExpand={() => setPopup('group')} />;
    }
  };

  // Schmal: eine Spalte mit allen Karten untereinander, jede als Kurzfassung
  const columns: Layout = wide ? layout : [layout.flat()];

  return (
    <div className="table-screen">
      <header className="table-header">
        <Link className="btn ghost small" to={p(`/k/${campaignId}`)}><IconBack size={20} /> {t('Übersicht')}</Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="overline">{campaign?.title ?? ' '}</div>
          <h1 className="table-title">{t('SL-Schirm')}</h1>
        </div>
        {campaign?.myRole === 'gm' && (
          <button type="button" className="btn small outline" aria-expanded={choosing} onClick={() => setChoosing(!choosing)}>{t('Schirm einrichten')}</button>
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
          {choosing && <Popup title={t('Schirm einrichten')} onClose={closeChooser}><LayoutChooser layout={layout} onChange={setLayout} /></Popup>}
          <div className="table-grid" style={{ ['--cols' as string]: columns.length }}>
            {columns.map((col, ci) => (
              <Column key={ci} count={col.length} forceCompact={!wide}>
                {(compact) => col.map((id) => (
                  <Card key={`${id}-${round}`} id={id} compact={compact} onCompact={onCompact} onExpand={() => setPopup(id)}>
                    {panel(id, compact)}
                  </Card>
                ))}
              </Column>
            ))}
          </div>
          {popup && <Popup title={label(popup)} onClose={closePopup}>{panel(popup, false)}</Popup>}
        </>
      )}
    </div>
  );
}
