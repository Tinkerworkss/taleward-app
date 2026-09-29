import { http, HttpResponse, delay } from 'msw';
import { DEMO_HOST, DEMO_USERS, demoSpeakers } from './demo';

/** Alle Titelbild-IDs (Schnittstelle 0.4.3) – wie der Server: neue Kampagnen bekommen eines zufällig */
const COVER_IDS = ['meadow', 'forest', 'desert', 'city', 'cyber', 'mountains', 'coast', 'swamp', 'dungeon', 'space', 'castle', 'dark-fantasy', 'moonwood', 'ancient-ruins', 'tavern', 'battlefield', 'frozen-north', 'arcane-ruins', 'fairy-wilds', 'underworld', 'storm-coast', 'steampunk', 'post-apocalypse', 'western', 'noir', 'space-opera', 'orient', 'necropolis', 'manor', 'riverside-mystery'];
import type { CampaignDocument, CampaignSummary, Comment, Entry, DatePoll, EntryInput, ProcessingStatus, Proposal, Session, VoteAnswer, VoiceProfile } from '../api/types';
import {
  ME, NACHBAR_HOST, account, campaigns, comments, coverImages, datePolls, documents, portraits, proposalsForDocument, seen, entries, gmNotes, proposals, proposalsFor, recaps, sessions, speakersFor, uploads,
  type MockCampaign, type MockSession
} from './db';

const B = '*/api/v1';
const TOKEN = 'mock-token';
const CHUNK = 5 * 1024 * 1024;

// Dauer der simulierten Verarbeitungsschritte in Sekunden
const PHASES = { queued: 2, transcribing: 8, summarizing: 6 };

const voice: VoiceProfile & { readyAt: number } = {
  status: 'none', createdAt: null, sampleSeconds: null, learnFromSessions: true, learnedSessionCount: 0, message: null, readyAt: 0
};

function voiceStatus(): VoiceProfile {
  if (voice.status === 'processing' && Date.now() > voice.readyAt) voice.status = 'ready';
  const { readyAt: _r, ...rest } = voice;
  return rest;
}

const err = (status: number, code: string, message: string) =>
  HttpResponse.json({ code, message }, { status });

/** Testmodus: welcher „Server“ ist gemeint? (alles außer nachbarverein.test ist der eingebaute) */
function hostKey(req: Request): string {
  const h = new URL(req.url).hostname;
  return h === NACHBAR_HOST || h === DEMO_HOST ? h : 'local';
}

/** Test-Nutzer mit den Anmelde-Angaben, die nur die Person selbst sieht */
function meUser() {
  return ME.id === 'u-robin' ? { ...ME, ...account } : { ...ME, email: null, emailPending: null, hasPassword: true, providers: [] };
}

function authed(req: Request): boolean {
  return (req.headers.get('Authorization') ?? '').startsWith(`Bearer ${TOKEN}`);
}

function myMember(c: MockCampaign) {
  // Wer verlassen hat oder entfernt wurde, ist kein Mitglied mehr
  return c.members.find((m) => m.userId === ME.id && !m.leftAt);
}

function isGm(campaignId: string): boolean {
  const c = campaigns.find((x) => x.id === campaignId);
  return !!c && myMember(c)?.role === 'gm';
}

function summary(c: MockCampaign): CampaignSummary {
  const me = myMember(c)!;
  const cs = sessions.filter((s) => s.campaignId === c.id);
  const published = cs.filter((s) => s.state === 'published');
  return {
    id: c.id,
    title: c.title,
    myRole: me.role,
    myCharacterName: me.characterName,
    memberCount: c.members.length,
    publishedSessionCount: published.length,
    pendingReviewCount: me.role === 'gm' ? cs.filter((s) => s.state === 'awaiting_review' || s.state === 'awaiting_speakers').length : 0,
    lastPublishedAt: published.map((s) => s.publishedAt!).sort().pop() ?? null,
    unread: unreadFor(c),
    archivedAt: c.archivedAt ?? null,
    organization: c.host === NACHBAR_HOST ? { id: 'org-nachbar', name: 'Spielgemeinschaft Nachbarort e. V.' } : { id: 'org-verein', name: 'Rollenspielverein' },
    coverPreset: c.coverPreset,
    coverImageUpdatedAt: coverImages[c.id]?.updatedAt ?? null,
    nextSessionAt: c.nextSessionAt,
    datePollNeedsMyVote: (() => {
      const poll = datePolls.find((p) => p.campaignId === c.id && p.status === 'open');
      return !!poll && poll.options.some((o) => !o.votes.some((v) => v.memberId === me.id));
    })()
  };
}

/** Schreitet die simulierte Verarbeitung anhand der verstrichenen Zeit voran. */
function advance(s: MockSession): ProcessingStatus {
  const t = s.phaseStartedAt ? (Date.now() - s.phaseStartedAt) / 1000 : 0;
  let progress: number | null = null;
  if (s.state === 'queued' && t > PHASES.queued) {
    s.state = 'transcribing';
    s.phaseStartedAt = Date.now();
  } else if (s.state === 'transcribing') {
    progress = Math.min(1, t / PHASES.transcribing);
    if (t > PHASES.transcribing / 2 && s.failNext) {
      s.state = 'failed';
      s.phaseStartedAt = null;
      return {
        state: 'failed', progress: null, queuePosition: null, updatedAt: new Date().toISOString(),
        message: 'Die Transkription ist abgebrochen (Testmodus: Dateiname enthält „fehler“).'
      };
    }
    if (t > PHASES.transcribing) {
      s.state = 'awaiting_speakers';
      s.transcriptionEngine = 'local';
      s.durationSeconds = 13920;
      s.audioDeletedAt = new Date().toISOString();
      s.phaseStartedAt = null;
      progress = null;
    }
  } else if (s.state === 'summarizing') {
    progress = Math.min(1, t / PHASES.summarizing);
    if (t > PHASES.summarizing) {
      s.state = 'awaiting_review';
      s.phaseStartedAt = null;
      progress = null;
      if (!recaps[s.id]) {
        recaps[s.id] = {
          sessionId: s.id, number: s.number, title: s.title ?? `Kapitel ${s.number}`, publishedAt: null,
          text: 'Dies ist ein Test-Recap aus dem nachgeahmten Server. Der echte Server schreibt hier die Zusammenfassung der Session.',
          openThreads: ['Offener Faden aus der Testsession']
        };
      }
      if (!proposals.some((p) => p.sessionId === s.id)) proposals.push(...proposalsFor(s.id));
    }
  }
  return {
    state: s.state,
    progress,
    queuePosition: s.state === 'queued' ? 1 : null,
    message: s.state === 'failed' ? 'Die Transkription ist abgebrochen (Testmodus).'
      : s.state === 'queued' ? 'Zurzeit ist kein Worker für die Transkription verbunden. Die Session wird verarbeitet, sobald einer da ist. (Testmodus)'
      : null,
    updatedAt: new Date().toISOString()
  };
}

function publicSession(s: MockSession): Session {
  const { phaseStartedAt: _ignored, ...rest } = s;
  return rest;
}

/** Kurzer Ton als Hörprobe, damit der Abspielknopf im Testmodus etwas tut. */
function toneWav(): ArrayBuffer {
  const rate = 8000, len = rate;
  const buf = new ArrayBuffer(44 + len);
  const v = new DataView(buf);
  const w = (o: number, s: string) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + len, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  w(36, 'data'); v.setUint32(40, len, true);
  for (let i = 0; i < len; i++) v.setUint8(44 + i, 128 + Math.round(40 * Math.sin((2 * Math.PI * 330 * i) / rate)));
  return buf;
}

/** Simulierte Auswertung einer Unterlage: 2 s Warteschlange, 6 s Auswertung */
function advanceDoc(d: (typeof documents)[number]): CampaignDocument {
  const t = (Date.now() - d.phaseStartedAt) / 1000;
  if (d.state === 'queued' && t > 2) { d.state = 'processing'; d.phaseStartedAt = Date.now(); }
  else if (d.state === 'processing') {
    d.progress = Math.min(1, t / 6);
    if (d.failNext && t > 3) { d.state = 'failed'; d.message = 'Text konnte nicht gelesen werden (Testmodus: Dateiname enthält „fehler“).'; }
    else if (t > 6) {
      d.state = 'awaiting_review';
      d.progress = null;
      proposals.push(...proposalsForDocument(d));
      if (d.kind !== 'gm') d.worldInfoSuggestion = 'Kaltenfurt ist die Stadt der hundert Brücken am Grauen Strom. Graf Aldric regiert sie seit zwanzig Jahren, zeigt sich aber nur noch selten.';
    }
  }
  const own = proposals.filter((p) => p.documentId === d.id);
  d.proposalCount = own.length;
  d.openProposalCount = own.filter((p) => p.decision === 'open').length;
  const { phaseStartedAt: _p, failNext: _f, ...rest } = d;
  return rest;
}

