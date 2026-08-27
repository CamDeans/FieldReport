"use client";

import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { isNativeApp } from "./platform";

export async function captureNativePhotos(maxCount = 6): Promise<string[]> {
  if (!isNativeApp()) return [];
  const urls: string[] = [];
  // Prompt once; allow repeat captures until user cancels or max reached.
  while (urls.length < maxCount) {
    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: urls.length === 0 ? CameraSource.Prompt : CameraSource.Camera,
        correctOrientation: true,
      });
      if (!photo.dataUrl) break;
      urls.push(photo.dataUrl);
      // After first photo, only continue if user is still on camera path;
      // for gallery multi-select isn't available — stop after one gallery pick.
      if (photo.dataUrl && urls.length === 1) {
        // Ask again only when shooting from camera repeatedly is intentional;
        // break after each Prompt selection — UI offers "Add photos" again.
        break;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/cancel/i.test(message) || urls.length) break;
      throw error;
    }
  }
  return urls;
}

/** Request mic access before Whisper recording (native WebView). */
export async function ensureMicrophoneAccess(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}
