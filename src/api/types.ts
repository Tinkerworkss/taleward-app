// Typen zur Schnittstelle docs/session-chronik-api.yaml. Bei Änderungen an der Schnittstelle hier nachziehen.

export type Role = 'gm' | 'player';
export type Visibility = 'public' | 'gm_only';
export type EntryType = 'npc' | 'location' | 'quest' | 'item' | 'faction' | 'other';

export type ProcessingState =
  | 'created'
  | 'uploading'
  | 'queued'
  | 'transcribing'
  | 'awaiting_speakers'
  | 'summarizing'
  | 'awaiting_review'
  | 'published'
  | 'failed';

export interface ApiError {
  code: string;
  message: string;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  /** Nur für die Person selbst (ab 0.4.0): bestätigte E-Mail */
  email?: string | null;
  /** Eingetragen, noch nicht bestätigt */
  emailPending?: string | null;
  /** false bei Konten, die nur über einen Anmeldedienst angelegt wurden */
  hasPassword?: boolean;
  /** Verbundene Anmeldedienste */
  providers?: AuthProviderId[];
}

export type AuthProviderId = 'google' | 'discord' | 'apple' | 'microsoft';

/** Ergebnis von POST /auth/oidc/exchange (ab 0.4.0) */
export interface OidcExchange {
  status: 'ok' | 'register' | 'email_in_use';
  accessToken?: string | null;
  expiresAt?: string | null;
  user?: User;
  registrationToken?: string | null;
  suggestedDisplayName?: string | null;
  email?: string | null;
  provider?: string | null;
}

export interface Member {
  id: string;
  userId: string;
  displayName: string;
  characterName: string | null;
  role: Role;
  /** Stehende Zustimmung zu Aufnahmen in dieser Kampagne, selbst in der App gegeben (ab 0.3.2). null = keine */
  recordingConsentAt?: string | null;
  /** Kurzbeschreibung des Charakters, für alle sichtbar; darf in die Zusammenfassung einfließen (ab 0.3.2) */
  characterSummary?: string | null;
  /** Hintergrund nur für die SL und die Person selbst; der Server lässt das Feld bei anderen weg (ab 0.3.2) */
  characterBackstory?: string | null;
  /** Gesetzt, wenn ein Charakterbild hochgeladen ist; dient als Cache-Schlüssel (ab 0.3.2) */
  portraitUpdatedAt?: string | null;
  /** Gesetzt, wenn das Konto gelöscht wurde; das Mitglied bleibt als „Gelöschtes Konto“ stehen (ab 0.3.10) */
  deletedAt?: string | null;
  /** Hat die Kampagne verlassen oder wurde entfernt; bleibt wie ein gelöschtes Konto stehen (ab 0.4.5) */
  leftAt?: string | null;
}

export interface CampaignSummary {
  id: string;
  title: string;
  /** Abgeschlossen: nur noch lesen, keine neuen Kapitel (ab 0.4.5) */
  archivedAt?: string | null;
  /** Verein/Gruppe, zu der die Kampagne gehört (ab 0.3.2) */
  organization?: { id: string; name: string } | null;
  myRole: Role;
  myCharacterName: string | null;
  memberCount: number;
  publishedSessionCount: number;
  pendingReviewCount: number;
  lastPublishedAt: string | null;
  /** Mitgeliefertes Titelbild (ID aus src/covers/presets.tsx), ab 0.3.2 */
  coverPreset?: string | null;
  /** Gesetzt, wenn ein eigenes Titelbild hochgeladen ist (es hat dann Vorrang); dient auch als Cache-Schlüssel */
  coverImageUpdatedAt?: string | null;
  /** Ungelesenes seit meinem letzten Besuch (ab 0.3.2) */
  unread?: Unread;
  /** Festgelegter Termin der nächsten Runde (ab 0.3.2) */
  nextSessionAt?: string | null;
  /** Läuft gerade eine Terminabstimmung, bei der ich noch nicht überall abgestimmt habe? (ab 0.3.2) */
  datePollNeedsMyVote?: boolean;
}

