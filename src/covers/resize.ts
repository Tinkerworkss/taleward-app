import { t } from '../i18n';

/**
 * Verkleinert ein Foto vor dem Hochladen (lange Kante höchstens maxSize) und speichert es als JPEG.
 * Spart Datenvolumen und entfernt nebenbei Metadaten wie GPS-Koordinaten aus Handyfotos.
 */
export async function resizeImage(file: Blob, maxSize = 1600, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error(t('Das ist keine Bilddatei.'));
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error(t('Das Bild konnte nicht gelesen werden.'));
  });
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error(t('Das Bild konnte nicht umgewandelt werden.'));
  return blob;
}
