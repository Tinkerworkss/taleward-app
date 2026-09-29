import type { AuthProviderId } from '../api/types';
import { t } from '../i18n';

/*
 * Knopf „Mit Google anmelden“ usw. Die Anbieter schreiben Logo und Gestaltung vor – die offiziellen Zeichen bitte
 * aus deren Markenpaketen nach src/assets/providers/<id>.svg legen (google.svg, discord.svg, apple.svg,
 * microsoft.svg). Fehlt eine Datei, steht nur der Text da.
 */
const icons = import.meta.glob('../assets/providers/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const iconFor = (id: string) => icons[Object.keys(icons).find((k) => k.endsWith(`/${id}.svg`)) ?? ''] ?? null;

export function ProviderButton({ id, name, onClick, disabled, label }: {
  id: AuthProviderId;
  name: string;
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  const icon = iconFor(id);
  return (
    <button type="button" className="btn outline" disabled={disabled} onClick={onClick}
      style={{ justifyContent: 'center', gap: 10, fontWeight: 500 }}>
      {icon && <img src={icon} alt="" width={20} height={20} />}
      {label ?? t('Mit {name} anmelden', { name })}
    </button>
  );
}
