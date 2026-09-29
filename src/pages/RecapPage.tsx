import { t } from '../i18n';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Campaign, Recap } from '../api/types';
import { Comments } from '../components/Comments';
import { OpenThreads, RecapView } from '../components/RecapView';
import { Divider, ErrorBox, Screen, rememberCampaign } from '../components/Screen';

export function RecapPage() {
  const { sessionId = '' } = useParams();
  const [playedAt, setPlayedAt] = useState<string | null>(null);
  const [recap, setRecap] = useState<Recap | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    (async () => {
      try {
        const session = await api.session(sessionId);
        const [r, c] = await Promise.all([api.recap(sessionId), api.campaign(session.campaignId)]);
        rememberCampaign(c);
        setRecap(r);
        setPlayedAt(session.playedAt);
        setCampaign(c);
        // Kommentare dieses Kapitels gelten als gelesen; danach Zähler neu holen (für den Punkt in der Leiste)
        api.markSessionSeen(sessionId)
          .then(() => api.campaign(c.id))
          .then((fresh) => {
            rememberCampaign(fresh);
            window.dispatchEvent(new Event('session-chronik:unread'));
          })
          .catch(() => undefined);
      } catch (e) {
        setError(e);
      }
    })();
  }, [sessionId]);

  return (
    <Screen narrow back overline={campaign?.title ?? t('Chronik')} title={recap ? t('Kapitel {n}', { n: recap.number }) : ' '}>
      <ErrorBox error={error} />
      {recap && (
        <>
          <RecapView recap={recap} playedAt={playedAt} />
          <OpenThreads threads={recap.openThreads} />
        </>
      )}
      {recap && campaign && (
        <>
          <Divider />
          <Comments sessionId={sessionId} campaign={campaign} />
        </>
      )}
    </Screen>
  );
}
