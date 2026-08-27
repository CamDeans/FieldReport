"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo-data";
import { fileToDataUrl } from "@/lib/utils";
import {
  countIndustries,
  countJobTypes,
  countSectors,
  defaultJobTypeForPreferences,
  getIndustriesForSector,
  getJobTypesForIndustries,
  getSectors,
  getVisibleJobTypes,
} from "@/lib/taxonomy";
import { CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const { profile, updateProfile, resetDemo } = useStore();
  const [sectorIds, setSectorIds] = useState<string[]>(profile?.sectorIds ?? []);
  const [industryIds, setIndustryIds] = useState<string[]>(profile?.industryIds ?? []);
  const [defaultJobTypeId, setDefaultJobTypeId] = useState<string>(profile?.defaultJobTypeId ?? "general");

  const industries = useMemo(() => sectorIds.flatMap((id) => getIndustriesForSector(id)), [sectorIds]);
  const jobTypeOptions = useMemo(() => getJobTypesForIndustries(industryIds), [industryIds]);

  if (!profile) return null;

  function toggleSector(id: string) {
    setSectorIds((prev) => {
      const next = prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id];
      const allowed = new Set(next.flatMap((s) => getIndustriesForSector(s).map((i) => i.id)));
      setIndustryIds((inds) => inds.filter((i) => allowed.has(i)));
      return next;
    });
  }

  function toggleIndustry(id: string) {
    setIndustryIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  function saveTradePreferences() {
    if (!sectorIds.length || !industryIds.length) {
      toast.error("Select at least one sector and industry");
      return;
    }
    const resolvedDefault = jobTypeOptions.some((j) => j.id === defaultJobTypeId)
      ? defaultJobTypeId
      : defaultJobTypeForPreferences({ industryIds, defaultJobTypeId: null });
    updateProfile({
      sectorIds,
      industryIds,
      defaultJobTypeId: resolvedDefault,
      onboardingCompletedAt: profile!.onboardingCompletedAt ?? new Date().toISOString(),
    });
    toast.success("Trade catalog updated");
  }

  const visibleCount = getVisibleJobTypes({ sectorIds, industryIds }).length;

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <form
        className="bg-white rounded-2xl border p-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          toast.success("Profile saved");
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="fullName">Your name</Label>
          <Input id="fullName" value={profile.fullName} onChange={(e) => updateProfile({ fullName: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="companyName">Company name</Label>
          <Input id="companyName" value={profile.companyName} onChange={(e) => updateProfile({ companyName: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={profile.phone} onChange={(e) => updateProfile({ phone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={profile.email} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="logo">Company logo</Label>
          {profile.logoDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.logoDataUrl} alt="Company logo" className="h-14 w-auto rounded border p-1 bg-white" />
          )}
          <Input
            id="logo"
            type="file"
            accept="image/*"
            data-testid="logo-input"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const dataUrl = await fileToDataUrl(file);
              updateProfile({ logoDataUrl: dataUrl });
              toast.success("Logo updated");
            }}
          />
          <p className="text-xs text-slate-500">Shows on generated reports and the customer view.</p>
        </div>
        <Button type="submit">Save settings</Button>
      </form>

      <section className="bg-white rounded-2xl border p-6 space-y-4" data-testid="trade-settings">
        <div>
          <h2 className="font-semibold">Trade catalog</h2>
          <p className="text-sm text-slate-500 mt-1">
            Controls which report templates appear when you create jobs. Full library: {countSectors()} sectors ·{" "}
            {countIndustries()} industries · {countJobTypes()} templates · {visibleCount} matched below.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Sectors</Label>
          <div className="grid sm:grid-cols-2 gap-2">
            {getSectors().map((sector) => {
              const selected = sectorIds.includes(sector.id);
              return (
                <button
                  key={sector.id}
                  type="button"
                  onClick={() => toggleSector(sector.id)}
                  className={`text-left rounded-lg border p-2 text-sm ${
                    selected ? "border-primary bg-primary/5" : "border-slate-200"
                  }`}
                >
                  <span className="inline-flex items-center gap-1 font-medium">
                    {selected && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                    {sector.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {industries.length > 0 && (
          <div className="space-y-2">
            <Label>Industries</Label>
            <div className="flex flex-wrap gap-2">
              {industries.map((industry) => {
                const selected = industryIds.includes(industry.id);
                return (
                  <button
                    key={industry.id}
                    type="button"
                    onClick={() => toggleIndustry(industry.id)}
                    className={`text-xs rounded-full px-3 py-1.5 border ${
                      selected ? "bg-primary text-white border-primary" : "border-slate-200"
                    }`}
                  >
                    {industry.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {jobTypeOptions.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="defaultJobType">Default report type</Label>
            <select
              id="defaultJobType"
              className="w-full h-11 rounded-lg border border-border bg-white px-3 text-sm"
              value={defaultJobTypeId}
              onChange={(e) => setDefaultJobTypeId(e.target.value)}
            >
              {jobTypeOptions.map((jt) => (
                <option key={jt.id} value={jt.id}>
                  {jt.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <Button type="button" onClick={saveTradePreferences} data-testid="save-trade-catalog">
          Save trade catalog
        </Button>
      </section>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <h2 className="font-semibold mb-2">Demo data</h2>
        <p className="text-sm text-slate-600 mb-3">
          Reset sample jobs and sign back in as {DEMO_EMAIL} / {DEMO_PASSWORD}.
        </p>
        <Button
          variant="outline"
          onClick={async () => {
            await resetDemo();
            toast.success("Demo data restored");
          }}
          data-testid="reset-demo-settings"
        >
          Reset demo data
        </Button>
      </div>
    </div>
  );
}
