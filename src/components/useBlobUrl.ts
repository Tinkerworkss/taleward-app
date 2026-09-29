import { useEffect, useState } from 'react';

// Bilder, die das Anmelde-Token brauchen (Titelbilder, Charakterbilder), werden einmal geladen
// und für die Sitzung als lokale URL gemerkt. Der Schlüssel enthält den Änderungszeitpunkt,
// ein neues Bild bekommt also automatisch einen neuen Eintrag.
const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

export function useBlobUrl(key: string | null, load: () => Promise<Blob>): { url: string | null; failed: boolean } {
  const [url, setUrl] = useState<string | null>(key ? cache.get(key) ?? null : null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (!key) {
      setUrl(null);
      return;
    }
    if (cache.has(key)) {
      setUrl(cache.get(key)!);
      return;
    }
    let alive = true;
    // Gleichzeitige Anfragen für dasselbe Bild zusammenlegen (z. B. viele Kommentare derselben Person)
    let p = pending.get(key);
    if (!p) {
      p = load().then((blob) => {
        const u = URL.createObjectURL(blob);
        cache.set(key, u);
        return u;
      });
      pending.set(key, p);
      p.finally(() => pending.delete(key));
    }
    p.then((u) => alive && setUrl(u)).catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { url, failed };
}
