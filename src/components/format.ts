import { locale, t, tn } from '../i18n';

/** „Fr, 2. Okt · 19:00“ bzw. „Fri 2 Oct · 19:00“ */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}

export function formatDate(iso: string, month: 'short' | 'long' = 'short'): string {
  return new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month });
}

export function formatDateFull(iso: string): string {
  return new Date(iso).toLocaleDateString(locale());
}

/** „vor 3 Tagen“, „gerade eben“ … */
export function formatAgo(iso: string): string {
  const sec = (Date.now() - Date.parse(iso)) / 1000;
  if (sec < 60) return t('gerade eben');
  if (sec < 3600) return t('vor {n} Min.', { n: Math.floor(sec / 60) });
  if (sec < 86400) return t('vor {n} Std.', { n: Math.floor(sec / 3600) });
  const days = Math.floor(sec / 86400);
  if (days < 14) return days === 1 ? t('gestern') : tn(days, 'vor {n} Tag', 'vor {n} Tagen');
  return formatDate(iso);
}
