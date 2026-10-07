import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { CharacterStatus } from '../api/types';
import { CharacterEditor } from '../characters/CharacterEditor';
import { STATUS_LABEL } from '../characters/labels';
import { CharacterPortrait } from '../characters/Portrait';
import { listCharacters, onCharactersChanged, STATUS_ORDER } from '../characters/store';
import { linkOutdated } from '../characters/sync';
import { Screen } from '../components/Screen';
import { t, tn } from '../i18n';

/**
 * „Meine Charaktere“: die eigene Sammlung, unabhängig von Server und Kampagne. Ein Charakter kann in mehreren
 * Kampagnen mitspielen und bleibt erhalten, wenn eine Kampagne endet.
 */
export function CharactersPage() {
  const navigate = useNavigate();
  const [list, setList] = useState(listCharacters);
  const [filter, setFilter] = useState<CharacterStatus | 'all'>('active');
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    const refresh = () => setList(listCharacters());
    window.addEventListener('session-chronik:connections', refresh);
    const off = onCharactersChanged(refresh);
    return () => { off(); window.removeEventListener('session-chronik:connections', refresh); };
  }, []);

  const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, list.filter((c) => c.status === s).length])) as Record<CharacterStatus, number>;
  const showFilter = counts.retired + counts.deceased > 0;
  const shown = list.filter((c) => !showFilter || filter === 'all' || c.status === filter);

  return (
    <Screen nav={false} backTo={{ to: '/', label: t('Kampagnen') }} overline={t('Nur in dieser App')} title={t('Meine Charaktere')}>
      {creating ? (
        <section className="card">
          <h2>{t('Neuer Charakter')}</h2>
          <CharacterEditor submitLabel={t('Anlegen')}
            onSaved={(c) => navigate(`/charaktere/${c.id}`, { replace: true })}
            secondary={{ label: t('Abbrechen'), onClick: () => setCreating(false) }} />
        </section>
      ) : (
        <>
          {list.length === 0 && (
            <div className="empty">
              {t('Hier sammelst du deine Charaktere – mit Bild, Hintergrund, privaten Notizen und allem, was sie in die Welt mitbringen. Du nimmst sie in jede Kampagne mit.')}
            </div>
          )}
          {showFilter && (
            <div className="segmented" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }} role="group" aria-label={t('Anzeigen')}>
              {(['active', 'retired', 'deceased', 'all'] as const).map((s) => (
                <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)}>
                  {s === 'all' ? t('Alle ({n})', { n: list.length }) : t(STATUS_LABEL[s])}
                </button>
              ))}
            </div>
          )}
          <div className="grid-cards">
            {shown.map((c) => {
              const outdated = c.links.some((l) => linkOutdated(c, l));
              return (
                <Link key={c.id} to={`/charaktere/${c.id}`} className="card">
                  <div className="row" style={{ gap: 14, alignItems: 'center' }}>
                    <CharacterPortrait id={c.id} name={c.name} portrait={c.portrait} meta={c.portraitMeta} size={64} faded={c.status !== 'active'} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <h2 style={{ fontSize: 19 }}>{c.name}</h2>
                      <span className="muted small">
                        {[c.nickname && t('„{q}“', { q: c.nickname }), c.system, c.status !== 'active' && t(STATUS_LABEL[c.status])].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  </div>
                  {c.summary && <span className="small" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.summary}</span>}
                  <div className="row wrap" style={{ gap: 8 }}>
                    <span className="muted small">
                      {c.links.length
                        ? tn(c.links.length, 'Spielt in {n} Kampagne', 'Spielt in {n} Kampagnen')
                        : t('Noch in keiner Kampagne')}
                      {c.world.length ? ' · ' + tn(c.world.length, '{n} mitgebrachter Eintrag', '{n} mitgebrachte Einträge') : ''}
                    </span>
                    {outdated && <span className="pill seal">{t('Neuer Stand')}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
          <button type="button" className="btn" onClick={() => setCreating(true)}>{t('Neuer Charakter')}</button>
          <p className="muted small" style={{ margin: 0, textAlign: 'center' }}>
            {t('Deine Sammlung liegt nur auf diesem Gerät. Kampagnen bekommen eine Kopie von Name, Bild, Beschreibung und Hintergrund – private Notizen nie.')}
          </p>
        </>
      )}
    </Screen>
  );
}
