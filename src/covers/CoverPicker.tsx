import { useState } from 'react';
import { api } from '../api/client';
import type { Campaign } from '../api/types';
import { ErrorBox } from '../components/Screen';
import { t } from '../i18n';
import { COVER_PRESETS, PresetImage } from './presets';
import { resizeImage } from './resize';

/** Auswahl des Titelbilds (nur SL): mitgelieferte Motive, eigenes Foto oder keins. */
export function CoverPicker({ campaign, onChanged, onClose, embedded }: {
  campaign: Campaign;
  onChanged: (c: Campaign) => void;
  onClose: () => void;
  /** Fest eingebettet (Einrichtung): ohne „Schließen“, bleibt nach der Auswahl offen */
  embedded?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const custom = !!campaign.coverImageUpdatedAt;

  const run = async (action: () => Promise<Campaign>) => {
    setBusy(true);
    setError(null);
    try {
      onChanged(await action());
      if (!embedded) onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const choose = (preset: string | null) => run(() => api.updateCampaign(campaign.id, { coverPreset: preset }));

  const upload = (file: File | undefined) => {
    if (!file) return;
    run(async () => api.uploadCoverImage(campaign.id, await resizeImage(file)));
  };

  return (
    <section className="card">
      <div className="row between">
        <h2>{t('Titelbild')}</h2>
        {!embedded && <button type="button" className="btn ghost small" onClick={onClose}>{t('Schließen')}</button>}
      </div>
      <ErrorBox error={error} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        {COVER_PRESETS.map((p) => {
          const selected = !custom && campaign.coverPreset === p.id;
          return (
            <button key={p.id} type="button" disabled={busy} aria-pressed={selected} onClick={() => choose(p.id)}
              style={{
                padding: 0, border: selected ? '3px solid var(--seal)' : '1px solid var(--rule)', borderRadius: 'var(--radius-sm)',
                background: 'var(--page)', overflow: 'hidden', cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'var(--ink)'
              }}>
              <div style={{ height: 72 }}><PresetImage preset={p} /></div>
              <div className="small" style={{ padding: '6px 8px', fontWeight: selected ? 700 : 500 }}>{t(p.label)}</div>
            </button>
          );
        })}
      </div>
      <div className="field">
        {/* Echtes Dateifeld unsichtbar, dafür ein Knopf im Stil der App */}
        <label className="btn outline" style={{ opacity: busy ? 0.5 : 1 }}>
          {custom ? t('Eigenes Bild ersetzen') : t('Eigenes Bild hochladen')}
          <input type="file" accept="image/*" disabled={busy} onChange={(e) => upload(e.target.files?.[0])}
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }} />
        </label>
        <span className="muted small">{t('Wird vor dem Hochladen verkleinert. Alle in der Kampagne sehen das Bild.')}</span>
      </div>
      <div className="row wrap" style={{ gap: 8 }}>
        {custom && (
          <button type="button" className="btn small outline" disabled={busy}
            onClick={() => run(async () => { await api.deleteCoverImage(campaign.id); return api.campaign(campaign.id); })}>
            {t('Eigenes Bild entfernen')}
          </button>
        )}
        {(custom || campaign.coverPreset) && (
          <button type="button" className="btn small ghost" disabled={busy}
            onClick={() => run(async () => {
              if (custom) await api.deleteCoverImage(campaign.id);
              return api.updateCampaign(campaign.id, { coverPreset: null });
            })}>
            {t('Kein Titelbild')}
          </button>
        )}
      </div>
      {busy && <div className="muted small">{t('Wird gespeichert …')}</div>}
    </section>
  );
}
