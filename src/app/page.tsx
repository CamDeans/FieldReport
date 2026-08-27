import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CheckCircle,
  Clock,
  FileText,
  Mic,
  Send,
  Star,
  Zap,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAudienceTags, getFeaturedJobTypes, getLandingSectors, countIndustries, countJobTypes, countSectors } from "@/lib/taxonomy";
import { PLAN_PRICES } from "@/lib/types";

export default function LandingPage() {
  const featuredTypes = getFeaturedJobTypes();
  const landingSectors = getLandingSectors();
  const audienceTags = getAudienceTags();
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <main id="main">
        <section className="pt-16 pb-20 px-4 bg-gradient-to-b from-blue-50 to-white">
          <div className="max-w-4xl mx-auto text-center animate-in">
            <Badge className="mb-6 bg-blue-100 text-blue-800">Built for the trades — not generic office software</Badge>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-slate-900 mb-6">
              From job-site photos to a <span className="text-primary">customer-ready report</span> in minutes
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10">
              Snap photos, narrate what you see, and FieldReport’s AI writes a branded inspection report — any trade, any scope — you can send before you leave the driveway.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg">
                <Link href="/signup">Try free — 3 reports included <ArrowRight className="w-5 h-5" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#how-it-works">See how it works</a>
              </Button>
            </div>
            <p className="mt-4 text-sm text-slate-500">No credit card · Works on any phone · Demo mode included</p>
          </div>
        </section>

        <section className="py-16 px-4 bg-slate-50">
          <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-6">
            {[
              { icon: Clock, title: "Evenings lost to reports", body: "After a full day on roofs or in wet rooms, you still have to write it up." },
              { icon: FileText, title: "Amateur-looking Word docs", body: "Customers judge professionalism. A messy email loses jobs to the next bidder." },
              { icon: Camera, title: "Photos everywhere", body: "Camera roll chaos, no captions, and nothing ready to send." },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl border border-slate-200 p-6">
                <item.icon className="w-7 h-7 text-primary mb-3" />
                <h2 className="font-semibold text-slate-900 mb-2">{item.title}</h2>
                <p className="text-sm text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Four taps. Professional report.</h2>
            <div className="grid sm:grid-cols-4 gap-6">
              {[
                { step: "1", icon: Camera, title: "Photograph the job", body: "Take photos or import from the camera roll." },
                { step: "2", icon: Mic, title: "Narrate or type notes", body: "Talk through what you see — or type if the site is loud." },
                { step: "3", icon: Zap, title: "Generate the report", body: "OpenAI drafts a structured, branded report from your photos and notes — any trade." },
                { step: "4", icon: Send, title: "Send to the customer", body: "Email it, print it, or copy a customer-ready preview." },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary text-white grid place-items-center shadow-lg">
                    <item.icon className="w-7 h-7" />
                  </div>
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Step {item.step}</div>
                  <h3 className="font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="use-cases" className="py-16 px-4 bg-primary text-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">Built for every trade sector</h2>
            <p className="text-center text-blue-100 mb-4">
              Any trade · freeform scopes · AI-drafted reports · {countSectors()} sectors · {countIndustries()} industries ·{" "}
              {countJobTypes()} catalog shortcuts (fallback only)
            </p>
            <p className="text-center text-blue-100 mb-10 text-sm">
              Type any report scope on a job. Catalog cards below are optional shortcuts — OpenAI invents the right sections for your evidence.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
              {featuredTypes.map((jobType) => (
                <div key={jobType.id} className="rounded-xl bg-white/10 p-4">
                  <div className="font-semibold">{jobType.label}</div>
                  <p className="text-sm text-blue-100 mt-1">{jobType.blurb}</p>
                </div>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mb-10">
              {landingSectors.slice(0, 6).map(({ sector, industries }) => (
                <div key={sector.id} className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <div className="font-medium text-sm">{sector.label}</div>
                  <p className="text-xs text-blue-100 mt-1">
                    {industries.map((i) => i.label).join(" · ")}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {audienceTags.map((c) => (
                <span key={c} className="text-xs bg-white/15 rounded-full px-3 py-2">{c}</span>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Simple, honest pricing</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(Object.keys(PLAN_PRICES) as Array<keyof typeof PLAN_PRICES>).map((key) => {
                const plan = PLAN_PRICES[key];
                const popular = key === "pro";
                return (
                  <div key={key} className={`rounded-2xl border p-5 flex flex-col ${popular ? "border-primary ring-2 ring-primary bg-primary text-white" : "border-slate-200 bg-white"}`}>
                    {popular && <Badge className="self-start mb-2 bg-white text-primary">MOST POPULAR</Badge>}
                    <div className="font-semibold">{plan.label}</div>
                    <div className="mt-1 mb-1">
                      <span className="text-3xl font-bold">${plan.monthly}</span>
                      <span className={`text-sm ${popular ? "text-blue-100" : "text-slate-500"}`}>/mo</span>
                    </div>
                    <div className={`text-xs mb-4 ${popular ? "text-blue-100" : "text-slate-500"}`}>{plan.limit}</div>
                    <ul className="space-y-2 text-sm flex-1 mb-5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex gap-2"><CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />{f}</li>
                      ))}
                    </ul>
                    <Link href="/signup"><Button className={`w-full ${popular ? "bg-white text-primary hover:bg-blue-50" : ""}`} variant={popular ? "outline" : "default"}>{plan.monthly === 0 ? "Start free" : `Choose ${plan.label}`}</Button></Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-slate-50">
          <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-6">
            {[
              { quote: "I used to spend an hour every night writing reports. Now I do it in the driveway.", name: "Marcus T.", role: "Roofing contractor, Texas" },
              { quote: "The professional PDF actually won me a job. The homeowner said it looked like I knew what I was doing.", name: "Jenny K.", role: "Home inspector, Ohio" },
              { quote: "I'm not a tech person. Take photos, talk, done.", name: "Dave R.", role: "Restoration contractor, Florida" },
            ].map((r) => (
              <div key={r.name} className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex gap-1 mb-3">{[1,2,3,4,5].map((i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
                <p className="text-sm italic text-slate-700 mb-4">“{r.quote}”</p>
                <div className="font-semibold text-sm">{r.name}</div>
                <div className="text-xs text-slate-500">{r.role}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <Brand />
          <div className="flex gap-5">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/help">Help</Link>
            <a href="mailto:hello@fieldreport.app">Contact</a>
          </div>
          <p>© {new Date().getFullYear()} FieldReport</p>
        </div>
      </footer>
    </div>
  );
}
