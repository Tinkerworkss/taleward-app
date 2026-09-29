/** Läuft gerade eine Aufnahme? (für die Android-Zurück-Taste) */
let active = false;
export const setRecordingActive = (v: boolean) => { active = v; };
export const isRecordingActive = () => active;
