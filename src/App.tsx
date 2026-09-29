import { BackButton } from './components/BackButton';
import { AuthReturn } from './pages/AuthReturn';
import { DeepLinks } from './components/DeepLinks';
import { ConfirmHost } from './components/confirm';
import type { JSX } from 'react';
import { LanguageProvider } from './i18n';
import { ConnectionScope } from './components/ConnectionScope';
import { ConnectPage } from './pages/ConnectPage';
import { AccountPage } from './pages/AccountPage';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Bible } from './pages/Bible';
import { Campaigns } from './pages/Campaigns';
import { Chronicle } from './pages/Chronicle';
import { Overview } from './pages/Overview';
import { DatePollPage } from './pages/DatePollPage';
import { Processing } from './pages/Processing';
import { RecapPage } from './pages/RecapPage';
import { Recording } from './pages/Recording';
import { Review } from './pages/Review';
import { Speakers } from './pages/Speakers';
import { VoiceProfile } from './pages/VoiceProfile';
import { WelcomePage } from './pages/WelcomePage';
import { SetupPage } from './pages/SetupPage';
import { CharacterPage } from './pages/CharacterPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { DocumentReview } from './pages/DocumentReview';

/** Seiten, die zu einem bestimmten Server gehören (unter /v/<server>/…) */
const scoped = (el: JSX.Element) => <ConnectionScope>{el}</ConnectionScope>;

/** Verbinden-Seite neu aufbauen, wenn sich die Adresse ändert (z. B. Rückkehr vom Anmeldedienst) */
function ConnectRoute() {
  const location = useLocation();
  return <ConnectPage key={location.search} />;
}

function Routed() {
  const { active, connections } = useAuth();
  // Noch nie verbunden: direkt zur Einrichtung. Nur abgelaufene Anmeldungen: Liste zeigt „Neu anmelden“.
  if (connections.length === 0 && active.length === 0) {
    return (
      <>
      <DeepLinks />
      <Routes>
        <Route path="/verbinden" element={<ConnectRoute />} />
      <Route path="/auth" element={<AuthReturn />} />
        <Route path="/auth" element={<AuthReturn />} />
        <Route path="*" element={<ConnectRoute />} />
      </Routes>
      </>
    );
  }
  return (
    <>
    <DeepLinks />
    <Routes>
      <Route path="/" element={<Campaigns />} />
      <Route path="/verbinden" element={<ConnectRoute />} />
      <Route path="/konto" element={<AccountPage />} />
      <Route path="/v/:conn/k/:campaignId" element={scoped(<Overview />)} />
      <Route path="/v/:conn/k/:campaignId/chronik" element={scoped(<Chronicle />)} />
      <Route path="/v/:conn/k/:campaignId/aufnahme" element={scoped(<Recording />)} />
      <Route path="/v/:conn/k/:campaignId/bibel" element={scoped(<Bible />)} />
      <Route path="/v/:conn/k/:campaignId/termin" element={scoped(<DatePollPage />)} />
      <Route path="/v/:conn/k/:campaignId/willkommen" element={scoped(<WelcomePage />)} />
      <Route path="/v/:conn/k/:campaignId/einrichten" element={scoped(<SetupPage />)} />
      <Route path="/v/:conn/k/:campaignId/charakter/:memberId" element={scoped(<CharacterPage />)} />
      <Route path="/v/:conn/k/:campaignId/unterlagen" element={scoped(<DocumentsPage />)} />
      <Route path="/v/:conn/k/:campaignId/unterlagen/:documentId" element={scoped(<DocumentReview />)} />
      <Route path="/v/:conn/s/:sessionId" element={scoped(<Processing />)} />
      <Route path="/v/:conn/s/:sessionId/stimmen" element={scoped(<Speakers />)} />
      <Route path="/v/:conn/s/:sessionId/freigabe" element={scoped(<Review />)} />
      <Route path="/v/:conn/s/:sessionId/recap" element={scoped(<RecapPage />)} />
      <Route path="/v/:conn/profil/stimme" element={scoped(<VoiceProfile />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}

export function App() {
  return (
    <LanguageProvider>
    <AuthProvider>
      <ConfirmHost />
      <BackButton />
      {/* HashRouter: funktioniert ohne Server-Konfiguration im Browser und in der APK */}
      <HashRouter>
        <Routed />
      </HashRouter>
    </AuthProvider>
    </LanguageProvider>
  );
}
