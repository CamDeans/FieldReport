"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Toaster } from "sonner";
import { StoreProvider, useStore } from "@/lib/store";
import { isNativeApp } from "@/lib/native/platform";
import { configureRevenueCat } from "@/lib/native/revenuecat";
import { startNativeShell } from "@/lib/native/shell";

function NativeBootstrap({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, hydrated } = useStore();
  const [online, setOnline] = useState(true);
  const native = isNativeApp();

  // Web + native: browser online/offline events (native Network plugin also updates this).
  useEffect(() => {
    const syncBrowser = () => setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    syncBrowser();
    window.addEventListener("online", syncBrowser);
    window.addEventListener("offline", syncBrowser);
    return () => {
      window.removeEventListener("online", syncBrowser);
      window.removeEventListener("offline", syncBrowser);
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !native) return;
    let stop: (() => void) | undefined;
    void (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: "#1d4ed8" });
      } catch {
        /* web or plugin unavailable */
      }
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
      } catch {
        /* optional */
      }
      stop = await startNativeShell({
        onDeepLink: (path) => {
          router.push(path);
        },
        onConnectivity: setOnline,
      });
      if (session?.userId) {
        await configureRevenueCat(session.userId);
      }
    })();
    return () => stop?.();
  }, [hydrated, native, session?.userId, router]);

  return (
    <>
      {!online && (
        <div
          className="fixed top-0 inset-x-0 z-[100] bg-amber-500 text-white text-center text-sm px-3 py-2 safe-top"
          data-testid="offline-banner"
        >
          You’re offline. FieldReport needs a connection to save jobs and generate reports.
        </div>
      )}
      <div className={native ? "safe-area-app" : undefined}>{children}</div>
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <NativeBootstrap>
        {children}
        <Toaster richColors closeButton position="top-right" />
      </NativeBootstrap>
    </StoreProvider>
  );
}
