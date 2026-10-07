/**
 * Unverschlüsselte Verbindungen (http://) nur im Heimnetz: private IPv4-Bereiche, localhost, .local, .fritz.box und
 * private IPv6-Adressen. Öffentliche Adressen gehen immer über https://.
 */
export function isHomeNetworkHost(hostname: string): boolean {
  const h = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!h) return false;
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.fritz.box')) return true;
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if ([a, b, Number(v4[3]), Number(v4[4])].some((n) => n > 255)) return false;
    return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
  }
  if (h.includes(':')) {
    if (h === '::1') return true;
    const first = parseInt(h.split(':')[0] || '0', 16);
    // fc00::/7 (eigene Adressen im Heimnetz) und fe80::/10 (nur im selben Netz)
    return (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80;
  }
  return false;
}

/** http:// mit öffentlicher Adresse wird zu https://; im Heimnetz bleibt http:// erlaubt. */
export function secureUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol === 'http:' && !isHomeNetworkHost(u.hostname)) {
      return url.trim().replace(/^http:\/\//i, 'https://');
    }
  } catch {
    /* keine Adresse – unverändert lassen, der Aufrufer meldet den Fehler */
  }
  return url;
}

/** Läuft die Verbindung unverschlüsselt (nur im Heimnetz erlaubt)? */
export function isUnencrypted(baseUrl: string): boolean {
  return /^http:\/\//i.test(baseUrl.trim());
}

/** Adresse vereinheitlichen: „verein.de“ → „https://verein.de/api/v1“ */
export function normalizeBaseUrl(input: string): string {
  let s = input.trim();
  if (s.startsWith('/')) return s.replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(s)) {
    // Server nur im Heimnetz (private IP-Adresse, localhost, .local, .fritz.box) laufen ohne HTTPS unter http://<IP>:8000
    const host = s.startsWith('[') ? s.slice(0, s.indexOf(']') + 1) : s.split(/[/:]/)[0];
    s = (isHomeNetworkHost(host) ? 'http://' : 'https://') + s;
  }
  // Unverschlüsselt nur im Heimnetz – öffentliche Adressen immer über https
  const u = new URL(secureUrl(s));
  const path = u.pathname.replace(/\/+$/, '');
  return `${u.origin}${path.endsWith('/api/v1') ? path : '/api/v1'}`;
}

/**
 * Einladung erkennen: Link „https://verein.de/einladung/RABE-4821“ (mit Server)
 * oder nur der Code „RABE-4821“ (Server muss dann gewählt werden).
 */
export function parseInvite(input: string): { baseUrl: string | null; code: string } | null {
  const s = input.trim();
  const link = s.match(/^(https?:\/\/[^/\s]+)(?:\/[^\s]*)?\/einladung\/([A-Za-z0-9-]+)\/?$/i);
  if (link) return { baseUrl: `${secureUrl(link[1])}/api/v1`, code: link[2].toUpperCase() };
  if (/^[A-Za-z]+-\d+$/.test(s)) return { baseUrl: null, code: s.toUpperCase() };
  return null;
}
