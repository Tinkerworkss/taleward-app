import { confirmDialog } from '../components/confirm';
import { isDeletedMember } from '../api/types';
import { p } from '../api/connections';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Campaign } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { CharacterForm } from '../components/CharacterForm';
import { IconLock } from '../components/Icons';
import { Divider, ErrorBox, Screen, rememberCampaign } from '../components/Screen';
import { t } from '../i18n';

/** Charakterseite: großes Bild, Name, Kurzbeschreibung; Hintergrund nur für die Person selbst und die SL. */
export function CharacterPage() {
  const { campaignId = '', memberId = '' } = useParams();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [editing, setEditing] = useState(false);
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

  const [busy, setBusy] = useState(false);
  const [manageError, setManageError] = useState<unknown>(null);
  const navigate = useNavigate();

  const member = campaign?.members.find((m) => m.id === memberId);
  const own = !!member && member.userId === user?.id;
  const otherGms = campaign?.members.filter((m) => m.role === 'gm' && m.id !== memberId && !isDeletedMember(m)).length ?? 0;
  const name = member ? member.characterName ?? member.displayName : '';

  const changeRole = async (role: 'gm' | 'player') => {
    const q = role === 'gm'
      ? t('{name} zur Spielleitung machen? Die Person sieht dann alles Geheime dieser Kampagne.', { name: member!.displayName })
      : own ? t('SL-Rolle abgeben? Du siehst dann nur noch, was Spieler sehen.') : t('{name} die SL-Rolle entziehen?', { name: member!.displayName });
    if (!(await confirmDialog(q, { confirmLabel: role === 'gm' ? t('Zur Spielleitung machen') : own ? t('SL-Rolle abgeben') : t('SL-Rolle entziehen') }))) return;
    setBusy(true);
    setManageError(null);
    try {
      await api.updateMember(campaignId, memberId, { role });
      await load();
    } catch (e) {
      setManageError(e);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!(await confirmDialog(t('{name} aus der Kampagne entfernen? Die Person sieht die Kampagne danach nicht mehr. Ihre Kommentare bleiben stehen.', { name }), { confirmLabel: t('Entfernen'), danger: true }))) return;
    setBusy(true);
    try {
      await api.removeMember(campaignId, memberId);
      navigate(p(`/k/${campaignId}`), { replace: true });
    } catch (e) {
      setManageError(e);
      setBusy(false);
    }
  };

  const title = member ? member.characterName ?? member.displayName : ' ';

  return (
    <Screen back overline={campaign?.title ?? ' '} title={member?.role === 'gm' ? member.displayName : title}>
      <ErrorBox error={error} />
      {campaign && !member && !error && <div className="empty">{t('Nicht gefunden.')}</div>}
      {campaign && member && (editing ? (
        <section className="card">
          <CharacterForm campaign={campaign} member={member} submitLabel={t('Speichern')}
            onSaved={() => { setEditing(false); load(); }}
            secondary={{ label: t('Abbrechen'), onClick: () => setEditing(false) }} />
        </section>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Avatar campaignId={campaign.id} member={member} size={160} />
            <div className="muted">
              {member.role === 'gm' ? t('Spielleitung') : t('gespielt von {name}', { name: member.displayName })}
            </div>
          </div>
          {member.role !== 'gm' && (
            member.characterSummary
              ? <div className="card recap"><p>{member.characterSummary}</p></div>
              : <div className="muted small" style={{ textAlign: 'center' }}>{own ? t('Noch keine Kurzbeschreibung.') : t('Noch keine Beschreibung.')}</div>
          )}
          {member.characterBackstory && (
            <section className="card secret">
              <h2 className="row" style={{ gap: 8 }}><IconLock /> {t('Hintergrund')}</h2>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{member.characterBackstory}</p>
              <div className="muted small">{own ? t('Sehen nur du und die Spielleitung.') : t('Nur für dich als Spielleitung sichtbar.')}</div>
            </section>
          )}
          {own && (
            <>
              <Divider />
              <button type="button" className="btn outline" onClick={() => setEditing(true)}>
                {member.role === 'gm' ? t('Bild ändern') : t('Charakter bearbeiten')}
              </button>
            </>
          )}
          {/* Mitglieder verwalten (nur SL): Rolle ändern, entfernen */}
          {campaign.myRole === 'gm' && !isDeletedMember(member) && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Divider />
              <h2>{t('Rolle in der Kampagne')}</h2>
              <ErrorBox error={manageError} />
              {member.role === 'player' && (
                <button type="button" className="btn outline" disabled={busy} onClick={() => changeRole('gm')}>{t('Zur Spielleitung machen')}</button>
              )}
              {member.role === 'gm' && (otherGms > 0 ? (
                <button type="button" className="btn outline" disabled={busy} onClick={() => changeRole('player')}>
                  {own ? t('SL-Rolle abgeben') : t('SL-Rolle entziehen')}
                </button>
              ) : own && <span className="muted small">{t('Du bist die einzige Spielleitung. Ernenne erst eine zweite, dann kannst du die Rolle abgeben.')}</span>)}
              {!own && (
                <button type="button" className="btn danger outline" disabled={busy} onClick={remove}>{t('Aus der Kampagne entfernen')}</button>
              )}
            </section>
          )}
        </>
      ))}
    </Screen>
  );
}
