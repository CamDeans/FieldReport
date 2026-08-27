"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"demo" | "live" | "unknown">("unknown");
  const [liveReady, setLiveReady] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const config = await api.getConfig();
        setMode(config.mode === "live" ? "live" : "demo");
        if (config.mode === "live") {
          const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
          const supabase = createSupabaseBrowserClient();
          // Recovery links land with tokens in the URL hash; exchange if present.
          const hash = typeof window !== "undefined" ? window.location.hash : "";
          if (hash.includes("access_token") || hash.includes("type=recovery")) {
            const params = new URLSearchParams(hash.replace(/^#/, ""));
            const access_token = params.get("access_token");
            const refresh_token = params.get("refresh_token");
            if (access_token && refresh_token) {
              await supabase.auth.setSession({ access_token, refresh_token });
            }
          }
          const { data } = await supabase.auth.getSession();
          setLiveReady(Boolean(data.session));
        }
      } catch {
        setMode("demo");
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Use at least 8 characters.");
    if (password !== confirm) return toast.error("Passwords don’t match.");
    if (mode === "demo" && !token) {
      return toast.error("Open the reset link from Forgot password first.");
    }
    if (mode === "live" && !liveReady) {
      return toast.error("Open the reset link from your email to continue.");
    }
    setBusy(true);
    try {
      if (mode === "live") {
        const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw new Error(error.message);
        toast.success("Password updated — sign in with your new password");
        router.push("/login");
        return;
      }
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
        credentials: "same-origin",
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (!body.ok) throw new Error(body.error || "Update failed");
      toast.success("Password updated");
      router.push("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 grid place-items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Brand />
          <h1 className="text-2xl font-bold mt-6">Set a new password</h1>
          {mode === "demo" && !token && (
            <p className="text-sm text-amber-700 mt-2">
              Open the reset link from{" "}
              <Link href="/forgot-password" className="underline">
                Forgot password
              </Link>{" "}
              first.
            </p>
          )}
          {mode === "live" && !liveReady && (
            <p className="text-sm text-amber-700 mt-2">Open the reset link from your email to continue.</p>
          )}
        </div>
        <form onSubmit={(e) => void onSubmit(e)} className="bg-white rounded-2xl border p-8 space-y-4" data-testid="reset-form">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="reset-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              data-testid="reset-confirm"
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={busy}
            data-testid="reset-submit"
          >
            {busy ? "Updating…" : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
