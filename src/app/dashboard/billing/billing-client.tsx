"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { PLAN_LIMITS, PLAN_PRICES, type Plan } from "@/lib/types";
import { isNativeApp } from "@/lib/native/platform";
import { configureRevenueCat, purchasePlanWithRevenueCat, restoreRevenueCatPurchases } from "@/lib/native/revenuecat";
import { api } from "@/lib/api/client";

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, changePlan, refreshWorkspace, appMode, session } = useStore();
  const [busy, setBusy] = useState<Plan | null>(null);
  const [native, setNative] = useState(false);
  const [promo, setPromo] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);
  const checkoutHandled = useRef<string | null>(null);
  const current = profile?.plan ?? "free";
  const used = profile?.reportsUsedThisMonth ?? 0;
  const limit = PLAN_LIMITS[current];

  useEffect(() => {
    setNative(isNativeApp());
  }, []);

  useEffect(() => {
    if (!native || !session?.userId) return;
    void configureRevenueCat(session.userId);
  }, [native, session?.userId]);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const plan = searchParams.get("plan") as Plan | null;
    const key = checkout ? `${checkout}:${plan ?? ""}` : null;
    if (!key || checkoutHandled.current === key) return;
    checkoutHandled.current = key;
    if (checkout === "success" && plan) {
      toast.success(`You're on ${PLAN_PRICES[plan].label}`);
      void refreshWorkspace();
      router.replace("/dashboard/billing");
    } else if (checkout === "cancel") {
      toast.message("Checkout canceled — your plan is unchanged.");
      router.replace("/dashboard/billing");
    }
  }, [searchParams, refreshWorkspace, router]);

  async function upgrade(plan: Plan) {
    if (plan === "free") {
      toast.message("You're already on Free, or cancel from the store subscriptions settings.");
      return;
    }
    setBusy(plan);
    try {
      if (native) {
        const purchase = await purchasePlanWithRevenueCat(plan);
        await api.syncRevenueCat({
          entitlements: purchase.entitlements,
          appUserId: purchase.appUserId,
        });
        await refreshWorkspace();
        toast.success(`${PLAN_PRICES[purchase.plan].label} unlocked via App Store / Play`);
      } else {
        await changePlan(plan);
        if (appMode === "demo") {
          toast.success(`${PLAN_PRICES[plan].label} plan activated`);
          await refreshWorkspace();
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout failed");
    } finally {
      setBusy(null);
    }
  }

  async function restore() {
    setBusy("pro");
    try {
      const restored = await restoreRevenueCatPurchases();
      await api.syncRevenueCat({
        entitlements: restored.entitlements,
        appUserId: restored.appUserId,
      });
      await refreshWorkspace();
      toast.success(
        restored.plan === "free" ? "No active subscriptions found" : `Restored ${PLAN_PRICES[restored.plan].label}`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Restore failed");
    } finally {
      setBusy(null);
    }
  }

  async function redeemPromo() {
    setPromoBusy(true);
    try {
      const result = await api.redeemPromo(promo);
      await refreshWorkspace();
      toast.success(`Promo applied — you're on ${PLAN_PRICES[result.plan].label}`);
      setPromo("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid promo code");
    } finally {
      setPromoBusy(false);
    }
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-slate-500 mt-1">
          {native
            ? "Subscriptions use Apple / Google via RevenueCat. Includes a free trial when configured in the store."
            : appMode === "live"
              ? "Web checkout uses Stripe (with trial when configured). Install the iOS/Android app for App Store / Play billing via RevenueCat."
              : "Demo mode uses the same billing APIs — upgrade instantly without Stripe or store keys. Use promo SHIPATON-JUDGE for Pro."}
        </p>
      </div>

      <div className="bg-white rounded-xl border p-5">
        <div className="text-sm text-slate-500">Current plan</div>
        <div className="text-xl font-bold capitalize mt-1">{current}</div>
        <div className="text-sm text-slate-500 mt-1">
          {used} of {Number.isFinite(limit) ? limit : "∞"} reports used this month
        </div>
        {native && (
          <Button className="mt-3" variant="outline" onClick={() => void restore()} disabled={Boolean(busy)} data-testid="restore-purchases">
            Restore purchases
          </Button>
        )}
      </div>

      <div className="bg-sky-50 border border-sky-200 rounded-xl p-5 space-y-3" data-testid="promo-panel">
        <div>
          <Label htmlFor="promo-code">Promo / judge unlock</Label>
          <p className="text-xs text-slate-500 mt-1">
            Shipaton judges: enter <code className="bg-white px-1 rounded">SHIPATON-JUDGE</code> for Pro access (or start a free
            trial from a paid plan button).
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            id="promo-code"
            value={promo}
            onChange={(e) => setPromo(e.target.value)}
            placeholder="SHIPATON-JUDGE"
            data-testid="promo-input"
          />
          <Button type="button" onClick={() => void redeemPromo()} disabled={promoBusy || !promo.trim()} data-testid="promo-redeem">
            {promoBusy ? "Applying…" : "Redeem"}
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.keys(PLAN_PRICES) as Plan[]).map((key) => {
          const plan = PLAN_PRICES[key];
          const isCurrent = key === current;
          return (
            <div
              key={key}
              className={`rounded-2xl border p-5 ${key === "pro" ? "border-primary ring-2 ring-primary/30" : "border-slate-200"}`}
            >
              {isCurrent && <Badge className="bg-emerald-100 text-emerald-800 mb-2">CURRENT</Badge>}
              {key !== "free" && (
                <Badge className="bg-amber-100 text-amber-900 mb-2" data-testid={`trial-badge-${key}`}>
                  Free trial available
                </Badge>
              )}
              <div className="font-semibold">{plan.label}</div>
              <div className="text-2xl font-bold mt-1">
                ${plan.monthly}
                <span className="text-sm text-slate-500">/mo</span>
              </div>
              <div className="text-xs text-slate-500 mb-4">{plan.limit}</div>
              <ul className="text-sm text-slate-600 space-y-1 mb-4">
                {plan.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={isCurrent ? "outline" : "default"}
                disabled={isCurrent || busy === key || key === "free"}
                onClick={() => void upgrade(key)}
                data-testid={`plan-${key}`}
              >
                {isCurrent
                  ? "Current plan"
                  : key === "free"
                    ? "Included"
                    : busy === key
                      ? "Processing…"
                      : native
                        ? `Subscribe ${plan.label}`
                        : `Choose ${plan.label}`}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