/** Spoilerschutz: den geheimen Hintergrund sehen nur die Person selbst und die SL */
function membersFor(c: MockCampaign) {
  const gm = isGm(c.id);
  return c.members.map((m) => (gm || m.userId === ME.id ? m : { ...m, characterBackstory: undefined }));
}

function commentMarker(s: MockSession): string {
  return seen.comments[s.id] ?? seen.chronicle[s.campaignId] ?? '1970-01-01T00:00:00Z';
}

function unreadCommentsIn(s: MockSession, meId: string): number {
  const marker = commentMarker(s);
  return comments.filter((k) => k.sessionId === s.id && k.authorMemberId !== meId && visibleTo(k, meId) && k.createdAt > marker).length;
}

function unreadFor(c: MockCampaign) {
  const me = myMember(c)!;
  const gm = me.role === 'gm';
  const visibleSessions = sessions.filter((s) => s.campaignId === c.id && (gm || s.state === 'published'));
  const chron = seen.chronicle[c.id] ?? '1970-01-01T00:00:00Z';
  const bib = seen.bible[c.id] ?? '1970-01-01T00:00:00Z';
  return {
    recaps: visibleSessions.filter((s) => s.state === 'published' && (s.publishedAt ?? '') > chron).length,
    comments: visibleSessions.reduce((n, s) => n + unreadCommentsIn(s, me.id), 0),
    // Die SL ändert die Bibel selbst – für sie zählt das nicht als neu
    bible: gm ? 0 : entries.filter((e) => e.campaignId === c.id && e.visibility === 'public' && !(e.hiddenFromMemberIds ?? []).includes(me.id) && e.updatedAt > bib).length
  };
}

