"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoPath, setDemoPath] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "same-origin",
      });
      const body = (await res.json()) as {
        ok: boolean;
        error?: string;
        data?: { mode?: string; demoResetPath?: string };
      };
      if (!body.ok) throw new Error(body.error || "Request failed");
      setSent(true);
      if (body.data?.demoResetPath) setDemoPath(body.data.demoResetPath);
      toast.success(
        body.data?.mode === "demo"
          ? "Reset ready — use the link below (demo mode doesn’t send email)."
          : "If that email exists, a reset link is on the way."
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send reset link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 grid place-items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Brand />
          <h1 className="text-2xl font-bold mt-6">Reset your password</h1>
          <p className="text-slate-500 mt-1">We’ll email a reset link (or show one in demo)</p>
        </div>
        <div className="bg-white rounded-2xl border p-8">
          {sent ? (
            <div className="space-y-3 text-sm text-slate-600" data-testid="forgot-sent">
              <p>Check {email} for a reset link.</p>
              {demoPath && (
                <p>
                  Demo reset link:{" "}
                  <Link href={demoPath} className="text-primary font-medium" data-testid="demo-reset-link">
                    Set a new password
                  </Link>
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={(e) => void onSubmit(e)} className="space-y-4" data-testid="forgot-form">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="forgot-email"
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy} data-testid="forgot-submit">
                {busy ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}
          <Link href="/login" className="block text-center text-sm text-slate-500 mt-4">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
