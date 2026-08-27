"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
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

export function TradeOnboardingWizard() {
  const { profile, updateProfile } = useStore();
  const [step, setStep] = useState(1);
  const [sectorIds, setSectorIds] = useState<string[]>(profile?.sectorIds ?? []);
  const [industryIds, setIndustryIds] = useState<string[]>(profile?.industryIds ?? []);
  const [defaultJobTypeId, setDefaultJobTypeId] = useState<string | null>(profile?.defaultJobTypeId ?? null);

  const industries = useMemo(
    () => sectorIds.flatMap((sectorId) => getIndustriesForSector(sectorId)),
    [sectorIds]
  );

  const jobTypeOptions = useMemo(() => getJobTypesForIndustries(industryIds), [industryIds]);

  if (!profile || profile.onboardingCompletedAt) return null;

  function toggleSector(id: string) {
    setSectorIds((prev) => {
      const next = prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id];
      const allowedIndustries = new Set(next.flatMap((s) => getIndustriesForSector(s).map((i) => i.id)));
      setIndustryIds((inds) => inds.filter((i) => allowedIndustries.has(i)));
      return next;
    });
  }

  function toggleIndustry(id: string) {
    setIndustryIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  function finish() {
    if (!sectorIds.length) {
      toast.error("Pick at least one sector");
      return;
    }
    if (!industryIds.length) {
      toast.error("Pick at least one industry");
      return;
    }
    const resolvedDefault =
      defaultJobTypeId && getVisibleJobTypes({ sectorIds, industryIds }).some((j) => j.id === defaultJobTypeId)
        ? defaultJobTypeId
        : defaultJobTypeForPreferences({ industryIds, defaultJobTypeId: null });
    updateProfile({
      sectorIds,
      industryIds,
      defaultJobTypeId: resolvedDefault,
      onboardingCompletedAt: new Date().toISOString(),
    });
    toast.success("Your trade catalog is ready");
  }

  const visibleCount = getVisibleJobTypes({ sectorIds, industryIds }).length;

  return (
    <section
      className="bg-white rounded-2xl border-2 border-primary/20 p-5 sm:p-6 space-y-5 animate-in"
      data-testid="trade-onboarding"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
          Step {step} of 3 · Trade setup
        </p>
        <h2 className="text-xl font-bold">Tailor FieldReport to your work</h2>
        <p className="text-sm text-slate-500 mt-1">
          We’ll suggest report scopes that match your sectors. You can still type any custom scope on every job —
          OpenAI drafts the report. Catalog shortcuts are optional.
        </p>
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Which sectors do you work in?</h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {getSectors().map((sector) => {
              const selected = sectorIds.includes(sector.id);
              return (
                <button
                  key={sector.id}
                  type="button"
                  data-testid={`sector-${sector.id}`}
                  onClick={() => toggleSector(sector.id)}
                  className={`text-left rounded-xl border p-3 transition-colors ${
                    selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="font-medium text-sm flex items-center gap-2">
                    {selected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                    {sector.label}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{sector.description}</p>
                </button>
              );
            })}
          </div>
          <Button className="w-full sm:w-auto" disabled={!sectorIds.length} onClick={() => setStep(2)}>
            Continue to industries
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Which industries within those sectors?</h3>
          <p className="text-xs text-slate-500">
            {industries.length} industries available across {sectorIds.length} sector
            {sectorIds.length === 1 ? "" : "s"}.
          </p>
          <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
            {industries.map((industry) => {
              const selected = industryIds.includes(industry.id);
              return (
                <button
                  key={industry.id}
                  type="button"
                  data-testid={`industry-${industry.id}`}
                  onClick={() => toggleIndustry(industry.id)}
                  className={`text-sm rounded-full px-3 py-2 border transition-colors ${
                    selected ? "bg-primary text-white border-primary" : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {industry.label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button disabled={!industryIds.length} onClick={() => setStep(3)}>
              Continue · {getJobTypesForIndustries(industryIds).length} report templates
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Default report type when you create a job</h3>
          <p className="text-xs text-slate-500">
            You’ll still be able to pick from {visibleCount} templates matched to your trades, plus{" "}
            {countJobTypes() - visibleCount > 0 ? "a full catalog toggle" : "universal templates"}.
          </p>
          <select
            className="w-full h-11 rounded-lg border border-border bg-white px-3 text-sm"
            value={defaultJobTypeId ?? defaultJobTypeForPreferences({ industryIds, defaultJobTypeId: null })}
            onChange={(e) => setDefaultJobTypeId(e.target.value)}
            data-testid="default-job-type"
          >
            {jobTypeOptions.map((jt) => (
              <option key={jt.id} value={jt.id}>
                {jt.label}
              </option>
            ))}
          </select>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
            Catalog summary: {countSectors()} sectors · {countIndustries()} industries · {countJobTypes()} report
            templates · {visibleCount} visible for you after setup
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button onClick={finish} data-testid="finish-trade-onboarding">
              Finish setup
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
