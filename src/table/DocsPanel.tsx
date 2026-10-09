import { Capacitor } from '@capacitor/core';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { p } from '../api/connections';
import { DOC_STATE, MAX_MB } from '../pages/DocumentsPage';
import { downloadName, originalKind } from './docKind';
import { api } from '../api/client';
import type { CampaignDocument, DocumentText } from '../api/types';
import { ErrorBox } from '../components/Screen';
import { t, tn } from '../i18n';
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
export function DocsPanel({ campaignId, docId, onDoc, compact }: {
  campaignId: string;
  docId: string | null;
  onDoc: (id: string | null) => void;
  /** Kleine Karte: nur die Titel; Tippen öffnet die Unterlage groß */
  compact?: boolean;
}) {
  const [docs, setDocs] = useState<CampaignDocument[] | null>(null);
  const [text, setText] = useState<DocumentText | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [uploading, setUploading] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  const load = () => api.documents(campaignId).then((list) => setDocs(list.filter((d) => d.kind !== 'character_sheet'))).catch(setError);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  // Solange der Server auswertet, regelmäßig nachfragen
  const running = docs?.some((d) => d.state === 'queued' || d.state === 'processing');
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(load, 3000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  /** Hochladen und auswerten lassen – als SL-Unterlage, also erst einmal alles geheim */
  const upload = async (files: File[]) => {
    setError(null);
    for (const file of files) {
      if (!/\.(pdf|docx|txt|md)$/i.test(file.name)) {
        setError(new Error(t('„{name}“ geht nicht. Möglich sind PDF, Word (.docx) und Text.', { name: file.name })));
        continue;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(new Error(t('Die Datei ist zu groß (höchstens {n} MB).', { n: MAX_MB })));
        continue;
      }
      setUploading((u) => [...u, file.name]);
      try {
        await api.uploadDocument(campaignId, file, 'gm', file.name.replace(/\.[^.]+$/, ''));
      } catch (e) {
        setError(e);
      } finally {
        setUploading((u) => u.filter((n) => n !== file.name));
      }
    }
    load();
  };
  const drop = {
    onDragOver: (e: DragEvent) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragging(true); } },
    onDragLeave: (e: DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); },
    onDrop: (e: DragEvent) => { e.preventDefault(); setDragging(false); upload([...e.dataTransfer.files]); }
  };

  useEffect(() => {
    setText(null);
    setQuery('');
    if (!docId || compact) return;
    api.documentText(docId).then(setText).catch(setError);
  }, [docId, compact]);

  /* Original öffnen: PDF und Text zeigt die App selbst an, alles andere (z. B. Word) bietet sie zum Speichern an (docKind.ts) */
  const openOriginal = async (d: CampaignDocument) => {
    try {
      const data = await api.documentFile(d.id);
      if (!(data instanceof Blob)) throw new Error(t('Die Datei ließ sich nicht öffnen.'));
      const kind = originalKind(d.fileName);
      const blob = new Blob([await data.arrayBuffer()], { type: kind ?? 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      if (kind) {
        window.open(url, '_blank', 'noopener');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadName(d.fileName);
        a.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setError(e);
    }
  };

  const doc = compact ? null : docs?.find((d) => d.id === docId) ?? null;
  const pages = text?.pages.filter((pg) => !query.trim() || matchScore(query, pg.text) > 0) ?? [];

  return (
    <div className={dragging ? 'table-panel-body table-drop active' : 'table-panel-body table-drop'} {...drop}>
      {dragging && <div className="table-drop-hint" aria-hidden>{t('Loslassen zum Hochladen und Auswerten')}</div>}
      <ErrorBox error={error} />
      {!doc ? (
        <>
          {!docs && !error && <div className="empty">{t('Lade …')}</div>}
          {docs?.length === 0 && !uploading.length && <div className="muted small">{t('Noch keine Unterlagen. Zieh eine Datei hierher oder tippe auf „Unterlage hinzufügen“.')}</div>}
          {uploading.map((n) => <div key={n} className="muted small" role="status">{t('„{name}“ wird hochgeladen …', { name: n })}</div>)}
          {docs?.map((d) => (
            <div key={d.id} className="table-doc-row">
              <button type="button" className="table-entry-head card-like" onClick={() => onDoc(d.id)}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong>{d.title}</strong>
                  <span className="muted small">{d.pageCount ? ' · ' + tn(d.pageCount, '{n} Seite', '{n} Seiten') : ''}</span>
                </span>
                {d.state !== 'done' && <span className={d.state === 'failed' ? 'pill seal' : 'pill'}>{t(DOC_STATE[d.state])}</span>}
                <span aria-hidden style={{ color: 'var(--ink-muted)' }}>›</span>
              </button>
              {d.state === 'awaiting_review' && !compact && (
                <Link className="small" to={p(`/k/${campaignId}/unterlagen/${d.id}`)}>{tn(d.proposalCount, '{n} Vorschlag für die Bibel prüfen', '{n} Vorschläge für die Bibel prüfen')}</Link>
              )}
            </div>
          ))}
          <input ref={picker} type="file" multiple hidden accept=".pdf,.docx,.txt,.md,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => { upload([...(e.target.files ?? [])]); e.target.value = ''; }} />
          <button type="button" className="btn small dashed" onClick={() => picker.current?.click()}>{t('Unterlage hinzufügen')}</button>
          {!compact && <span className="muted small">{t('Neue Unterlagen werden als SL-Unterlage ausgewertet: alles bleibt geheim, bis du Vorschläge in die Bibel übernimmst.')}</span>}
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
