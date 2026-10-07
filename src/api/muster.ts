/*
 * Musterkampagne „Ohne Server ausprobieren“: eine fertige Kampagne, die nur in der App lebt. Ihre Adresse endet auf
 * .invalid (nie erreichbar); Anfragen dorthin beantwortet die App selbst, nichts geht ins Netz.
 */
export const MUSTER_HOST = 'muster.taleward.invalid';
export const MUSTER_BASE_URL = `https://${MUSTER_HOST}/api/v1`;

export type MusterRole = 'anja' | 'lea';

export function isMusterUrl(baseUrl: string | null | undefined): boolean {
  try {
    return !!baseUrl && new URL(baseUrl).hostname === MUSTER_HOST;
  } catch {
    return false;
  }
}

/** Kampagne der Musterkampagne je Sprache */
export const musterCampaignId = (lang: 'de' | 'en') => (lang === 'de' ? 'c-wasser' : 'c-waters');
