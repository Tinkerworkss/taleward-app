import { handleAuthUrl } from '../auth/oidc';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { apiFor } from '../api/client';
import { activeConnections, parseInvite } from '../api/connections';
import { inviteFromAppUrl } from '../invite';

/**
 * Öffnet die App über taleward://einladung?url=…, geht sie direkt in den Beitritt:
 * bekannter Server mit Anmeldung → gleich beitreten; sonst über „Mit Server verbinden“ (Konto anlegen).
 */
export function DeepLinks() {
  const navigate = useNavigate();

  // Testmodus: simulierte Rückkehr vom Anmeldedienst
  useEffect(() => {
    const onAuth = async (e: Event) => navigate(await handleAuthUrl((e as CustomEvent<string>).detail), { replace: true });
    window.addEventListener('taleward:auth-url', onAuth);
    return () => window.removeEventListener('taleward:auth-url', onAuth);
  }, [navigate]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let remove: (() => void) | undefined;

    const handle = async (url: string) => {
      // Rückkehr vom Anmeldedienst
      if (url.toLowerCase().startsWith('taleward://auth')) {
        navigate(await handleAuthUrl(url), { replace: true });
        return;
      }
      const link = inviteFromAppUrl(url);
      if (!link) return;
      const invite = parseInvite(link);
      const conn = invite?.baseUrl ? activeConnections().find((c) => c.baseUrl === invite.baseUrl) : undefined;
      if (invite && conn) {
        try {
          const c = await apiFor(conn).joinCampaign(invite.code);
          navigate(`/v/${conn.id}/k/${c.id}/willkommen`);
          return;
        } catch {
          /* z. B. Code abgelaufen – dann zeigt die Verbinden-Seite die Meldung */
        }
      }
      navigate(`/verbinden?invite=${encodeURIComponent(link)}`);
    };

    (async () => {
      const { App } = await import('@capacitor/app');
      const launch = await App.getLaunchUrl();
      if (launch?.url) handle(launch.url);
      const sub = await App.addListener('appUrlOpen', (e) => handle(e.url));
      remove = () => sub.remove();
    })();
    return () => remove?.();
  }, [navigate]);

  return null;
}
