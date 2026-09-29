import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { handleAuthUrl } from '../auth/oidc';
import { t } from '../i18n';

/** Rückweg vom Anmeldedienst in der Web-Fassung: /app/#/auth?ticket=…&serverId=… (bzw. ?error=…) */
export function AuthReturn() {
  const { search } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    handleAuthUrl(`taleward://auth${search}`).then((target) => navigate(target, { replace: true }));
  }, [search, navigate]);
  return <div className="screen"><main className="screen-main"><div className="empty">{t('Anmeldung wird abgeschlossen …')}</div></main></div>;
}
