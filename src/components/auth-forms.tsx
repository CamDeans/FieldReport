"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo-data";

export function LoginForm() {
  const router = useRouter();
  const { login } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Signed in");
    router.push("/dashboard");
  }

  return (
    <AuthShell title="Sign in to your account" subtitle="Welcome back">
      <form onSubmit={onSubmit} className="space-y-4" data-testid="login-form">
        <Field id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-sm text-primary">Forgot password?</Link>
          </div>
          <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
      </form>
      <p className="text-center text-sm text-slate-500 mt-6">
        Don’t have an account? <Link href="/signup" className="text-primary font-medium">Sign up free</Link>
      </p>
      <p className="text-center text-xs text-slate-400 mt-4">
        Demo: {DEMO_EMAIL} / {DEMO_PASSWORD}
      </p>
    </AuthShell>
  );
}

export function SignupForm() {
  const router = useRouter();
  const { signup } = useStore();
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await signup({ email, password, fullName, companyName });
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Account created");
    router.push("/dashboard");
  }

  return (
    <AuthShell title="Create your free account" subtitle="3 reports free. No credit card.">
      <form onSubmit={onSubmit} className="space-y-4" data-testid="signup-form">
        <div className="grid grid-cols-2 gap-3">
          <Field id="fullName" label="Your name" value={fullName} onChange={setFullName} />
          <Field id="companyName" label="Company" value={companyName} onChange={setCompanyName} required={false} />
        </div>
        <Field id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field id="password" label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating account…" : "Create free account"}</Button>
      </form>
      <p className="text-center text-sm text-slate-500 mt-6">
        Already have an account? <Link href="/login" className="text-primary font-medium">Sign in</Link>
      </p>
    </AuthShell>
  );
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 grid place-items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Brand />
          <h1 className="text-2xl font-bold mt-6">{title}</h1>
          <p className="text-slate-500 mt-1">{subtitle}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">{children}</div>
      </div>
    </div>
  );
}

function Field({
  id, label, value, onChange, type = "text", autoComplete, required = true,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void; type?: string; autoComplete?: string; required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} required={required} minLength={type === "password" ? 8 : undefined} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} />
    </div>
  );
}