export interface Unread {
  /** Neu veröffentlichte Recaps seit dem letzten Öffnen der Chronik */
  recaps: number;
  /** Neue Kommentare anderer (öffentlich oder privat an mich) in Kapiteln, deren Kommentare ich zuletzt geöffnet habe */
  comments: number;
  /** Neue oder geänderte Bibeleinträge (die ich sehen darf, nicht von mir) seit dem letzten Öffnen der Bibel */
  bible: number;
}

export interface Campaign extends CampaignSummary {
  description: string;
  /** Spielsystem; null wird wie 'other' behandelt (ab 0.3.3) */
  system?: GameSystem | null;
  /** Freier Name des Systems, v. a. bei 'other' (ab 0.3.3) */
  systemName?: string | null;
  /** Darf der Server für diese Kampagne den externen Transkriptionsdienst nutzen? Nur SL (ab 0.3.4) */
  allowExternalTranscription?: boolean;
  /** Darf der Server Recap und Vorschläge dieser Kampagne über eine Cloud-API erstellen? Nur SL (ab 0.3.10) */
  allowCloudSummary?: boolean;
  /** Sprache der Runde: Transkription, Recaps, Vorschläge (ab 0.3.2) */
  language?: 'de' | 'en';
  /** Hintergrund der Spielwelt für alle Mitspielenden (ab Schnittstelle 0.3.2) */
  worldInfo?: string | null;
  members: Member[];
}

/**
 * Anwesende Person. Entweder ein Mitglied (memberId) oder ein Gast ohne Konto (guestName, ab 0.3.2).
 * consentSource: "app" = stehende Zustimmung des Mitglieds in seiner eigenen App,
 * "on_site" = die Person hat vor Ort selbst auf dem Gerät der SL bestätigt (nur für diese Session).
 */
export interface Attendee {
  memberId?: string;
  guestName?: string;
  consent: boolean;
  consentSource?: 'app' | 'on_site';
  consentAt?: string | null;
}

export interface SessionSummary {
  id: string;
  number: number;
  title: string | null;
  playedAt: string;
  state: ProcessingState;
  /** Neue Kommentare in diesem Kapitel seit meinem letzten Besuch (ab 0.3.2) */
  unreadComments?: number;
}

export interface Session extends SessionSummary {
  campaignId: string;
  source: 'table' | 'discord' | null;
  attendees: Attendee[];
  durationSeconds: number | null;
  audioDeletedAt: string | null;
  /** Womit transkribiert wurde (ab 0.3.4) */
  transcriptionEngine?: 'local' | 'external' | null;
  publishedAt: string | null;
}

export interface ProcessingStatus {
  state: ProcessingState;
  progress: number | null;
  queuePosition: number | null;
  message: string | null;
  updatedAt: string;
}

export interface Speaker {
  id: string;
  label: string;
  speakingSeconds: number;
  sampleText: string;
  suggestedMemberId: string | null;
  confidence: number;
  source: 'intro_round' | 'voice_match' | 'discord_track' | 'none';
}

export type ProposalDecision = 'open' | 'accepted' | 'rejected';
export type ProposalFlag = 'joke_suspected' | 'low_confidence' | 'contradicts_bible';

