"use client";

import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { Network } from "@capacitor/network";
import { Share } from "@capacitor/share";
import { Clipboard } from "@capacitor/clipboard";
import { isNativeApp } from "./platform";
import { pathFromDeepLink } from "./deep-link";

export { pathFromDeepLink } from "./deep-link";

export async function shareOrCopyText(input: { title: string; text: string; url?: string }) {
  if (isNativeApp()) {
    try {
      await Share.share({
        title: input.title,
        text: input.text,
        url: input.url,
        dialogTitle: input.title,
      });
      return { mode: "share" as const };
    } catch {
      /* fall through to clipboard */
    }
  }
  const payload = [input.text, input.url].filter(Boolean).join("\n");
  try {
    if (isNativeApp()) {
      await Clipboard.write({ string: payload });
    } else {
      await navigator.clipboard.writeText(payload);
    }
    return { mode: "clipboard" as const };
  } catch {
    throw new Error("Could not share or copy");
  }
}

export type NativeShellHandlers = {
  onDeepLink: (path: string) => void;
  onConnectivity: (online: boolean) => void;
};

/**
 * Wire Capacitor App / Network / Keyboard once per session.
 * Returns an unsubscribe function.
 */
export async function startNativeShell(handlers: NativeShellHandlers): Promise<() => void> {
  if (!isNativeApp() || !Capacitor.isNativePlatform()) {
    return () => undefined;
  }

  const unsub: Array<() => void> = [];

  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
  } catch {
    /* optional */
  }

  try {
    const status = await Network.getStatus();
    handlers.onConnectivity(status.connected);
    const netHandle = await Network.addListener("networkStatusChange", (s) => {
      handlers.onConnectivity(s.connected);
    });
    unsub.push(() => void netHandle.remove());
  } catch {
    handlers.onConnectivity(true);
  }

  try {
    const launch = await CapApp.getLaunchUrl();
    if (launch?.url) {
      const path = pathFromDeepLink(launch.url);
      if (path) handlers.onDeepLink(path);
    }
  } catch {
    /* ignore */
  }

  try {
    const openHandle = await CapApp.addListener("appUrlOpen", (event) => {
      const path = pathFromDeepLink(event.url);
      if (path) handlers.onDeepLink(path);
    });
    unsub.push(() => void openHandle.remove());
  } catch {
    /* ignore */
  }

  try {
    const backHandle = await CapApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        void CapApp.exitApp();
      }
    });
    unsub.push(() => void backHandle.remove());
  } catch {
    /* iOS has no hardware back */
  }

  return () => {
    unsub.forEach((fn) => fn());
  };
}
