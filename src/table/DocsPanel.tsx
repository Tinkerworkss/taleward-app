import { Capacitor } from '@capacitor/core';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { CampaignDocument, DocumentText } from '../api/types';
import { ErrorBox } from '../components/Screen';
import { t } from '../i18n';
import { matchScore } from '../search/fuzzy';

/** Text mit hervorgehobenen Treffern der Suche */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (q.length < 2) return <>{text}</>;
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return <>{parts.map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part))}</>;
}

/**
 * SL-Unterlagen am Tisch nachlesen: Text je Seite, durchsuchbar; im Browser auf Wunsch das Original.
 */
export function DocsPanel({ campaignId, docId, onDoc }: { campaignId: string; docId: string | null; onDoc: (id: string | null) => void }) {
  const [docs, setDocs] = useState<CampaignDocument[] | null>(null);
  const [text, setText] = useState<DocumentText | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    api.documents(campaignId).then((list) => setDocs(list.filter((d) => d.kind !== 'character_sheet'))).catch(setError);
  }, [campaignId]);

  useEffect(() => {
    setText(null);
    setQuery('');
    if (!docId) return;
    api.documentText(docId).then(setText).catch(setError);
  }, [docId]);

  const openOriginal = async (d: CampaignDocument) => {
    try {
      const blob = await api.documentFile(d.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setError(e);
    }
  };

  const doc = docs?.find((d) => d.id === docId) ?? null;
  const pages = text?.pages.filter((pg) => !query.trim() || matchScore(query, pg.text) > 0) ?? [];

  return (
    <div className="table-panel-body">
      <ErrorBox error={error} />
      {!doc ? (
        <>
          {!docs && !error && <div className="empty">{t('Lade …')}</div>}
          {docs?.length === 0 && <div className="empty">{t('Noch keine Unterlagen. Hochladen kannst du sie in der Bibel unter „Unterlagen hochladen und auswerten“.')}</div>}
          {docs?.map((d) => (
            <button key={d.id} type="button" className="table-entry-head card-like" onClick={() => onDoc(d.id)}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong>{d.title}</strong>
                <span className="muted small">{d.pageCount ? ' · ' + t('{n} Seiten', { n: d.pageCount }) : ''}</span>
              </span>
              <span aria-hidden style={{ color: 'var(--ink-muted)' }}>›</span>
            </button>
          ))}
        </>
      ) : (
        <>
          <div className="row wrap" style={{ gap: 8 }}>
            <button type="button" className="btn small ghost" onClick={() => onDoc(null)}>{t('Alle Unterlagen')}</button>
            {!Capacitor.isNativePlatform() && <button type="button" className="btn small outline" onClick={() => openOriginal(doc)}>{t('Original öffnen')}</button>}
          </div>
          <h3 style={{ margin: 0 }}>{doc.title}</h3>
          <div className="field">
            <label htmlFor="td-search">{t('In der Unterlage suchen')}</label>
            <input id="td-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {!text && !error && <div className="empty">{t('Lade …')}</div>}
          {text && text.pages.length === 0 && <div className="empty">{t('Für diese Unterlage gibt es noch keinen Text. Läuft die Auswertung noch, schau später wieder rein.')}</div>}
          {text && text.pages.length > 0 && pages.length === 0 && <div className="empty">{t('Nichts gefunden für „{q}“.', { q: query })}</div>}
          {pages.map((pg) => (
            <section key={pg.page} className="table-doc-page">
              <span className="overline">{t('Seite {n}', { n: pg.page })}</span>
              <p className="small" style={{ margin: 0, whiteSpace: 'pre-wrap' }}><Highlight text={pg.text} query={query} /></p>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
