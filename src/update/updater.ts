import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

/*
 * Fassungen der App:
 * - apk   (Standard, Website/Server): mit eigenem Updater – herunterladen, SHA-256 prüfen, Installationsdialog öffnen.
 * - store (Play Store, npm run android:store): ohne Updater, nur der Hinweis „Update im Play Store“.
 * - web   (npm run build:web, unter /app/): immer die aktuelle Fassung vom Webserver – keine Update-Hinweise.
 * Beide Fassungen müssen mit demselben Schlüssel signiert sein.
 */
export const DIST: 'apk' | 'store' | 'web' =
  import.meta.env.VITE_DIST === 'store' ? 'store' : import.meta.env.VITE_DIST === 'web' ? 'web' : 'apk';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=app.taleward';

interface AppUpdaterPlugin {
  downloadAndInstall(o: { url: string; sha256?: string | null; sizeBytes?: number | null }): Promise<{ status: 'installing' | 'needs_permission' }>;
  install(): Promise<{ status: 'installing' | 'needs_permission' }>;
  canInstallPackages(): Promise<{ value: boolean }>;
  openInstallSettings(): Promise<void>;
  addListener(event: 'progress', cb: (p: { loaded: number; total: number }) => void): Promise<PluginListenerHandle>;
}

const AppUpdater = registerPlugin<AppUpdaterPlugin>('AppUpdater');

/** Kann diese App sich selbst aktualisieren? (nur APK-Fassung auf dem Handy) */
export const canSelfUpdate = () => Capacitor.isNativePlatform() && DIST === 'apk';

export async function downloadAndInstall(
  o: { url: string; sha256?: string | null; sizeBytes?: number | null },
  onProgress: (fraction: number | null) => void
): Promise<'installing' | 'needs_permission'> {
  const sub = await AppUpdater.addListener('progress', (p) => onProgress(p.total > 0 ? p.loaded / p.total : null));
  try {
    return (await AppUpdater.downloadAndInstall(o)).status;
  } finally {
    sub.remove();
  }
}

export const installDownloaded = async () => (await AppUpdater.install()).status;
export const openInstallSettings = () => AppUpdater.openInstallSettings();
