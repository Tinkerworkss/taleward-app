/**
 * Aufnahme-Schnittstelle. Aktuell steckt dahinter der MediaRecorder des Browsers bzw. WebViews.
 *
 * WICHTIG für den Einsatz am Tisch: Der WebView-Recorder stoppt, wenn Android die App
 * in den Hintergrund schickt oder der Bildschirm ausgeht. Für echte 4-Stunden-Sessions
 * kommt eine native Implementierung (Capacitor-Plugin mit Foreground-Service) hinter
 * genau diese Schnittstelle – die Bildschirme müssen dafür nicht geändert werden.
 */
export interface Recorder {
  start(): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): Promise<Blob>;
  readonly state: 'idle' | 'recording' | 'paused';
  /** Aktueller Pegel 0–1 (für eine Pegelanzeige); 0, wenn nicht verfügbar */
  level?(): number;
}

function pickMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';
}

export class WebRecorder implements Recorder {
  private rec: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private wakeLock: { release(): Promise<void> } | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private buf: Float32Array | null = null;

  level(): number {
    if (!this.analyser || !this.buf) return 0;
    this.analyser.getFloatTimeDomainData(this.buf as Float32Array<ArrayBuffer>);
    let sum = 0;
    for (const v of this.buf) sum += v * v;
    // RMS auf eine gut ablesbare Skala bringen (Sprechen in normaler Lautstärke ≈ 0,4–0,8)
    return Math.min(1, Math.sqrt(sum / this.buf.length) * 4);
  }

  get state(): 'idle' | 'recording' | 'paused' {
    if (!this.rec || this.rec.state === 'inactive') return 'idle';
    return this.rec.state;
  }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        // Am Tisch lieber rohes Signal: Rauschunterdrückung schneidet leise Sprecher ab
        noiseSuppression: false,
        echoCancellation: false,
        autoGainControl: true
      }
    });
    const mimeType = pickMimeType();
    this.rec = new MediaRecorder(this.stream, {
      mimeType: mimeType || undefined,
      audioBitsPerSecond: 32000
    });
    this.chunks = [];
    this.rec.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.rec.start(10_000);
    try {
      this.audioCtx = new AudioContext();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.audioCtx.createMediaStreamSource(this.stream).connect(this.analyser);
      this.buf = new Float32Array(this.analyser.fftSize);
    } catch {
      this.analyser = null; // ohne Pegelanzeige weiter
    }
    try {
      // Hält den Bildschirm an, solange die App im Vordergrund ist
      const nav = navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } };
      this.wakeLock = (await nav.wakeLock?.request('screen')) ?? null;
    } catch {
      this.wakeLock = null;
    }
  }

  pause(): void {
    this.rec?.pause();
  }

  resume(): void {
    this.rec?.resume();
  }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      const rec = this.rec;
      if (!rec) return resolve(new Blob());
      rec.onstop = () => {
        this.stream?.getTracks().forEach((t) => t.stop());
        this.audioCtx?.close().catch(() => undefined);
        this.audioCtx = null;
        this.analyser = null;
        this.wakeLock?.release().catch(() => undefined);
        resolve(new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' }));
        this.rec = null;
      };
      rec.stop();
    });
  }
}

export function createRecorder(): Recorder {
  return new WebRecorder();
}

export function fileExtension(mime: string): string {
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mp4')) return 'm4a';
  return 'webm';
}
