import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { apiAtLeast, p } from '../api/connections';
import { isDeletedMember, type Campaign, type Entry, type Proposal } from '../api/types';
import { Avatar } from '../components/Avatar';
import { IconCheck } from '../components/Icons';
import { SecretBox } from '../components/VisTag';
import { t, tn } from '../i18n';

/**
 * Die Gruppe am Tisch: wer spielt wen, Kurzbeschreibung, Hintergrund (nur SL), Zustimmung zur Aufnahme und
 * mitgebrachte Welt, die noch in keinem Kapitel vorkam (Aufhänger).
 */
export function GroupPanel({ campaign, onEntry }: { campaign: Campaign; onEntry: (entryId: string) => void }) {
  const [brought, setBrought] = useState<Proposal[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!apiAtLeast('0.4.7')) return;
    api.characterProposals(campaign.id).then(setBrought).catch(() => setBrought([]));
    api.entries(campaign.id).then(setEntries).catch(() => setEntries([]));
  }, [campaign.id]);

  const players = campaign.members.filter((m) => m.role === 'player' && !isDeletedMember(m));
  const unused = (memberId: string) => brought
    .filter((b) => b.submittedByMemberId === memberId && b.decision === 'accepted' && b.targetEntryId)
    .map((b) => entries.find((e) => e.id === b.targetEntryId))
    .filter((e): e is Entry => !!e && !e.firstSessionNumber);
  const pending = (memberId: string) => brought.filter((b) => b.submittedByMemberId === memberId && b.decision === 'open').length;

  if (!players.length) return <div className="table-panel-body"><div className="empty">{t('Noch niemand am Tisch. Lade Mitspielende über die Übersicht ein.')}</div></div>;

  return (
    <div className="table-panel-body">
      {players.map((m) => {
        const isOpen = open === m.id;
        const hooks = unused(m.id);
        const waiting = pending(m.id);
        return (
          <section key={m.id} className="table-entry open">
            <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
              <Avatar campaignId={campaign.id} member={m} size={48} />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <strong>{m.characterName ?? t('Noch ohne Charakter')}</strong>
                <span className="muted small">{m.displayName}</span>
              </div>
              {m.recordingConsentAt
                ? <span className="pill moss"><IconCheck /> {t('Zugestimmt')}</span>
                : <span className="pill">{t('Ohne Zustimmung')}</span>}
            </div>
            {m.characterSummary && <p className="small" style={{ margin: 0 }}>{m.characterSummary}</p>}
            {m.characterBackstory && (
              isOpen
                ? <SecretBox><span style={{ whiteSpace: 'pre-wrap' }}>{m.characterBackstory}</span></SecretBox>
                : <button type="button" className="btn small ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setOpen(m.id)}>{t('Hintergrund zeigen')}</button>
            )}
            {hooks.length > 0 && (
              <div className="small" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="muted">{t('Mitgebracht, kam noch in keinem Kapitel vor:')}</span>
                <div className="row wrap" style={{ gap: 6 }}>
                  {hooks.map((e) => <button key={e.id} type="button" className="btn small outline" onClick={() => onEntry(e.id)}>{e.name}</button>)}
                </div>
              </div>
            )}
            {waiting > 0 && (
              <Link className="small" to={p(`/k/${campaign.id}/mitgebracht`)}>
                {tn(waiting, '{n} mitgebrachter Eintrag wartet auf dich', '{n} mitgebrachte Einträge warten auf dich')}
              </Link>
            )}
          </section>
        );
      })}
    </div>
  );
}
