/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_API_MODE?: 'mock' | 'real';
  /** apk (Standard, mit Updater) oder store (Play Store, ohne Updater) */
  readonly VITE_DIST?: 'apk' | 'store' | 'web';
  /** Unterpfad der Web-Fassung, z. B. /app/ */
  readonly VITE_BASE?: string;
}

/** Version der App aus package.json (vite.config.ts) */
declare const __APP_VERSION__: string;
