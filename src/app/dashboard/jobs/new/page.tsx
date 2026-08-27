"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JobTypeSelect, defaultJobTypeForProfile } from "@/components/job-type-select";
import { ContactEmailField } from "@/components/contact-email-field";
import { api } from "@/lib/api/client";
import { useStore } from "@/lib/store";

export default function NewJobPage() {
  const router = useRouter();
  const { addJob, profile } = useStore();
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [address, setAddress] = useState("");
  const [jobType, setJobType] = useState(() => defaultJobTypeForProfile(profile));
  const [notes, setNotes] = useState("");
  const [suggesting, setSuggesting] = useState(false);

  async function suggestScope() {
    setSuggesting(true);
    try {
      const result = await api.suggestScope({
        notes,
        tradeContext: profile?.industryIds?.join(", "),
      });
      setJobType(result.scope);
      toast.success(result.rationale || "Scope suggested");
    } catch (error) {
      toast.message(
        error instanceof Error ? error.message : "Type any custom report scope — no catalog limit."
      );
    } finally {
      setSuggesting(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!jobType.trim()) {
      toast.error("Enter a report scope (any trade description is fine)");
      return;
    }
    const job = await addJob({ customerName, customerEmail, address, jobType: jobType.trim(), notes });
    toast.success("Job created");
    router.push(`/dashboard/jobs/${job.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">New job</h1>
      <form onSubmit={onSubmit} className="bg-white rounded-2xl border p-6 space-y-4" data-testid="new-job-form">
        <div className="space-y-2">
          <Label htmlFor="customerName">Customer name *</Label>
          <Input
            id="customerName"
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Sarah Johnson"
          />
        </div>
        <ContactEmailField
          email={customerEmail}
          onEmailChange={setCustomerEmail}
          onNamePicked={(name) => {
            if (!customerName.trim()) setCustomerName(name);
          }}
        />
        <div className="space-y-2">
          <Label htmlFor="address">Property address</Label>
          <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="jobType">Report scope *</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void suggestScope()}
              disabled={suggesting}
              data-testid="suggest-scope"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {suggesting ? "Suggesting…" : "AI suggest"}
            </Button>
          </div>
          <JobTypeSelect id="jobType" value={jobType} onChange={setJobType} profile={profile} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Job notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Trade, weather, customer concerns, access limitations…"
          />
        </div>
        <Button type="submit">Create job & add photos</Button>
      </form>
    </div>
  );
}
