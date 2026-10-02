import { p } from '../api/connections';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Campaign } from '../api/types';
import { Divider, ErrorBox, Screen, rememberCampaign } from '../components/Screen';
import { CoverPicker } from '../covers/CoverPicker';
import { CampaignCover, hasCover } from '../covers/CampaignCover';
import { t } from '../i18n';
import { InviteBox, RecordingConsent, WorldInfo } from './Overview';

/** Nach dem Anlegen einer Kampagne (SL): Titelbild, Welt, eigene Zustimmung, Einladen. Alles optional. */
export function SetupPage() {
  const { campaignId = '' } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState<unknown>(null);
  // Titelbildauswahl: offen, solange keins gewählt ist; danach eingeklappt mit „Titelbild ändern“
  const [pickerOpen, setPickerOpen] = useState(true);
  const firstLoad = useRef(true);

  const load = () =>
    api.campaign(campaignId).then((c) => {
      rememberCampaign(c);
      setCampaign(c);
      if (firstLoad.current) {
        firstLoad.current = false;
        setPickerOpen(!hasCover(c));
      }
    }).catch(setError);

  const coverChanged = (c: Campaign) => {
    setCampaign(c);
    if (hasCover(c)) setPickerOpen(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  return (
    <Screen narrow nav={false} overline={t('Neue Kampagne einrichten')} title={campaign?.title ?? ' '}>
      <ErrorBox error={error} />
      {campaign && (
        <>
          <p className="muted" style={{ margin: 0 }}>{t('Alles hier ist optional und lässt sich später auf der Übersicht ändern.')}</p>
          {hasCover(campaign) && <CampaignCover campaign={campaign} height={pickerOpen ? 130 : 180} radius="var(--radius)" />}
          {pickerOpen ? (
            <div id="cover-picker">
              <CoverPicker campaign={campaign} onChanged={coverChanged}
                onClose={() => setPickerOpen(false)} embedded={!hasCover(campaign)} />
            </div>
          ) : (
            <button type="button" className="btn outline small" style={{ alignSelf: 'flex-start' }}
              aria-expanded={false} onClick={() => setPickerOpen(true)}>
              {t('Titelbild ändern')}
            </button>
          )}
          <Divider />
          <WorldInfo campaign={campaign} onSaved={setCampaign} />
          <Divider />
          <RecordingConsent campaign={campaign} onChanged={load} />
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2>{t('Mitspielende einladen')}</h2>
            <p className="muted small" style={{ margin: 0 }}>{t('Gib den Code weiter. Wer beitritt, legt danach seinen Charakter an.')}</p>
            <InviteBox campaignId={campaign.id} campaignTitle={campaign.title} />
          </section>
          <button type="button" className="btn" onClick={() => navigate(p(`/k/${campaignId}`), { replace: true })}>{t('Zur Kampagne')}</button>
        </>
      )}
    </Screen>
  );
}
