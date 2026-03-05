// services/imageStorage.ts
// expo-file-system v2 (Expo SDK 54): Legacy-Import für klassische API
import * as FileSystem from "expo-file-system/legacy";

const IMAGES_DIR = FileSystem.documentDirectory + "note_images/";

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(IMAGES_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
  }
}

/**
 * Kopiert eine temporäre URI (aus ImagePicker) in das persistente
 * Dokumenten-Verzeichnis der App.
 * iOS löscht temporäre URIs (ph:// / file://tmp/) nach kurzer Zeit –
 * diese Funktion macht die URI dauerhaft.
 */
export async function copyImageToPersistentStorage(
  tempUri: string,
  filename: string
): Promise<string> {
  await ensureDir();

  const ext = tempUri.split(".").pop()?.split("?")[0]?.toLowerCase() ?? "jpg";
  const safeExt = ["jpg", "jpeg", "png", "heic", "webp"].includes(ext)
    ? ext
    : "jpg";

  const destUri = IMAGES_DIR + filename + "." + safeExt;
  await FileSystem.copyAsync({ from: tempUri, to: destUri });
  return destUri;
}

/**
 * Löscht ein Bild aus dem persistenten Speicher.
 * Nur eigene App-Dateien werden gelöscht (keine ph://-URIs).
 */
export async function deletePersistedImage(uri: string): Promise<void> {
  try {
    if (!uri.startsWith(FileSystem.documentDirectory ?? "")) return;
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch {
    // best-effort – nicht kritisch
  }
}

/**
 * Anzahl der gespeicherten Bilder.
 * (expo-file-system/legacy v2 unterstützt kein size-Flag mehr in getInfoAsync)
 */
export async function getImageCount(): Promise<number> {
  try {
    await ensureDir();
    const files = await FileSystem.readDirectoryAsync(IMAGES_DIR);
    return files.length;
  } catch {
    return 0;
  }
}
