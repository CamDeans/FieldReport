import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "FieldReport — Professional job reports in minutes",
    template: "%s · FieldReport",
  },
  description:
    "Photograph the job, narrate what you see, and send a branded customer report before you leave the driveway. Built for roofers, inspectors, restoration, HVAC, and field trades.",
  applicationName: "FieldReport",
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "FieldReport",
    title: "FieldReport — Professional job reports in minutes",
    description:
      "Job-site photos and voice notes → insurer-ready branded reports. Built for the trades.",
    images: [{ url: "/icon-1024.png", width: 1024, height: 1024, alt: "FieldReport" }],
  },
  twitter: {
    card: "summary",
    title: "FieldReport",
    description: "Job-site photos and voice notes → customer-ready reports in minutes.",
    images: ["/icon-1024.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1d4ed8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <a href="#main" className="skip-link">Skip to content</a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