export interface Proposal {
  id: string;
  /** Aus einer Session – oder null, wenn der Vorschlag aus einer SL-Unterlage stammt */
  sessionId: string | null;
  /** Aus einer hochgeladenen Unterlage (ab 0.3.2) */
  documentId?: string | null;
  entryType: EntryType;
  /** create = neuer Eintrag, update = ergänzt, reveal = geheimer Eintrag ist am Tisch bekannt geworden (ab 0.3.5) */
  action: 'create' | 'update' | 'reveal';
  targetEntryId: string | null;
  title: string;
  /** Was Spieler wissen (öffentlicher Teil) */
  detail: string;
  /** Geheimer Teil für die SL (ab 0.3.2) */
  gmNotes?: string | null;
  suggestedVisibility: Visibility;
  /** Bei suggestedVisibility public: vor diesen Mitgliedern verborgen, wird beim Übernehmen an den Eintrag weitergegeben (ab 0.3.7) */
  hiddenFromMemberIds?: string[];
  /**
   * Nur bei „gemischten“ Unterlagen: Die KI hält den Eintrag für Spielerwissen. Er kommt trotzdem als gm_only;
   * die SL gibt ihn mit einem Tipp frei (ab 0.3.2).
   */
  publicSuggested?: boolean;
  /** Begründung der KI für die vorgeschlagene Sichtbarkeit (ab 0.3.2) */
  visibilityReason?: string | null;
  confidence: number;
  flags: ProposalFlag[];
  /** Belegstellen: bei Sessions Sekunden (start), bei Unterlagen Seitenzahl (page) */
  evidence: { start?: number; page?: number; quote: string }[];
  decision: ProposalDecision;
}

export interface Recap {
  sessionId: string;
  number: number;
  title: string;
  text: string;
  openThreads: string[];
  publishedAt: string | null;
}

export interface EntryInput {
  type: EntryType;
  name: string;
  summary: string;
  status?: 'active' | 'done' | null;
  holderMemberId?: string | null;
  visibility: Visibility;
  /** Geheimer Teil, nur für die SL; der Server lässt ihn für Spieler weg (ab 0.3.2) */
  gmNotes?: string | null;
  /**
   * Nur bei visibility public: vor diesen Mitgliedern verborgen („Wer weiß was“). Leer = alle sehen es.
   * Spieler bekommen das Feld nie; der Server liefert ihnen verborgene Einträge gar nicht aus (ab 0.3.6).
   */
  hiddenFromMemberIds?: string[];
}

export interface Entry extends EntryInput {
  id: string;
  campaignId: string;
  firstSessionNumber: number | null;
  lastSessionNumber: number | null;
  mentions: { sessionNumber: number; note: string }[];
  updatedAt: string;
}

export interface UploadCreated {
  uploadId: string;
  chunkSizeBytes: number;
  files: { fileId: string; fileName: string; chunkCount: number }[];
}

export interface VoiceProfile {
  status: 'none' | 'processing' | 'ready' | 'failed';
  createdAt: string | null;
  sampleSeconds: number | null;
  learnFromSessions: boolean;
  learnedSessionCount: number;
  message: string | null;
}

// ---- Ab Schnittstelle 0.3.2 ----

export type VoteAnswer = 'yes' | 'maybe' | 'no';

export interface DateOption {
  id: string;
  startsAt: string;
  proposedByMemberId: string;
  votes: { memberId: string; answer: VoteAnswer }[];
}

export interface DatePoll {
  id: string;
  campaignId: string;
  status: 'open' | 'closed' | 'cancelled';
  note: string | null;
  createdAt: string;
  chosenOptionId: string | null;
  options: DateOption[];
}

export interface Comment {
  id: string;
  sessionId: string;
  authorMemberId: string;
  /** null = für alle in der Kampagne; sonst private Nachricht, sichtbar nur für Absender und Empfänger */
  recipientMemberId: string | null;
  text: string;
  createdAt: string;
  editedAt: string | null;
}

export type DocumentKind = 'handout' | 'gm' | 'mixed';

/** Hochgeladene SL-Unterlage (ab 0.3.2), nur für die SL sichtbar */
export interface CampaignDocument {
  id: string;
  campaignId: string;
  title: string;
  fileName: string;
  kind: DocumentKind;
  sizeBytes: number;
  pageCount: number | null;
  state: 'queued' | 'processing' | 'awaiting_review' | 'done' | 'failed';
  progress: number | null;
  message: string | null;
  proposalCount: number;
  openProposalCount: number;
  /** Vorschlag für den Welt-Hintergrund aus den öffentlichen Teilen, falls sinnvoll */
  worldInfoSuggestion: string | null;
  createdAt: string;
}

