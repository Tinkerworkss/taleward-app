import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Campaign, CloudProviderInfo, ServerInfo } from '../api/types';
import { locale, t } from '../i18n';

/** „mistral“ → „Mistral“ */
export const providerName = (p: string) => p.charAt(0).toUpperCase() + p.slice(1);

function countryName(code: string | null | undefined): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames([locale()], { type: 'region' }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/**
 * Anbieter so, wie ihn alle am Tisch sehen: mit Land und ob die Daten in der EU bleiben (ab Schnittstelle 0.4.11),
 * bei älteren Servern nur der Name, z. B. „Mistral AI (Frankreich, EU)“ bzw. „Mistral“.
 */
export function providerLabel(id: string | null | undefined, info?: CloudProviderInfo | null): string | null {
  if (info) {
    const where = [countryName(info.country), info.region === 'eu' ? t('EU') : t('außerhalb der EU')].filter(Boolean).join(', ');
    return `${info.name} (${where})`;
  }
  return id ? providerName(id) : null;
}

/** Server-Info einmal pro Seite holen (Cloud-Dienste, Betriebsart) */
export function useServerInfo(): ServerInfo | null {
  const [info, setInfo] = useState<ServerInfo | null>(null);
  useEffect(() => {
    api.info().then(setInfo).catch(() => setInfo(null));
  }, []);
  return info;
}

/** Welche Cloud-Dienste diese Kampagne gerade nutzt – für alle am Tisch sichtbar */
export function cloudUse(info: ServerInfo | null, campaign: Campaign) {
  const transcription = info?.externalTranscription && campaign.allowExternalTranscription
    ? { provider: providerLabel(info.externalTranscription, info.externalTranscriptionInfo)!, primary: info.externalTranscriptionMode === 'primary' }
    : null;
  const summary = info?.cloudSummary && campaign.allowCloudSummary
    ? { provider: providerLabel(info.cloudSummary, info.cloudSummaryInfo)! }
    : null;
  return { transcription, summary };
}

/** Kasten auf der Übersicht: klar zeigen, ob Stimmen oder Text den Verein verlassen */
export function CloudNotice({ info, campaign }: { info: ServerInfo | null; campaign: Campaign }) {
  const { transcription, summary } = cloudUse(info, campaign);
  if (!transcription && !summary) return null;
  return (
    <div className="notice" style={{ flexDirection: 'column', gap: 4 }}>
      <strong>{t('Cloud-Dienste aktiv')}</strong>
      {transcription && (
        <span className="small">
          {transcription.primary
            ? t('Aufnahmen werden über {provider} transkribiert.', { provider: transcription.provider })
            : t('Ist 24 Stunden lang kein Worker erreichbar, transkribiert {provider}.', { provider: transcription.provider })}
        </span>
      )}
      {summary && <span className="small">{t('Kapitel schreibt: {provider}. Dafür gehen Text der Runde und Unterlagen dorthin, keine Stimmen.', { provider: summary.provider })}</span>}
    </div>
  );
}
