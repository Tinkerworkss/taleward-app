import { p } from '../api/connections';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Campaign } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { CharacterForm } from '../components/CharacterForm';
import { Divider, ErrorBox, Screen, rememberCampaign } from '../components/Screen';
import { t } from '../i18n';
import { RecordingConsent } from './Overview';

/**
 * Nach dem Beitritt als Spieler: 1. eigener Charakter, 2. Zustimmung zu Aufnahmen.
 * Beides lässt sich überspringen – die Kampagne ist nie gesperrt.
 */
export function WelcomePage() {
  const { campaignId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<unknown>(null);

  const load = () =>
    api.campaign(campaignId).then((c) => {
      rememberCampaign(c);
      setCampaign(c);
    }).catch(setError);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const me = campaign?.members.find((m) => m.userId === user?.id);
  const done = () => navigate(p(`/k/${campaignId}`), { replace: true });

  return (
    <Screen narrow nav={false} overline={t('Willkommen am Tisch')} title={campaign?.title ?? ' '} hero={{ campaign, large: true }}>
      <ErrorBox error={error} />
      {campaign?.description && <p className="muted" style={{ margin: 0 }}>{campaign.description}</p>}

      {campaign && me && (
        <>
          <div className="overline">{t('Schritt {n} von 2', { n: step })}</div>
          {step === 1 && (
            <section className="card">
              <h2>{t('Dein Charakter')}</h2>
              <p className="muted small" style={{ margin: 0 }}>
                {t('Geht auch später auf der Übersicht.')}
              </p>
              <CharacterForm
                campaign={campaign}
                member={me}
                submitLabel={t('Speichern und weiter')}
                onSaved={() => { load(); setStep(2); }}
                secondary={{ label: t('Später'), onClick: () => setStep(2) }}
              />
            </section>
          )}
          {step === 2 && (
            <>
              <RecordingConsent campaign={campaign} onChanged={load} />
              <Divider />
              <button type="button" className="btn" onClick={done}>{t('Zur Kampagne')}</button>
            </>
          )}
        </>
      )}
    </Screen>
  );
}
