"use client";

import { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { ContactEmailField, rememberEmail } from "./contact-email-field";
import { useStore } from "@/lib/store";

interface EmailComposeProps {
  defaultTo: string;
  defaultSubject: string;
  customerName?: string;
  onCancel: () => void;
  onSend: (payload: { to: string; subject: string; message: string }) => Promise<void>;
}

export function EmailComposeDialog({
  defaultTo,
  defaultSubject,
  customerName,
  onCancel,
  onSend,
}: EmailComposeProps) {
  const store = useStore();
  const jobEmails = useMemo(() => {
    const emails = store.jobs.map((j) => j.customerEmail).filter((e): e is string => Boolean(e?.includes("@")));
    return [...new Set(emails.map((e) => e.toLowerCase()))];
  }, [store.jobs]);

  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(
    customerName
      ? `Hi ${customerName.split(" ")[0]},\n\nPlease find your inspection report attached below / via the secure link.\n\nThanks`
      : "Please find your inspection report below.\n\nThanks"
  );
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!to.trim().includes("@")) return;
    setBusy(true);
    try {
      rememberEmail(to);
      await onSend({ to: to.trim(), subject: subject.trim(), message: message.trim() });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-labelledby="email-compose-title"
      className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4 no-print"
      data-testid="email-compose"
    >
      <form onSubmit={(e) => void submit(e)} className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl">
        <h2 id="email-compose-title" className="text-lg font-semibold">
          Email report to customer
        </h2>
        <ContactEmailField
          email={to}
          onEmailChange={setTo}
          label="To"
          required
          allowMultiple
          suggestions={jobEmails}
        />
        <div className="space-y-2">
          <Label htmlFor="email-subject">Subject</Label>
          <Input id="email-subject" value={subject} onChange={(e) => setSubject(e.target.value)} required data-testid="email-subject" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email-message">Message</Label>
          <Textarea id="email-message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} data-testid="email-message" />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !to.includes("@")} data-testid="confirm-send-email">
            {busy ? "Sending…" : "Send email"}
          </Button>
        </div>
      </form>
    </div>
  );
}
