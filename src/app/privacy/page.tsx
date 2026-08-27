import Link from "next/link";
import { Brand } from "@/components/brand";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b px-4 h-16 flex items-center"><Brand /></header>
      <main id="main" className="max-w-3xl mx-auto px-4 py-10 space-y-4">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="text-slate-500 text-sm">Last updated August 24, 2026</p>
        <p>FieldReport stores job photos, notes, reports, and account details so contractors can deliver customer documentation. In demo mode without cloud credentials, data is stored on the FieldReport server workspace for that deployment (not only in your browser cache).</p>
        <p>When live services are connected, data may be processed by Supabase (accounts and files), OpenAI (transcription, report drafting, and PDF OCR), Stripe (web billing), RevenueCat with Apple App Store / Google Play Billing (in-app subscriptions on iOS and Android), and Resend (email). Do not put secrets in job notes.</p>
        <p>On iOS and Android, the app may request camera, microphone, and photo library access to capture job evidence and voice notes. Subscription status is managed by Apple or Google and synced through RevenueCat. You can restore purchases anytime from Billing.</p>
        <p>To request deletion of your account or job data, email hello@fieldreport.app. Contact the same address for privacy questions.</p>
        <Link href="/" className="text-primary">Home</Link>
      </main>
    </div>
  );
}