/** Öffentliche Angaben eines Servers, abrufbar ohne Anmeldung (ab 0.3.2) */
export interface ServerInfo {
  name: string;
  operator: string;
  contact: string | null;
  apiVersion: string;
  /** Neue Konten nur mit Einladungscode oder gar nicht */
  registration: 'invite_only' | 'closed';
  /** Unterstützte Anmeldearten; später z. B. 'oidc' für einen zentralen Anmeldedienst oder 'passkey' */
  authMethods: string[];
  privacyPolicyUrl: string | null;
  /** Mindestalter für ein eigenes Konto (darunter nur mit Zustimmung der Eltern) */
  minAge: number;
  /** null = nur eigene Transkription; sonst Name des freigegebenen externen Anbieters (ab 0.3.4) */
  externalTranscription?: string | null;
  /** Eingerichtete Anmeldedienste (ab 0.4.0) */
  authProviders?: { id: AuthProviderId; name: string }[];
  /**
   * Wie lange das Session-Audio auf dem Server bleibt (ab 0.4.4): bis zur Freigabe des Recaps, höchstens maxDays Tage,
   * oder sofort nach der Transkription gelöscht. Die App nennt das im Einwilligungstext.
   */
  audioRetention?: { mode: 'until_release' | 'immediate'; maxDays: number | null } | null;
  /** Server kann E-Mails verschicken – „Passwort vergessen?“ anbieten (ab 0.4.0) */
  passwordReset?: boolean;
  /** fallback = externe Transkription erst nach 24 h ohne Worker; primary = Aufnahmen gehen direkt dorthin (ab 0.3.10) */
  externalTranscriptionMode?: 'fallback' | 'primary' | null;
  /** Anbieter der Cloud-Zusammenfassung (z. B. "mistral"); null = nur lokales Modell (ab 0.3.10) */
  cloudSummary?: string | null;
  /** Ältere Apps werden abgewiesen (426 app_outdated) (ab 0.3.9) */
  minAppVersion?: string | null;
  /** Neueste verfügbare App-Version – die App zeigt dann „Neue Version“ (ab 0.3.9) */
  latestAppVersion?: string | null;
  /** Wo es die App gibt (APK, später Store); auch für die Einladungsseite (ab 0.3.9) */
  appDownloadUrl?: string | null;
  /** Kurz, was neu ist (ab 0.3.9) */
  releaseNotes?: string | null;
  /** SHA-256 (hex) der APK unter appDownloadUrl, wenn der Server sie selbst anbietet (ab 0.4.1) */
  appDownloadSha256?: string | null;
  appDownloadSizeBytes?: number | null;
}

/** Verein, Laden oder Gruppe – oberste Ebene über den Kampagnen (ab 0.3.2) */
export interface Organization {
  id: string;
  name: string;
  myRole: 'admin' | 'member';
}

/** Verarbeitungsaufwand einer Kampagne in einem Monat (nur SL, ab 0.3.2) */
export interface Usage {
  month: string;
  sessions: number;
  audioSeconds: number;
  documents: number;
  /** Geschätzte Kosten in Cent (API-Kosten des Sprachmodells, ggf. Rechenzeit) */
  costEstimateCents: number | null;
  /** Wer zahlt: die SL (Betreiber der Kampagne) oder die Organisation */
  billedTo: 'gm' | 'organization';
}

/** Spielsystem der Kampagne (ab 0.3.3). Für die großen Systeme hat der Server eine Begriffsliste als Schreibhilfe. */
export type GameSystem = 'dsa' | 'dnd' | 'pathfinder' | 'cthulhu' | 'shadowrun' | 'splittermond' | 'other';

/** Gelöschtes Konto: nicht mehr als Person anbieten (Anwesende, Empfänger, Auswahl) */
export function isDeletedMember(m: Member): boolean {
  return !!m.deletedAt || m.userId === '' || !!m.leftAt;
}