/** Aktuelle Abstimmung: die offene, sonst die zuletzt beendete (nicht abgebrochene). */
function pollOf(campaignId: string): DatePoll | undefined {
  const list = datePolls.filter((p) => p.campaignId === campaignId && p.status !== 'cancelled');
  return list.find((p) => p.status === 'open') ?? list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

function openPoll(pollId: string) {
  const poll = datePolls.find((p) => p.id === pollId);
  const c = poll && campaigns.find((x) => x.id === poll.campaignId);
  const me = c && myMember(c);
  if (!poll || !me) return { error: err(404, 'not_found', 'Abstimmung nicht gefunden.') };
  if (poll.status !== 'open') return { error: err(409, 'date_poll_closed', 'Diese Abstimmung ist schon beendet.') };
  return { poll, me };
}

/** Kommentare gibt es für Spieler nur bei veröffentlichten Kapiteln. */
function commentContext(sessionId: string) {
  const session = sessions.find((x) => x.id === sessionId);
  const campaign = session && campaigns.find((c) => c.id === session.campaignId);
  const me = campaign && myMember(campaign);
  if (!session || !campaign || !me || (me.role !== 'gm' && session.state !== 'published')) {
    return { error: err(404, 'not_found', 'Kapitel nicht gefunden.') };
  }
  return { session, campaign, me };
}

function visibleTo(k: Comment, memberId: string): boolean {
  return k.recipientMemberId === null || k.authorMemberId === memberId || k.recipientMemberId === memberId;
}

export const handlers = [
  http.post(`${B}/auth/login`, async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as { username?: string; password?: string };
    if (!body.username || !body.password) return err(401, 'invalid_credentials', 'Benutzername und Passwort eingeben.');
    // Demo-Server: nur anja, lea, tom – das Token trägt die Person (siehe installMockFetch)
    if (hostKey(request) === DEMO_HOST) {
      const u = DEMO_USERS[body.username.trim().toLowerCase()];
      if (!u) return err(401, 'invalid_credentials', 'Auf dem Demo-Server gibt es anja, lea und tom.');
      return HttpResponse.json({ accessToken: `${TOKEN}:${u.id}`, expiresAt: new Date(Date.now() + 864e5 * 30).toISOString(), user: u });
    }
    return HttpResponse.json({ accessToken: TOKEN, expiresAt: new Date(Date.now() + 864e5 * 30).toISOString(), user: meUser() });
  }),

  http.get(`${B}/info`, ({ request }) => {
    const nachbar = new URL(request.url).hostname === NACHBAR_HOST;
    if (hostKey(request) === DEMO_HOST) {
      return HttpResponse.json({
        name: 'Taleward', operator: 'Euer Verein e. V.', contact: null, apiVersion: '0.3.9', registration: 'invite_only',
        authMethods: ['password'], privacyPolicyUrl: null, minAge: 16, externalTranscription: null,
        minAppVersion: null, latestAppVersion: null, appDownloadUrl: null, releaseNotes: null
      });
    }
    return HttpResponse.json({
      name: nachbar ? 'Chronik des Nachbarvereins' : 'Testserver',
      operator: nachbar ? 'Spielgemeinschaft Nachbarort e. V.' : 'Rollenspielverein (Testmodus)',
      contact: nachbar ? 'vorstand@nachbarverein.test' : null,
      apiVersion: '0.3.9',
      registration: 'invite_only',
      authMethods: ['password'],
      privacyPolicyUrl: null,
      minAge: 16,
      audioRetention: nachbar ? { mode: 'immediate', maxDays: null } : { mode: 'until_release', maxDays: 7 },
      authProviders: nachbar ? [] : [{ id: 'google', name: 'Google' }, { id: 'discord', name: 'Discord' }, { id: 'apple', name: 'Apple' }],
      passwordReset: !nachbar,
      externalTranscription: nachbar ? null : 'mistral',
      externalTranscriptionMode: nachbar ? null : 'fallback',
      cloudSummary: nachbar ? null : 'mistral',
      minAppVersion: nachbar ? null : '0.8.0',
      latestAppVersion: nachbar ? null : '0.10.1',
      appDownloadUrl: nachbar ? null : 'https://example.org/taleward-0.9.1.apk',
      releaseNotes: nachbar ? null : 'Einladen per Link und QR-Code, Aufnahmeknopf mit Verwandlung, Recap bearbeiten. (Testmodus)',
      appDownloadSha256: null,
      appDownloadSizeBytes: null
    });
  }),

  http.post(`${B}/auth/register`, async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as { inviteCode?: string; username?: string; displayName?: string; password?: string; acceptPrivacy?: boolean; ageConfirmed?: boolean; registrationToken?: string };
    if (!body.acceptPrivacy || !body.ageConfirmed) return err(400, 'consent_required', 'Bitte Datenschutzhinweise und Alter bestätigen.');
    if (body.registrationToken) {
      // Zweite Form (0.4.0): nach Anmeldung mit einem Dienst, ohne Benutzername und Passwort
      if (body.registrationToken !== 'reg-mock') return err(400, 'registration_token_invalid', 'Die Anmeldung über den Dienst ist abgelaufen. Bitte noch einmal.');
      if (!body.displayName) return err(400, 'invalid_input', 'Bitte einen Namen angeben.');
      Object.assign(account, { hasPassword: false, providers: ['discord'], email: 'robin@example.org', emailPending: null });
    } else {
      if (!body.username || !body.displayName) return err(400, 'invalid_input', 'Name und Benutzername fehlen.');
      if (!/^[A-Za-z0-9._-]{3,64}$/.test(body.username)) return err(400, 'username_invalid', 'Der Benutzername braucht 3–64 Zeichen aus Buchstaben, Ziffern, Punkt, Bindestrich oder Unterstrich.');
      if (!body.password || body.password.length < 8) return err(400, 'weak_password', 'Das Passwort braucht mindestens 8 Zeichen.');
    }
    const host = hostKey(request);
    if (!campaigns.some((c) => (c.host ?? 'local') === host && c.inviteCode.toUpperCase() === (body.inviteCode ?? '').trim().toUpperCase())) {
      return err(404, 'invite_invalid', 'Dieser Einladungscode ist ungültig oder abgelaufen.');
    }
    // Testmodus: alle „Server“ teilen denselben Benutzer
    return HttpResponse.json({ accessToken: TOKEN, expiresAt: new Date(Date.now() + 864e5 * 30).toISOString(), user: meUser() }, { status: 201 });
  }),

  http.post(`${B}/auth/password-reset`, async () => {
    await delay(300);
    return new HttpResponse(null, { status: 202 }); // immer 202 – verrät nicht, ob es das Konto gibt
  }),

  // Testmodus: Tickets heißen mock-<dienst>-<zweck>. Google = bekanntes Konto, Discord = neues Konto,
  // Apple/Microsoft = E-Mail gehört schon einem anderen Konto.
  http.post(`${B}/auth/oidc/exchange`, async ({ request }) => {
    await delay(300);
    const { ticket, verifier } = (await request.json()) as { ticket?: string; verifier?: string };
    const m = (ticket ?? '').match(/^mock-(google|discord|apple|microsoft)-(login|link)$/);
    if (!m || !verifier || verifier.length < 43) return err(400, 'ticket_invalid', 'Die Anmeldung ist abgelaufen. Bitte noch einmal.');
    const [, provider, purpose] = m;
    if (purpose === 'link') {
      if (!account.providers.includes(provider)) account.providers.push(provider);
      return HttpResponse.json({ status: 'ok', accessToken: null, expiresAt: null, user: meUser(), provider });
    }
    if (provider === 'google') {
      if (!account.providers.includes('google')) account.providers.push('google');
      return HttpResponse.json({ status: 'ok', accessToken: TOKEN, expiresAt: new Date(Date.now() + 864e5 * 30).toISOString(), user: meUser(), provider });
    }
    if (provider === 'discord') {
      return HttpResponse.json({ status: 'register', registrationToken: 'reg-mock', suggestedDisplayName: 'Robin', email: 'robin@example.org', provider });
    }
    return HttpResponse.json({ status: 'email_in_use', provider });
  }),

  // Ab hier alles nur mit Token
  http.all(`${B}/*`, ({ request }) => {
    const auth = request.headers.get('Authorization');
    if (!auth) return err(401, 'not_authenticated', 'Bitte melde dich an.');
    if (!authed(request)) return err(401, 'token_invalid', 'Deine Anmeldung ist abgelaufen. Bitte melde dich erneut an.');
  }),

  http.get(`${B}/me`, () => HttpResponse.json(meUser())),

  http.put(`${B}/me/email`, async ({ request }) => {
    const { email } = (await request.json()) as { email?: string };
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err(400, 'invalid_email', 'Das ist keine gültige E-Mail-Adresse.');
    account.emailPending = email.trim();
    return new HttpResponse(null, { status: 202 });
  }),

  http.delete(`${B}/me/email`, () => {
    account.email = null;
    account.emailPending = null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.put(`${B}/me/password`, async ({ request }) => {
    const { currentPassword, newPassword } = (await request.json()) as { currentPassword?: string; newPassword?: string };
    if (account.hasPassword && !currentPassword) return err(401, 'wrong_password', 'Das bisherige Passwort stimmt nicht.');
    if (!newPassword || newPassword.length < 8) return err(400, 'weak_password', 'Das Passwort braucht mindestens 8 Zeichen.');
    account.hasPassword = true;
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${B}/me/providers/:provider/link`, () => HttpResponse.json({ linkToken: 'link-mock' })),

  http.delete(`${B}/me/providers/:provider`, ({ params }) => {
    const p = params.provider as string;
    if (!account.providers.includes(p)) return err(404, 'not_found', 'Dieser Dienst ist nicht verbunden.');
    if (!account.hasPassword && account.providers.length === 1) {
      return err(409, 'last_login_method', 'Das ist deine einzige Anmeldung. Leg vorher ein Passwort fest oder verbinde einen anderen Dienst.');
    }
    account.providers = account.providers.filter((x) => x !== p);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${B}/me/export`, ({ request }) => {
    const host = hostKey(request);
    const mine = campaigns.filter((c) => (c.host ?? 'local') === host && myMember(c));
    const data = {
      exportedAt: new Date().toISOString(),
      user: ME,
      campaigns: mine.map((c) => ({ id: c.id, title: c.title, member: myMember(c) })),
      comments: comments.filter((k) => mine.some((c) => c.members.some((m) => m.id === k.authorMemberId && m.userId === ME.id))),
      voiceProfile: voiceStatus()
    };
    return new HttpResponse(JSON.stringify(data, null, 2), { headers: { 'Content-Type': 'application/json' } });
  }),

  http.delete(`${B}/me`, async ({ request }) => {
    const { password } = (await request.json()) as { password?: string };
    if (!password) return err(400, 'invalid_input', 'Bitte das Passwort eingeben.');
    const host = hostKey(request);
    const soleGm = campaigns.filter((c) => (c.host ?? 'local') === host && myMember(c)?.role === 'gm' && c.members.filter((m) => m.role === 'gm').length === 1);
    if (soleGm.length) return err(409, 'last_gm_campaigns', `Du leitest noch allein: ${soleGm.map((c) => c.title).join(', ')}. Übergib diese Kampagnen vorher an eine andere SL.`);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${B}/organizations`, ({ request }) => {
    const nachbar = hostKey(request) === NACHBAR_HOST;
    return HttpResponse.json([{ id: nachbar ? 'org-nachbar' : 'org-verein', name: nachbar ? 'Spielgemeinschaft Nachbarort e. V.' : 'Rollenspielverein', myRole: 'member' }]);
  }),

  http.get(`${B}/me/voice-profile`, () => HttpResponse.json(voiceStatus())),

  http.post(`${B}/me/voice-profile`, async ({ request }) => {
    const form = await request.formData();
    const audio = form.get('audio');
    if (form.get('consent') !== 'true') return err(400, 'consent_missing', 'Ohne Einwilligung wird kein Stimmprofil gespeichert.');
    if (!(audio instanceof Blob) || audio.size < 1000) return err(400, 'too_short', 'Die Aufnahme ist zu kurz. Lies den Text bitte vollständig vor.');
    voice.status = 'processing';
    voice.createdAt = new Date().toISOString();
    voice.sampleSeconds = 25;
    voice.learnFromSessions = form.get('learnFromSessions') !== 'false';
    voice.learnedSessionCount = 0;
    voice.readyAt = Date.now() + 3000;
    return HttpResponse.json(voiceStatus(), { status: 202 });
  }),

  http.patch(`${B}/me/voice-profile`, async ({ request }) => {
    if (voice.status === 'none') return err(404, 'not_found', 'Es gibt noch kein Stimmprofil.');
    voice.learnFromSessions = ((await request.json()) as { learnFromSessions: boolean }).learnFromSessions;
    return HttpResponse.json(voiceStatus());
  }),

  http.delete(`${B}/me/voice-profile`, () => {
    Object.assign(voice, { status: 'none', createdAt: null, sampleSeconds: null, learnFromSessions: true, learnedSessionCount: 0, readyAt: 0 });
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${B}/campaigns`, async ({ request }) => {
    await delay(200);
    const host = hostKey(request);
    return HttpResponse.json(campaigns.filter((c) => (c.host ?? 'local') === host && myMember(c)).map(summary));
  }),

  http.get(`${B}/campaigns/:id/usage`, ({ params, request }) => {
    const m = new URL(request.url).searchParams.get('month');
    if (m !== null && !/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) return err(400, 'validation_error', 'Der Monat muss im Format JJJJ-MM angegeben werden.');
    const c = campaigns.find((x) => x.id === params.id);
    if (!c || !myMember(c)) return err(404, 'not_found', 'Kampagne nicht gefunden.');
    if (!isGm(c.id)) return err(403, 'forbidden', 'Den Verbrauch sieht nur die Spielleitung.');
    const month = new Date().toISOString().slice(0, 7);
    const cs = sessions.filter((s) => s.campaignId === c.id && s.playedAt.startsWith(month.slice(0, 4)));
    return HttpResponse.json({
      month, sessions: cs.length, audioSeconds: cs.reduce((n, s) => n + (s.durationSeconds ?? 0), 0),
      documents: documents.filter((d) => d.campaignId === c.id).length, costEstimateCents: 42 * cs.length, billedTo: 'gm'
    });
  }),

  http.post(`${B}/campaigns`, async ({ request }) => {
    const body = (await request.json()) as { title: string; description?: string; language?: 'de' | 'en'; system?: MockCampaign['system']; systemName?: string | null };
    const c: MockCampaign = {
      id: 'c-' + crypto.randomUUID().slice(0, 8),
      title: body.title,
      description: body.description ?? '',
      worldInfo: '',
      language: body.language ?? 'de',
      system: body.system ?? null,
      systemName: body.systemName ?? null,
      host: hostKey(request) === 'local' ? undefined : hostKey(request),
      // Neue Kampagnen bekommen ein zufälliges Motiv
      coverPreset: COVER_IDS[Math.floor(Math.random() * COVER_IDS.length)],
      nextSessionAt: null,
      inviteCode: 'NEU-' + Math.floor(1000 + Math.random() * 9000),
      members: [{ id: 'm-' + crypto.randomUUID().slice(0, 8), userId: ME.id, displayName: ME.displayName, characterName: null, role: 'gm' }]
    };
    campaigns.push(c);
    return HttpResponse.json({ ...summary(c), description: c.description, worldInfo: c.worldInfo, language: c.language, system: c.system ?? null, systemName: c.systemName ?? null, allowExternalTranscription: !!c.allowExternalTranscription, allowCloudSummary: !!c.allowCloudSummary, members: membersFor(c) }, { status: 201 });
  }),

  http.post(`${B}/campaigns/join`, async ({ request }) => {
    const body = (await request.json()) as { code: string };
    const host = hostKey(request);
    const c = campaigns.find((x) => (x.host ?? 'local') === host && x.inviteCode.toUpperCase() === body.code.trim().toUpperCase());
    if (!c) return err(404, 'invite_invalid', 'Dieser Einladungscode ist ungültig oder abgelaufen. Frag deine Spielleitung nach einem neuen.');
    if (!myMember(c)) {
      c.members.push({ id: 'm-' + crypto.randomUUID().slice(0, 8), userId: ME.id, displayName: ME.displayName, characterName: null, role: 'player', recordingConsentAt: null });
      seen.chronicle[c.id] = seen.bible[c.id] = new Date().toISOString();
    }
    return HttpResponse.json({ ...summary(c), description: c.description, worldInfo: c.worldInfo, language: c.language, system: c.system ?? null, systemName: c.systemName ?? null, allowExternalTranscription: !!c.allowExternalTranscription, allowCloudSummary: !!c.allowCloudSummary, members: membersFor(c) });
  }),

  http.get(`${B}/campaigns/:id`, ({ params }) => {
    const c = campaigns.find((x) => x.id === params.id);
    if (!c || !myMember(c)) return err(404, 'not_found', 'Kampagne nicht gefunden.');
    return HttpResponse.json({ ...summary(c), description: c.description, worldInfo: c.worldInfo, language: c.language, system: c.system ?? null, systemName: c.systemName ?? null, allowExternalTranscription: !!c.allowExternalTranscription, allowCloudSummary: !!c.allowCloudSummary, members: membersFor(c) });
  }),

  http.patch(`${B}/campaigns/:id`, async ({ params, request }) => {
    const c = campaigns.find((x) => x.id === params.id);
    if (!c || !myMember(c)) return err(404, 'not_found', 'Kampagne nicht gefunden.');
    if (!isGm(c.id)) return err(403, 'forbidden', 'Nur die Spielleitung kann die Kampagne bearbeiten.');
    const body = (await request.json()) as { title?: string; description?: string; worldInfo?: string; language?: 'de' | 'en'; coverPreset?: string | null; system?: MockCampaign['system']; systemName?: string | null };
    const SYSTEMS = ['dsa', 'dnd', 'pathfinder', 'cthulhu', 'shadowrun', 'splittermond', 'other'];
    if (body.system !== undefined && body.system !== null && !SYSTEMS.includes(body.system)) return err(400, 'invalid_input', 'Unbekanntes Spielsystem.');
    if (body.systemName && body.systemName.length > 100) return err(400, 'invalid_input', 'Der Name des Systems ist zu lang (höchstens 100 Zeichen).');
    if (body.title !== undefined) {
      if (!body.title.trim()) return err(400, 'invalid_input', 'Der Titel darf nicht leer sein.');
      c.title = body.title.trim();
    }
    if (body.description !== undefined) c.description = body.description;
    if (body.worldInfo !== undefined) c.worldInfo = body.worldInfo;
    if (body.language === 'de' || body.language === 'en') c.language = body.language;
    if (body.system !== undefined) c.system = body.system; // null leert das Feld
    if (typeof (body as { allowCloudSummary?: boolean }).allowCloudSummary === 'boolean') {
      c.allowCloudSummary = (body as { allowCloudSummary: boolean }).allowCloudSummary;
    }
    if (typeof (body as { allowExternalTranscription?: boolean }).allowExternalTranscription === 'boolean') {
      c.allowExternalTranscription = (body as { allowExternalTranscription: boolean }).allowExternalTranscription;
    }
    if (body.systemName !== undefined) c.systemName = body.systemName || null;
    const archived = (body as { archived?: boolean }).archived;
    if (typeof archived === 'boolean') c.archivedAt = archived ? new Date().toISOString() : null;
    if (body.coverPreset !== undefined) {
      c.coverPreset = body.coverPreset;
      delete coverImages[c.id]; // Motiv gewählt: eigenes Bild entfällt
    }
    return HttpResponse.json({ ...summary(c), description: c.description, worldInfo: c.worldInfo, language: c.language, system: c.system ?? null, systemName: c.systemName ?? null, allowExternalTranscription: !!c.allowExternalTranscription, allowCloudSummary: !!c.allowCloudSummary, members: membersFor(c) });
  }),

  http.patch(`${B}/campaigns/:id/members/:mid`, async ({ params, request }) => {
    const c = campaigns.find((x) => x.id === params.id);
    const m = c?.members.find((x) => x.id === params.mid);
    if (!c || !myMember(c) || !m) return err(404, 'not_found', 'Mitglied nicht gefunden.');
    const body = (await request.json()) as { characterName?: string; characterSummary?: string; characterBackstory?: string; role?: 'gm' | 'player' };
    if ((body.characterSummary !== undefined || body.characterBackstory !== undefined) && m.userId !== ME.id) {
      return err(403, 'forbidden', 'Beschreibung und Hintergrund pflegt jede Person selbst.');
    }
    if (m.userId !== ME.id && !isGm(c.id)) return err(403, 'forbidden', 'Nur die Spielleitung kann andere Mitglieder ändern.');
    if (body.role && !isGm(c.id)) return err(403, 'forbidden', 'Nur die Spielleitung kann Rollen ändern.');
    if (body.role === 'player' && m.role === 'gm' && c.members.filter((x) => x.role === 'gm' && !x.leftAt && !x.deletedAt).length === 1) {
      return err(409, 'last_gm', 'Die Kampagne braucht mindestens eine Spielleitung.');
    }
    if (body.characterName !== undefined) m.characterName = body.characterName || null;
    if (body.characterSummary !== undefined) m.characterSummary = body.characterSummary || null;
    if (body.characterBackstory !== undefined) m.characterBackstory = body.characterBackstory || null;
    if (body.role) m.role = body.role;
    return HttpResponse.json(m);
  }),

  // ---------------- Verwalten (0.4.5): Kampagne löschen, Mitglied entfernen/verlassen, Kapitel verwerfen

  http.delete(`${B}/campaigns/:id`, async ({ params, request }) => {
    const i = campaigns.findIndex((x) => x.id === params.id);
    if (i < 0 || !myMember(campaigns[i])) return err(404, 'not_found', 'Kampagne nicht gefunden.');
    if (!isGm(campaigns[i].id)) return err(403, 'forbidden', 'Nur die Spielleitung kann die Kampagne löschen.');
    const { confirmTitle } = (await request.json().catch(() => ({}))) as { confirmTitle?: string };
    if ((confirmTitle ?? '').trim() !== campaigns[i].title) return err(400, 'confirmation_mismatch', 'Der eingegebene Titel stimmt nicht.');
    campaigns.splice(i, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${B}/campaigns/:id/members/:mid`, ({ params }) => {
    const c = campaigns.find((x) => x.id === params.id);
    const m = c?.members.find((x) => x.id === params.mid && !x.leftAt);
    if (!c || !myMember(c) || !m) return err(404, 'not_found', 'Mitglied nicht gefunden.');
    const self = m.userId === ME.id;
    if (!self && !isGm(c.id)) return err(403, 'forbidden', 'Nur die Spielleitung kann andere entfernen.');
    if (m.role === 'gm' && c.members.filter((x) => x.role === 'gm' && !x.leftAt && !x.deletedAt).length === 1) {
      return err(409, 'last_gm', 'Die Kampagne braucht mindestens eine Spielleitung. Ernenne erst eine zweite oder lösche die Kampagne.');
    }
    m.leftAt = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${B}/sessions/:sid`, ({ params }) => {
    const i = sessions.findIndex((x) => x.id === params.sid);
    if (i < 0) return err(404, 'not_found', 'Kapitel nicht gefunden.');
    if (!isGm(sessions[i].campaignId)) return err(403, 'forbidden', 'Nur die Spielleitung kann Kapitel verwerfen.');
    if (sessions[i].state === 'published') return err(409, 'session_published', 'Veröffentlichte Kapitel lassen sich nicht verwerfen.');
    sessions.splice(i, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // ---------------- Terminabstimmung (0.3.2)

  http.get(`${B}/campaigns/:id/date-poll`, ({ params }) => {
    const c = campaigns.find((x) => x.id === params.id);
    if (!c || !myMember(c)) return err(404, 'not_found', 'Kampagne nicht gefunden.');
    const poll = pollOf(c.id);
    if (!poll) return err(404, 'no_date_poll', 'Es gibt noch keine Terminabstimmung.');
    return HttpResponse.json(poll);
  }),

  http.post(`${B}/campaigns/:id/date-poll`, async ({ params, request }) => {
    const c = campaigns.find((x) => x.id === params.id);
    if (!c || !myMember(c)) return err(404, 'not_found', 'Kampagne nicht gefunden.');
    if (!isGm(c.id)) return err(403, 'forbidden', 'Eine Terminabstimmung startet die Spielleitung.');
    if (datePolls.some((p) => p.campaignId === c.id && p.status === 'open')) return err(409, 'date_poll_open', 'Es läuft bereits eine Terminabstimmung.');
    const body = (await request.json()) as { note?: string };
    const poll: DatePoll = { id: 'poll-' + crypto.randomUUID().slice(0, 8), campaignId: c.id, status: 'open', note: body.note?.trim() || null, createdAt: new Date().toISOString(), chosenOptionId: null, options: [] };
    datePolls.push(poll);
    return HttpResponse.json(poll, { status: 201 });
  }),

  http.post(`${B}/date-polls/:pid/options`, async ({ params, request }) => {
    const found = openPoll(params.pid as string);
    if ('error' in found) return found.error;
    const { poll, me } = found;
    const { startsAt } = (await request.json()) as { startsAt: string };
    if (!startsAt || isNaN(Date.parse(startsAt))) return err(400, 'invalid_input', 'Bitte ein gültiges Datum mit Uhrzeit angeben.');
    if (Date.parse(startsAt) < Date.now()) return err(400, 'date_in_past', 'Der Termin liegt in der Vergangenheit.');
    if (poll.options.some((o) => o.startsAt === new Date(startsAt).toISOString())) return err(409, 'option_exists', 'Diesen Termin gibt es schon.');
    // Wer vorschlägt, kann auch – Stimme "passt" gleich mit
    poll.options.push({ id: 'o-' + crypto.randomUUID().slice(0, 6), startsAt: new Date(startsAt).toISOString(), proposedByMemberId: me.id, votes: [{ memberId: me.id, answer: 'yes' }] });
    poll.options.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return HttpResponse.json(poll, { status: 201 });
  }),

  http.delete(`${B}/date-polls/:pid/options/:oid`, ({ params }) => {
    const found = openPoll(params.pid as string);
    if ('error' in found) return found.error;
    const { poll, me } = found;
    const o = poll.options.find((x) => x.id === params.oid);
    if (!o) return err(404, 'not_found', 'Termin nicht gefunden.');
    if (o.proposedByMemberId !== me.id && !isGm(poll.campaignId)) return err(403, 'forbidden', 'Nur wer den Termin vorgeschlagen hat oder die Spielleitung kann ihn entfernen.');
    poll.options = poll.options.filter((x) => x !== o);
    return HttpResponse.json(poll);
  }),

  http.put(`${B}/date-polls/:pid/options/:oid/vote`, async ({ params, request }) => {
    const found = openPoll(params.pid as string);
    if ('error' in found) return found.error;
    const { poll, me } = found;
    const o = poll.options.find((x) => x.id === params.oid);
    if (!o) return err(404, 'not_found', 'Termin nicht gefunden.');
    const { answer } = (await request.json()) as { answer: VoteAnswer };
    if (!['yes', 'maybe', 'no'].includes(answer)) return err(400, 'invalid_input', 'Ungültige Antwort.');
    o.votes = o.votes.filter((v) => v.memberId !== me.id).concat({ memberId: me.id, answer });
    return HttpResponse.json(poll);
  }),

  http.post(`${B}/date-polls/:pid/close`, async ({ params, request }) => {
    const found = openPoll(params.pid as string);
    if ('error' in found) return found.error;
    const { poll } = found;
    if (!isGm(poll.campaignId)) return err(403, 'forbidden', 'Den Termin legt die Spielleitung fest.');
    const { optionId } = (await request.json()) as { optionId: string };
    const o = poll.options.find((x) => x.id === optionId);
    if (!o) return err(404, 'not_found', 'Termin nicht gefunden.');
    poll.status = 'closed';
    poll.chosenOptionId = o.id;
    campaigns.find((c) => c.id === poll.campaignId)!.nextSessionAt = o.startsAt;
    return HttpResponse.json(poll);
  }),

  http.delete(`${B}/date-polls/:pid`, ({ params }) => {
    const found = openPoll(params.pid as string);
    if ('error' in found) return found.error;
    if (!isGm(found.poll.campaignId)) return err(403, 'forbidden', 'Nur die Spielleitung kann die Abstimmung abbrechen.');
    found.poll.status = 'cancelled';
    return new HttpResponse(null, { status: 204 });
  }),

  // ---------------- SL-Unterlagen (0.3.2)

  http.get(`${B}/campaigns/:id/documents`, ({ params }) => {
    if (!isGm(params.id as string)) return err(403, 'forbidden', 'Unterlagen sieht nur die Spielleitung.');
    return HttpResponse.json(documents.filter((d) => d.campaignId === params.id).map(advanceDoc).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }),

  http.post(`${B}/campaigns/:id/documents`, async ({ params, request }) => {
    if (!isGm(params.id as string)) return err(403, 'forbidden', 'Unterlagen lädt nur die Spielleitung hoch.');
    const form = await request.formData();
    const file = form.get('file');
    const kind = form.get('kind') as 'handout' | 'gm' | 'mixed';
    if (!(file instanceof File)) return err(400, 'invalid_input', 'Datei fehlt.');
    if (!['handout', 'gm', 'mixed'].includes(kind)) return err(400, 'invalid_input', 'Unbekannte Art der Unterlage.');
    if (!/\.(pdf|docx|txt|md)$/i.test(file.name)) return err(400, 'unsupported_document', 'Bitte PDF, Word (.docx) oder Text hochladen.');
    if (file.size > 50 * 1024 * 1024) return err(413, 'document_too_large', 'Die Datei ist zu groß (höchstens 50 MB).');
    const d = {
      id: 'doc-' + crypto.randomUUID().slice(0, 8), campaignId: params.id as string, title: String(form.get('title') || file.name),
      fileName: file.name, kind, sizeBytes: file.size, pageCount: /\.pdf$/i.test(file.name) ? 12 : null, state: 'queued' as const,
      progress: 0, message: null, proposalCount: 0, openProposalCount: 0, worldInfoSuggestion: null,
      createdAt: new Date().toISOString(), phaseStartedAt: Date.now(), failNext: file.name.toLowerCase().includes('fehler')
    };
    documents.push(d);
    return HttpResponse.json(advanceDoc(d), { status: 201 });
  }),

  http.get(`${B}/documents/:did`, ({ params }) => {
    const d = documents.find((x) => x.id === params.did);
    if (!d || !isGm(d.campaignId)) return err(404, 'not_found', 'Unterlage nicht gefunden.');
    return HttpResponse.json(advanceDoc(d));
  }),

  http.get(`${B}/documents/:did/proposals`, ({ params }) => {
    const d = documents.find((x) => x.id === params.did);
    if (!d || !isGm(d.campaignId)) return err(404, 'not_found', 'Unterlage nicht gefunden.');
    return HttpResponse.json(proposals.filter((p) => p.documentId === d.id));
  }),

  http.post(`${B}/documents/:did/apply`, async ({ params, request }) => {
    const d = documents.find((x) => x.id === params.did);
    if (!d || !isGm(d.campaignId)) return err(404, 'not_found', 'Unterlage nicht gefunden.');
    if (advanceDoc(d).state !== 'awaiting_review') return err(409, 'not_ready', 'Die Unterlage ist nicht zur Prüfung bereit.');
    const { applyWorldInfo } = (await request.json()) as { applyWorldInfo?: boolean };
    for (const p of proposals.filter((x) => x.documentId === d.id)) {
      if (p.decision === 'open') p.decision = 'rejected';
      if (p.decision !== 'accepted') continue;
      const target = p.targetEntryId ? entries.find((e) => e.id === p.targetEntryId) : undefined;
      if (target) {
        target.summary = p.detail;
        if (p.gmNotes) target.gmNotes = [target.gmNotes, p.gmNotes].filter(Boolean).join(' ');
        target.updatedAt = new Date().toISOString();
      } else {
        entries.push({
          id: 'e-' + crypto.randomUUID().slice(0, 8), campaignId: d.campaignId, type: p.entryType, name: p.title, summary: p.detail,
          gmNotes: p.gmNotes ?? null, visibility: p.suggestedVisibility, hiddenFromMemberIds: p.hiddenFromMemberIds ?? [], status: p.entryType === 'quest' ? 'active' : null, holderMemberId: null,
          firstSessionNumber: null, lastSessionNumber: null, mentions: [], updatedAt: new Date().toISOString()
        });
      }
    }
    if (applyWorldInfo && d.worldInfoSuggestion) {
      const c = campaigns.find((x) => x.id === d.campaignId)!;
      c.worldInfo = [c.worldInfo, d.worldInfoSuggestion].filter(Boolean).join('\n\n');
    }
    d.state = 'done';
    return HttpResponse.json(advanceDoc(d));
  }),

  http.post(`${B}/documents/:did/retry`, ({ params }) => {
    const d = documents.find((x) => x.id === params.did);
    if (!d || !isGm(d.campaignId)) return err(404, 'not_found', 'Unterlage nicht gefunden.');
    if (d.state !== 'failed') return err(409, 'not_failed', 'Die Auswertung ist nicht fehlgeschlagen.');
    Object.assign(d, { state: 'queued', message: null, phaseStartedAt: Date.now(), failNext: false });
    return HttpResponse.json(advanceDoc(d));
  }),

  http.delete(`${B}/documents/:did`, ({ params }) => {
    const i = documents.findIndex((x) => x.id === params.did);
    if (i < 0 || !isGm(documents[i].campaignId)) return err(404, 'not_found', 'Unterlage nicht gefunden.');
    documents.splice(i, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // ---------------- Kommentare (0.3.2)

  http.get(`${B}/sessions/:id/comments`, ({ params }) => {
    const ctx = commentContext(params.id as string);
    if ('error' in ctx) return ctx.error;
    return HttpResponse.json(comments.filter((k) => k.sessionId === ctx.session.id && visibleTo(k, ctx.me.id))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  }),

  http.post(`${B}/sessions/:id/comments`, async ({ params, request }) => {
    const ctx = commentContext(params.id as string);
    if ('error' in ctx) return ctx.error;
    const body = (await request.json()) as { text: string; recipientMemberId?: string | null };
    const text = body.text?.trim();
    if (!text) return err(400, 'invalid_input', 'Der Kommentar ist leer.');
    if (text.length > 4000) return err(413, 'comment_too_long', 'Der Kommentar ist zu lang (höchstens 4000 Zeichen).');
    const recipient = body.recipientMemberId ?? null;
    if (recipient) {
      const r = ctx.campaign.members.find((m) => m.id === recipient);
      if (!r || r.id === ctx.me.id) return err(400, 'invalid_recipient', 'Ungültiger Empfänger.');
      // Spieler schreiben privat nur an die SL, die SL an alle
      if (ctx.me.role !== 'gm' && r.role !== 'gm') return err(403, 'forbidden', 'Private Nachrichten gehen nur an die Spielleitung.');
    }
    const k: Comment = { id: 'k-' + crypto.randomUUID().slice(0, 8), sessionId: ctx.session.id, authorMemberId: ctx.me.id, recipientMemberId: recipient, text, createdAt: new Date().toISOString(), editedAt: null };
    comments.push(k);
    return HttpResponse.json(k, { status: 201 });
  }),

  http.patch(`${B}/comments/:cid`, async ({ params, request }) => {
    const k = comments.find((x) => x.id === params.cid);
    const ctx = k ? commentContext(k.sessionId) : null;
    if (!k || !ctx || 'error' in ctx || !visibleTo(k, ctx.me.id)) return err(404, 'not_found', 'Kommentar nicht gefunden.');
    if (k.authorMemberId !== ctx.me.id) return err(403, 'forbidden', 'Nur eigene Kommentare lassen sich bearbeiten.');
    const text = ((await request.json()) as { text: string }).text?.trim();
    if (!text) return err(400, 'invalid_input', 'Der Kommentar ist leer.');
    k.text = text;
    k.editedAt = new Date().toISOString();
    return HttpResponse.json(k);
  }),

  http.delete(`${B}/comments/:cid`, ({ params }) => {
    const idx = comments.findIndex((x) => x.id === params.cid);
    const k = comments[idx];
    const ctx = k ? commentContext(k.sessionId) : null;
    if (!k || !ctx || 'error' in ctx || !visibleTo(k, ctx.me.id)) return err(404, 'not_found', 'Kommentar nicht gefunden.');
    if (k.authorMemberId !== ctx.me.id && ctx.me.role !== 'gm') return err(403, 'forbidden', 'Nur eigene Kommentare lassen sich löschen.');
    comments.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${B}/campaigns/:id/cover-image`, ({ params }) => {
    const c = campaigns.find((x) => x.id === params.id);
    const img = coverImages[params.id as string];
    if (!c || !myMember(c) || !img) return err(404, 'not_found', 'Kein Titelbild vorhanden.');
    return new HttpResponse(img.data, { headers: { 'Content-Type': img.type } });
  }),

  http.put(`${B}/campaigns/:id/cover-image`, async ({ params, request }) => {
    const c = campaigns.find((x) => x.id === params.id);
    if (!c || !myMember(c)) return err(404, 'not_found', 'Kampagne nicht gefunden.');
    if (!isGm(c.id)) return err(403, 'forbidden', 'Nur die Spielleitung kann das Titelbild ändern.');
    const type = request.headers.get('Content-Type') ?? '';
    if (!/^image\/(jpeg|png|webp)$/.test(type)) return err(400, 'unsupported_image', 'Bitte ein JPEG-, PNG- oder WebP-Bild hochladen.');
    const data = await request.arrayBuffer();
    if (data.byteLength > 5 * 1024 * 1024) return err(413, 'image_too_large', 'Das Bild ist zu groß (höchstens 5 MB).');
    coverImages[c.id] = { data, type, updatedAt: new Date().toISOString() };
    c.coverPreset = null;
    return HttpResponse.json({ ...summary(c), description: c.description, worldInfo: c.worldInfo, language: c.language, system: c.system ?? null, systemName: c.systemName ?? null, allowExternalTranscription: !!c.allowExternalTranscription, allowCloudSummary: !!c.allowCloudSummary, members: membersFor(c) });
  }),

  http.delete(`${B}/campaigns/:id/cover-image`, ({ params }) => {
    const c = campaigns.find((x) => x.id === params.id);
    if (!c || !myMember(c)) return err(404, 'not_found', 'Kampagne nicht gefunden.');
    if (!isGm(c.id)) return err(403, 'forbidden', 'Nur die Spielleitung kann das Titelbild ändern.');
    delete coverImages[c.id];
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${B}/campaigns/:id/seen`, async ({ params, request }) => {
    const c = campaigns.find((x) => x.id === params.id);
    if (!c || !myMember(c)) return err(404, 'not_found', 'Kampagne nicht gefunden.');
    const { area } = (await request.json()) as { area: 'chronicle' | 'bible' };
    if (area !== 'chronicle' && area !== 'bible') return err(400, 'invalid_input', 'Unbekannter Bereich.');
    seen[area][c.id] = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${B}/sessions/:id/seen`, ({ params }) => {
    const ctx = commentContext(params.id as string);
    if ('error' in ctx) return ctx.error;
    seen.comments[ctx.session.id] = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${B}/campaigns/:id/members/:mid/portrait`, ({ params, request }) => {
    const c = campaigns.find((x) => x.id === params.id);
    const img = portraits[params.mid as string];
    if (!c || !myMember(c) || !img || !c.members.some((m) => m.id === params.mid)) return err(404, 'not_found', 'Kein Bild vorhanden.');
    // size=thumb: 256-px-Quadrat aus dem gewählten Ausschnitt (sonst das Original)
    const thumb = new URL(request.url).searchParams.get('size') === 'thumb' && img.thumb;
    return new HttpResponse(thumb || img.data, { headers: { 'Content-Type': thumb ? 'image/jpeg' : img.type } });
  }),

  http.put(`${B}/campaigns/:id/members/:mid/portrait`, async ({ params, request }) => {
    const c = campaigns.find((x) => x.id === params.id);
    const m = c?.members.find((x) => x.id === params.mid);
    if (!c || !myMember(c) || !m) return err(404, 'not_found', 'Mitglied nicht gefunden.');
    if (m.userId !== ME.id) return err(403, 'forbidden', 'Du kannst nur dein eigenes Bild hochladen.');
    const type = request.headers.get('Content-Type') ?? '';
    if (!/^image\/(jpeg|png|webp)$/.test(type)) return err(400, 'unsupported_image', 'Bitte ein JPEG-, PNG- oder WebP-Bild hochladen.');
    const data = await request.arrayBuffer();
    if (data.byteLength > 3 * 1024 * 1024) return err(413, 'image_too_large', 'Das Bild ist zu groß (höchstens 3 MB).');
    portraits[m.id] = { data, type, updatedAt: new Date().toISOString() };
    // Wie der Server: aus dem gewählten Ausschnitt ein quadratisches Vorschaubild schneiden
    const q = new URL(request.url).searchParams;
    const cx = Number(q.get('cropX')), cy = Number(q.get('cropY')), cs = Number(q.get('cropSize'));
    if (q.has('cropSize') && cs > 0 && typeof OffscreenCanvas !== 'undefined') {
      try {
        const bmp = await createImageBitmap(new Blob([data], { type }));
        const canvas = new OffscreenCanvas(256, 256);
        canvas.getContext('2d')!.drawImage(bmp, cx, cy, cs, cs, 0, 0, 256, 256);
        const thumb = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
        portraits[m.id].thumb = await thumb.arrayBuffer();
      } catch {
        /* Testmodus: dann eben ohne Ausschnitt */
      }
    }
    m.portraitUpdatedAt = portraits[m.id].updatedAt;
    return HttpResponse.json(m);
  }),

  http.delete(`${B}/campaigns/:id/members/:mid/portrait`, ({ params }) => {
    const c = campaigns.find((x) => x.id === params.id);
    const m = c?.members.find((x) => x.id === params.mid);
    if (!c || !myMember(c) || !m) return err(404, 'not_found', 'Mitglied nicht gefunden.');
    // Eigenes Bild oder, als Moderation, die SL
    if (m.userId !== ME.id && !isGm(c.id)) return err(403, 'forbidden', 'Nur das eigene Bild lässt sich entfernen.');
    delete portraits[m.id];
    m.portraitUpdatedAt = null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.put(`${B}/campaigns/:id/recording-consent`, async ({ params, request }) => {
    const c = campaigns.find((x) => x.id === params.id);
    const me = c && myMember(c);
    if (!c || !me) return err(404, 'not_found', 'Kampagne nicht gefunden.');
    const { granted } = (await request.json()) as { granted: boolean };
    if (typeof granted !== 'boolean') return err(400, 'invalid_input', 'granted fehlt.');
    me.recordingConsentAt = granted ? new Date().toISOString() : null;
    return HttpResponse.json(me);
  }),

  http.post(`${B}/campaigns/:id/invites`, ({ params }) => {
    const c = campaigns.find((x) => x.id === params.id);
    if (!c || !isGm(c.id)) return err(403, 'forbidden', 'Nur die Spielleitung kann einladen.');
    return HttpResponse.json({ code: c.inviteCode, expiresAt: new Date(Date.now() + 7 * 864e5).toISOString() }, { status: 201 });
  }),

  http.get(`${B}/campaigns/:id/sessions`, ({ params }) => {
    const gm = isGm(params.id as string);
    const list = sessions
      .filter((s) => s.campaignId === params.id && (gm || s.state === 'published'))
      .sort((a, b) => b.number - a.number)
      .map((s) => ({ id: s.id, number: s.number, title: s.title, playedAt: s.playedAt, state: advance(s).state, unreadComments: unreadCommentsIn(s, myMember(campaigns.find((c) => c.id === s.campaignId)!)!.id) }));
    return HttpResponse.json(list);
  }),

  http.post(`${B}/campaigns/:id/sessions`, async ({ params, request }) => {
    if (!isGm(params.id as string)) return err(403, 'forbidden', 'Nur die Spielleitung kann Sessions anlegen.');
    const body = (await request.json()) as { playedAt: string; attendees: Session['attendees']; title?: string };
    const c = campaigns.find((x) => x.id === params.id)!;
    if (c.archivedAt) return err(409, 'campaign_archived', 'Die Kampagne ist abgeschlossen. Nimm sie erst wieder auf.');
    for (const a of body.attendees) {
      if (!!a.memberId === !!a.guestName) return err(400, 'invalid_attendee', 'Jede anwesende Person braucht entweder memberId oder guestName.');
      if (a.guestName && a.consentSource !== 'on_site') return err(400, 'invalid_attendee', 'Gäste können nur vor Ort zustimmen.');
      if (a.memberId) {
        const m = c.members.find((x) => x.id === a.memberId);
        if (!m) return err(400, 'invalid_attendee', 'Unbekanntes Mitglied bei den Anwesenden.');
        if (a.consentSource === 'app' && !m.recordingConsentAt) {
          return err(409, 'consent_missing', `${m.displayName} hat in der App (noch) nicht zugestimmt.`);
        }
      }
    }
    const n = Math.max(0, ...sessions.filter((s) => s.campaignId === params.id).map((s) => s.number)) + 1;
    const s: MockSession = {
      id: 's-' + crypto.randomUUID().slice(0, 8), campaignId: params.id as string, number: n,
      title: body.title ?? null, playedAt: body.playedAt, state: 'created', source: null,
      attendees: body.attendees.map((a) => ({ ...a, consentAt: a.consent ? a.consentAt ?? new Date().toISOString() : null })),
      durationSeconds: null, audioDeletedAt: null, publishedAt: null, phaseStartedAt: null
    };
    sessions.push(s);
    return HttpResponse.json(publicSession(s), { status: 201 });
  }),

  http.get(`${B}/sessions/:id`, ({ params }) => {
    const s = sessions.find((x) => x.id === params.id);
    if (!s || (!isGm(s.campaignId) && s.state !== 'published')) return err(404, 'not_found', 'Session nicht gefunden.');
    advance(s);
    return HttpResponse.json(publicSession(s));
  }),

  http.get(`${B}/sessions/:id/status`, ({ params }) => {
    const s = sessions.find((x) => x.id === params.id);
    if (!s) return err(404, 'not_found', 'Session nicht gefunden.');
    return HttpResponse.json(advance(s));
  }),

  http.post(`${B}/sessions/:id/uploads`, async ({ params, request }) => {
    const s = sessions.find((x) => x.id === params.id);
    if (!s) return err(404, 'not_found', 'Session nicht gefunden.');
    if (s.attendees.some((a) => !a.consent)) return err(409, 'consent_missing', 'Es haben noch nicht alle Anwesenden eingewilligt.');
    const camp = campaigns.find((x) => x.id === s.campaignId)!;
    const revoked = s.attendees.filter((a) => a.consentSource === 'app' && !camp.members.find((m) => m.id === a.memberId)?.recordingConsentAt);
    if (revoked.length) return err(409, 'consent_revoked', 'Eine anwesende Person hat ihre Zustimmung inzwischen widerrufen. Die Aufnahme darf nicht verarbeitet werden.');
    const body = (await request.json()) as { source: 'table' | 'discord'; files: { fileName: string; sizeBytes: number }[] };
    // Gleiche Dateien für dieselbe Session: bestehenden Upload fortsetzen
    const signature = body.source + '|' + body.files.map((f) => `${f.fileName}:${f.sizeBytes}`).join('|');
    const existing = Object.values(uploads).find((u) => u.sessionId === s.id && u.signature === signature && !u.completed);
    if (existing) {
      return HttpResponse.json({
        uploadId: existing.id, chunkSizeBytes: CHUNK,
        files: existing.files.map((f, i) => ({ fileId: f.fileId, fileName: body.files[i].fileName, chunkCount: f.chunkCount }))
      }, { status: 201 });
    }
    if (Object.values(uploads).some((u) => u.sessionId === s.id && !u.completed)) {
      return err(409, 'upload_in_progress', 'Für diese Session läuft bereits ein anderer Upload.');
    }
    const names = body.files.map((f) => f.fileName.toLowerCase()).join(' ');
    s.failNext = names.includes('fehler');
    s.audioGone = names.includes('weg');
    const id = 'up-' + crypto.randomUUID().slice(0, 8);
    const files = body.files.map((f, i) => ({ fileId: `f${i}`, fileName: f.fileName, chunkCount: Math.max(1, Math.ceil(f.sizeBytes / CHUNK)) }));
    uploads[id] = { id, sessionId: s.id, signature, completed: false, files: files.map((f) => ({ fileId: f.fileId, chunkCount: f.chunkCount, received: new Set() })) };
    s.state = 'uploading';
    s.source = body.source;
    return HttpResponse.json({ uploadId: id, chunkSizeBytes: CHUNK, files }, { status: 201 });
  }),

  http.put(`${B}/uploads/:uid/files/:fid/chunks/:idx`, async ({ params, request }) => {
    await delay(150);
    const f = uploads[params.uid as string]?.files.find((x) => x.fileId === params.fid);
    if (!f) return err(404, 'not_found', 'Upload nicht gefunden.');
    const expected = request.headers.get('X-Chunk-SHA256');
    if (expected) {
      const digest = await crypto.subtle.digest('SHA-256', await request.arrayBuffer());
      const actual = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
      if (actual !== expected.toLowerCase()) {
        return err(400, 'chunk_checksum_mismatch', 'Ein Teil der Aufnahme ist beschädigt angekommen und wird erneut gesendet.');
      }
    }
    f.received.add(Number(params.idx));
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${B}/uploads/:uid`, ({ params }) => {
    const u = uploads[params.uid as string];
    if (!u) return err(404, 'not_found', 'Upload nicht gefunden.');
    return HttpResponse.json({
      files: u.files.map((f) => ({
        fileId: f.fileId,
        missingChunks: Array.from({ length: f.chunkCount }, (_, i) => i).filter((i) => !f.received.has(i))
      }))
    });
  }),

  http.post(`${B}/uploads/:uid/complete`, ({ params }) => {
    const u = uploads[params.uid as string];
    if (!u) return err(404, 'not_found', 'Upload nicht gefunden.');
    if (u.files.some((f) => f.received.size < f.chunkCount)) return err(409, 'incomplete', 'Es fehlen noch Teile der Aufnahme.');
    u.completed = true;
    const s = sessions.find((x) => x.id === u.sessionId)!;
    s.state = 'queued';
    s.phaseStartedAt = Date.now();
    return HttpResponse.json(advance(s), { status: 202 });
  }),

  http.post(`${B}/sessions/:id/retry`, ({ params }) => {
    const s = sessions.find((x) => x.id === params.id);
    if (!s || !isGm(s.campaignId)) return err(404, 'not_found', 'Session nicht gefunden.');
    if (s.state !== 'failed') return err(409, 'not_failed', 'Die Verarbeitung ist nicht fehlgeschlagen.');
    if (s.audioGone) return err(409, 'audio_gone', 'Die Aufnahme ist nicht mehr auf dem Server. Bitte lade sie neu hoch.');
    s.failNext = false;
    s.state = 'queued';
    s.phaseStartedAt = Date.now();
    return HttpResponse.json(advance(s), { status: 202 });
  }),

  http.get(`${B}/sessions/:id/speakers`, ({ params }) => {
    const s = sessions.find((x) => x.id === params.id);
    if (!s || !isGm(s.campaignId)) return err(403, 'forbidden', 'Nur die Spielleitung ordnet Stimmen zu.');
    const list = demoSpeakers(s.id) ?? speakersFor();
    // Mit Stimmprofil wird die eigene Stimme ohne Vorstellungsrunde erkannt
    if (voiceStatus().status === 'ready') list[0] = { ...list[0], source: 'voice_match', confidence: 0.97, sampleText: '„Also, wo waren wir stehen geblieben?“' };
    return HttpResponse.json(list);
  }),

  http.put(`${B}/sessions/:id/speakers`, ({ params }) => {
    const s = sessions.find((x) => x.id === params.id);
    if (!s || !isGm(s.campaignId)) return err(403, 'forbidden', 'Nur die Spielleitung ordnet Stimmen zu.');
    s.state = 'summarizing';
    s.phaseStartedAt = Date.now();
    if (voiceStatus().status === 'ready' && voice.learnFromSessions) voice.learnedSessionCount++;
    return HttpResponse.json(advance(s), { status: 202 });
  }),

  http.get(`${B}/sessions/:id/speakers/:sid/sample`, () =>
    new HttpResponse(toneWav(), { headers: { 'Content-Type': 'audio/wav' } })
  ),

  http.get(`${B}/sessions/:id/proposals`, ({ params }) => {
    const s = sessions.find((x) => x.id === params.id);
    if (!s || !isGm(s.campaignId)) return err(403, 'forbidden', 'Nur für die Spielleitung.');
    return HttpResponse.json(proposals.filter((p) => p.sessionId === s.id));
  }),

  http.patch(`${B}/proposals/:id`, async ({ params, request }) => {
    const p = proposals.find((x) => x.id === params.id);
    if (!p) return err(404, 'not_found', 'Vorschlag nicht gefunden.');
    const body = (await request.json()) as Partial<Proposal> & { visibility?: Proposal['suggestedVisibility'] };
    if (body.gmNotes !== undefined) p.gmNotes = body.gmNotes || null;
    if (body.visibility) p.publicSuggested = false;
    if (Array.isArray(body.hiddenFromMemberIds)) p.hiddenFromMemberIds = body.hiddenFromMemberIds;
    if (body.decision) p.decision = body.decision;
    if (body.title !== undefined) p.title = body.title;
    if (body.detail !== undefined) p.detail = body.detail;
    if (body.visibility) p.suggestedVisibility = body.visibility;
    return HttpResponse.json(p);
  }),

  http.get(`${B}/sessions/:id/recap`, ({ params }) => {
    const s = sessions.find((x) => x.id === params.id);
    const r = recaps[params.id as string];
    if (!s || !r || (!isGm(s.campaignId) && s.state !== 'published')) return err(404, 'not_found', 'Für diese Session gibt es noch keinen Recap.');
    return HttpResponse.json(r);
  }),

  http.post(`${B}/sessions/:id/publish`, ({ params }) => {
    const s = sessions.find((x) => x.id === params.id);
    if (!s || !isGm(s.campaignId)) return err(403, 'forbidden', 'Nur die Spielleitung kann veröffentlichen.');
    if (s.state !== 'awaiting_review') return err(409, 'not_ready', 'Die Session ist noch nicht fertig verarbeitet.');
    for (const p of proposals.filter((x) => x.sessionId === s.id)) {
      if (p.decision === 'open') p.decision = 'rejected';
      if (p.decision !== 'accepted') continue;
      const target = p.targetEntryId ? entries.find((e) => e.id === p.targetEntryId) : undefined;
      if (target && p.action === 'reveal') {
        // Freigabe: öffentlicher Teil wird sichtbar, der geheime bleibt
        target.summary = p.detail || target.summary;
        if (p.gmNotes !== undefined) target.gmNotes = p.gmNotes;
        target.visibility = 'public';
        target.hiddenFromMemberIds = p.hiddenFromMemberIds ?? [];
        target.lastSessionNumber = s.number;
        target.updatedAt = new Date().toISOString();
      } else if (target) {
        target.summary = p.detail;
        if (p.gmNotes) target.gmNotes = p.gmNotes;
        target.visibility = p.suggestedVisibility;
        target.hiddenFromMemberIds = p.suggestedVisibility === 'public' ? p.hiddenFromMemberIds ?? [] : [];
        target.lastSessionNumber = s.number;
        target.mentions.push({ sessionNumber: s.number, note: p.detail });
        target.updatedAt = new Date().toISOString();
      } else {
        entries.push({
          id: 'e-' + crypto.randomUUID().slice(0, 8), campaignId: s.campaignId,
          type: p.entryType === 'other' ? 'other' : p.entryType, name: p.title, summary: p.detail,
          visibility: p.suggestedVisibility, hiddenFromMemberIds: p.hiddenFromMemberIds ?? [], gmNotes: p.gmNotes ?? null, status: p.entryType === 'quest' ? 'active' : null, holderMemberId: null,
          firstSessionNumber: s.number, lastSessionNumber: s.number, mentions: [], updatedAt: new Date().toISOString()
        });
      }
    }
    s.state = 'published';
    s.publishedAt = new Date().toISOString();
    if (recaps[s.id]) recaps[s.id].publishedAt = s.publishedAt;
    return HttpResponse.json(publicSession(s));
  }),

  http.get(`${B}/sessions/:id/gm-note`, ({ params }) => {
    const s = sessions.find((x) => x.id === params.id);
    if (!s || !isGm(s.campaignId)) return err(403, 'forbidden', 'Nur für die Spielleitung.');
    return HttpResponse.json({ text: gmNotes[s.id] ?? '', updatedAt: new Date().toISOString() });
  }),

  http.put(`${B}/sessions/:id/gm-note`, async ({ params, request }) => {
    const s = sessions.find((x) => x.id === params.id);
    if (!s || !isGm(s.campaignId)) return err(403, 'forbidden', 'Nur für die Spielleitung.');
    gmNotes[s.id] = ((await request.json()) as { text: string }).text;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${B}/campaigns/:id/entries`, ({ params, request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const q = url.searchParams.get('q')?.toLowerCase();
    const gm = isGm(params.id as string);
    const meId = myMember(campaigns.find((c) => c.id === params.id)!)?.id ?? '';
    return HttpResponse.json(
      entries
        .filter((e) => e.campaignId === params.id)
        // Spoilerschutz serverseitig: geheim oder vor mir verborgen = gar nicht ausliefern
        .filter((e) => gm || (e.visibility === 'public' && !(e.hiddenFromMemberIds ?? []).includes(meId)))
        .map((e) => (gm ? e : { ...e, gmNotes: undefined, hiddenFromMemberIds: undefined }))
        .filter((e) => !type || e.type === type)
        .filter((e) => !q || (e.name + ' ' + e.summary + ' ' + (gm ? e.gmNotes ?? '' : '')).toLowerCase().includes(q))
        .sort((a, b) => a.name.localeCompare(b.name, 'de'))
    );
  }),

  http.patch(`${B}/entries/:eid`, async ({ params, request }) => {
    const e = entries.find((x) => x.id === params.eid);
    if (!e || !isGm(e.campaignId)) return err(404, 'not_found', 'Eintrag nicht gefunden.');
    const body = (await request.json()) as Partial<Entry>;
    if (body.visibility === 'public' && !(body.summary ?? e.summary)?.trim()) {
      return err(400, 'invalid_input', 'Zum Freigeben braucht der Eintrag einen Text für die Spieler.');
    }
    Object.assign(e, Object.fromEntries(Object.entries(body).filter(([k]) => ['name', 'summary', 'gmNotes', 'visibility', 'status', 'holderMemberId', 'type', 'hiddenFromMemberIds'].includes(k))));
    e.updatedAt = new Date().toISOString();
    return HttpResponse.json(e);
  }),

  http.delete(`${B}/entries/:eid`, ({ params }) => {
    const i = entries.findIndex((x) => x.id === params.eid);
    if (i < 0 || !isGm(entries[i].campaignId)) return err(404, 'not_found', 'Eintrag nicht gefunden.');
    entries.splice(i, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${B}/campaigns/:id/entries`, async ({ params, request }) => {
    if (!isGm(params.id as string)) return err(403, 'forbidden', 'Nur die Spielleitung kann Einträge anlegen.');
    const body = (await request.json()) as Partial<EntryInput>;
    if (!body.name || !body.type) return err(400, 'invalid_input', 'Name und Art des Eintrags fehlen.');
    const e = {
      ...(body as EntryInput),
      // Wie der Server: ohne Angabe nur für die SL sichtbar
      visibility: body.visibility ?? 'gm_only', id: 'e-' + crypto.randomUUID().slice(0, 8), campaignId: params.id as string,
      firstSessionNumber: null, lastSessionNumber: null, mentions: [], updatedAt: new Date().toISOString()
    };
    entries.push(e);
    return HttpResponse.json(e, { status: 201 });
  })
];
