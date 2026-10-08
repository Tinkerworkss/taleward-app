import { api } from '../api/client';
import { apiAtLeast } from '../api/connections';
import type { ChapterPlan } from '../api/types';
import { t } from '../i18n';

/** Der Plan für die nächste Runde: der früheste, der noch nicht gespielt ist */
export function pickPlan(plans: ChapterPlan[]): ChapterPlan | null {
  return plans.find((pl) => pl.state !== 'played') ?? plans[plans.length - 1] ?? null;
}

/**
 * Plan der nächsten Runde holen; gibt es keinen, legt create einen an (für Notizen und neue Namen am Tisch).
 * Nur ab Schnittstelle 0.4.12.
 */
export async function currentPlan(campaignId: string, nextNumber: number, create: boolean): Promise<ChapterPlan | null> {
  const plan = pickPlan(await api.plans(campaignId));
  if (plan || !create) return plan;
  return api.createPlan(campaignId, { title: t('Kapitel {n}', { n: nextNumber }), sessionNumber: nextNumber, state: 'ready' });
}

/**
 * Neuen Namen als Schreibhilfe merken: im Plan der nächsten Runde (ab 0.4.12), sonst in der Namenshilfe der
 * Kampagne. Fehler sind hier egal – der Eintrag selbst ist schon angelegt.
 */
export async function rememberName(campaignId: string, name: string): Promise<void> {
  try {
    if (apiAtLeast('0.4.12')) {
      const plan = pickPlan(await api.plans(campaignId));
      if (plan) {
        if (!plan.names.includes(name)) await api.updatePlan(plan.id, { names: [...plan.names, name].slice(-100) });
        return;
      }
    }
    if (apiAtLeast('0.4.6')) {
      const c = await api.campaign(campaignId);
      const words = c.hotwords ?? [];
      if (!words.includes(name)) await api.updateCampaign(campaignId, { hotwords: [...words, name].slice(-200) });
    }
  } catch { /* Schreibhilfe ist nur eine Hilfe */ }
}
