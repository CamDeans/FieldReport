import type { CapacitorConfig } from "@capacitor/cli";

/**
 * FieldReport native shell for App Store / Google Play (Shipaton).
 * Loads the hosted Next.js app so API routes, cookies, and webhooks keep working.
 *
 * Set CAPACITOR_SERVER_URL (or NEXT_PUBLIC_APP_URL) to your deployed HTTPS origin before `cap sync`.
 */
const serverUrl =
  process.env.CAPACITOR_SERVER_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://app.fieldreport.app";

const config: CapacitorConfig = {
  appId: "app.fieldreport.mobile",
  appName: "FieldReport",
  webDir: "www",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    allowNavigation: [serverUrl.replace(/^https?:\/\//, "").split("/")[0]],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#1d4ed8",
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#1d4ed8",
    },
  },
  ios: {
    contentInset: "automatic",
    scheme: "FieldReport",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
