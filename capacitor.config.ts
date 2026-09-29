import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.taleward',
  appName: 'Taleward',
  webDir: 'dist',
  // Farbe hinter der App beim Start (tinte)
  backgroundColor: '#17313b',
  android: {
    // Server „nur im Heimnetz“ laufen ohne HTTPS (http://<IP>:8000) – offizielle Betriebsart, bleibt erlaubt.
    // androidScheme 'http' nicht mehr ändern: sonst gehen gespeicherte Anmeldungen der App verloren.
    allowMixedContent: true
  },
  server: {
    androidScheme: 'http',
    cleartext: true
  }
};

export default config;
