import Link from "next/link";
import { Brand } from "@/components/brand";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b px-4 h-16 flex items-center"><Brand /></header>
      <main id="main" className="max-w-3xl mx-auto px-4 py-10 space-y-4">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="text-slate-500 text-sm">Last updated August 24, 2026</p>
        <p>FieldReport is a documentation tool. Reports reflect observations you capture. They are not a warranty, insurance policy, engineering stamp, or legal certification.</p>
        <p>You are responsible for the accuracy of photos, notes, and the reports you send to customers. Web subscriptions are billed through Stripe. iOS and Android subscriptions are billed through the App Store or Google Play and managed with RevenueCat — cancel anytime in your Apple ID or Google Play subscription settings. Web plan changes can be requested at hello@fieldreport.app until a customer portal is enabled.</p>
        <p>Contact: hello@fieldreport.app</p>
        <Link href="/" className="text-primary">Home</Link>
      </main>
    </div>
  );
}
