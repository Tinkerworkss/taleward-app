import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Campaign, ServerInfo } from '../api/types';
import { t } from '../i18n';

/** „mistral“ → „Mistral“ */
export const providerName = (p: string) => p.charAt(0).toUpperCase() + p.slice(1);

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
    ? { provider: providerName(info.externalTranscription), primary: info.externalTranscriptionMode === 'primary' }
    : null;
  const summary = info?.cloudSummary && campaign.allowCloudSummary ? { provider: providerName(info.cloudSummary) } : null;
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
      {summary && <span className="small">{t('Recaps, Vorschläge und Unterlagen werden über {provider} ausgewertet.', { provider: summary.provider })}</span>}
    </div>
  );
}
