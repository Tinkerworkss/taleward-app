import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { isDeletedMember, type Campaign, type Proposal } from '../api/types';
import { Avatar } from '../components/Avatar';
import { ProposalCard } from '../components/ProposalCard';
import { ErrorBox, Screen } from '../components/Screen';
import { t, tn } from '../i18n';

/**
 * Mitgebrachte Welt prüfen (SL, ab 0.4.7): Vorschläge aus den Charakteren der Spieler – Familie, Heimat, alte Feinde.
 * Anders als bei Kapiteln wirkt jede Entscheidung sofort; es gibt nichts zu veröffentlichen.
 */
export function BroughtPage() {
  const { campaignId = '' } = useParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    Promise.all([api.campaign(campaignId), api.characterProposals(campaignId)])
      .then(([c, list]) => { setCampaign(c); setProposals(list); })
      .catch(setError);
  }, [campaignId]);

  const players = campaign?.members.filter((m) => m.role === 'player' && !isDeletedMember(m)) ?? [];
  const open = proposals?.filter((p) => p.decision === 'open') ?? [];
  const decided = proposals?.filter((p) => p.decision !== 'open') ?? [];
  const bySubmitter = [...new Set(open.map((p) => p.submittedByMemberId ?? ''))];
  const update = (next: Proposal) => setProposals((list) => list?.map((x) => (x.id === next.id ? next : x)) ?? null);

  return (
    <Screen back overline={campaign?.title ?? ' '} title={t('Mitgebrachte Welt')}>
      <ErrorBox error={error} />
      <p className="muted small" style={{ margin: 0 }}>
        {t('Was die Charaktere mitbringen: Übernehmen legt den Eintrag sofort in der Bibel an, Ablehnen verwirft ihn. Vorher kannst du alles bearbeiten.')}
      </p>
      {proposals && open.length === 0 && <div className="empty">{t('Nichts Neues mitgebracht.')}</div>}

      {campaign && bySubmitter.map((id) => {
        const m = campaign.members.find((x) => x.id === id);
        const mine = open.filter((p) => (p.submittedByMemberId ?? '') === id);
        return (
          <section key={id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="row" style={{ gap: 10 }}>
              {m && <Avatar campaignId={campaign.id} member={m} size={40} />}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <strong style={{ fontFamily: 'var(--display)', fontSize: 18 }}>{m?.characterName ?? m?.displayName ?? t('Unbekannt')}</strong>
                <span className="muted small">
                  {m ? t('gespielt von {name}', { name: m.displayName }) + ' · ' : ''}
                  {tn(mine.length, '{n} Vorschlag', '{n} Vorschläge')}
                </span>
              </div>
            </div>
            {mine.map((p) => (
              <ProposalCard key={p.id} proposal={p} players={players.filter((x) => x.id !== p.submittedByMemberId)} onError={setError} onChange={update} />
            ))}
          </section>
        );
      })}

      {decided.length > 0 && (
        <details className="card" style={{ gap: 10 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, minHeight: 32 }}>{t('Bereits entschieden ({n})', { n: decided.length })}</summary>
          {decided.map((p) => {
            const m = campaign?.members.find((x) => x.id === p.submittedByMemberId);
            return (
              <div key={p.id} className="row between" style={{ gap: 8 }}>
                <span className="small"><strong>{p.title}</strong>{m ? ` · ${m.characterName ?? m.displayName}` : ''}</span>
                <span className="pill">{p.decision === 'accepted' ? t('Übernommen') : t('Abgelehnt')}</span>
              </div>
            );
          })}
        </details>
      )}
    </Screen>
  );
}
