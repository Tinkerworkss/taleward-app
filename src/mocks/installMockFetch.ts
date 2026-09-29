import { getResponse } from 'msw';
import { handlers } from './handlers';
import { ME } from './db';
import { DEMO_USERS } from './demo';

const DEFAULT_ME = { ...ME };

/**
 * Testmodus: leitet alle Anfragen an /api/v1 auf die nachgeahmten Endpunkte um.
 * Bewusst ohne Service Worker, damit es auch in der Android-APK funktioniert.
 * Die Daten leben nur im Arbeitsspeicher und sind nach einem Neustart zurückgesetzt.
 */
export function installMockFetch(): void {
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    if (new URL(request.url).pathname.startsWith('/api/v1/')) {
      // Wer fragt? Demo-Tokens tragen die Person („mock-token:u-lea“), sonst der Standard-Nutzer
      const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer /, '');
      const id = token.split(':')[1];
      const who = Object.values(DEMO_USERS).find((u) => u.id === id) ?? DEFAULT_ME;
      Object.assign(ME, who);
      const response = await getResponse(handlers, request);
      if (response) return response;
    }
    return realFetch(input, init);
  };
}
