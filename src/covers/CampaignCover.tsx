import { useBlobUrl } from '../components/useBlobUrl';
import { api, apiFor } from '../api/client';
import { currentConnectionId, type Connection } from '../api/connections';
import { t } from '../i18n';
import { PresetImage, findPreset } from './presets';

interface CoverInfo {
  id: string;
  title: string;
  coverPreset?: string | null;
  coverImageUpdatedAt?: string | null;
}

export function hasCover(c: CoverInfo): boolean {
  return !!c.coverImageUpdatedAt || !!findPreset(c.coverPreset);
}

/** Titelbild einer Kampagne: eigenes Foto, sonst mitgeliefertes Motiv, sonst nichts. */
export function CampaignCover({ campaign, height, radius = 0, conn }: {
  campaign: CoverInfo;
  height: number | string;
  radius?: number | string;
  /** Server der Kampagne; ohne Angabe der aktuell geöffnete (in der Liste über alle Server nötig) */
  conn?: Connection;
}) {
  const connId = conn?.id ?? currentConnectionId() ?? '-';
  const key = campaign.coverImageUpdatedAt ? `cover:${connId}:${campaign.id}@${campaign.coverImageUpdatedAt}` : null;
  const { url, failed } = useBlobUrl(key, () => (conn ? apiFor(conn) : api).coverImage(campaign.id));

  const preset = findPreset(campaign.coverPreset);
  const box = { height, flexShrink: 0, borderRadius: radius, overflow: 'hidden', background: 'var(--parchment-deep)' } as const;

  if (key && !failed) {
    return (
      <div style={box}>
        {url && <img src={url} alt={t('Titelbild von {title}', { title: campaign.title })} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      </div>
    );
  }
  if (preset) {
    return (
      <div style={box}>
        <PresetImage preset={preset} alt={t('Titelbild von {title}', { title: campaign.title })} />
      </div>
    );
  }
  return null;
}
