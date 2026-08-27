"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BookUser, ClipboardPaste } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

const RECENT_KEY = "fieldreport.recentEmails";

type ContactInfo = { name?: string[]; email?: string[] };

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

export function rememberEmail(email: string) {
  const parts = email
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
  if (!parts.length) return;
  let next = loadRecent();
  for (const normalized of parts.reverse()) {
    next = [normalized, ...next.filter((e) => e !== normalized)];
  }
  localStorage.setItem(RECENT_KEY, JSON.stringify(next.slice(0, 24)));
}

export function parseEmailList(raw: string): string[] {
  const found = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  const unique: string[] = [];
  for (const email of found.map((e) => e.toLowerCase())) {
    if (!unique.includes(email)) unique.push(email);
  }
  return unique;
}

function contactsSupported() {
  return typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window;
}

interface ContactEmailFieldProps {
  id?: string;
  label?: string;
  email: string;
  onEmailChange: (email: string) => void;
  onNamePicked?: (name: string) => void;
  required?: boolean;
  /** Extra suggestions (e.g. emails from past jobs) */
  suggestions?: string[];
  /** Allow comma-separated multi-recipient entry */
  allowMultiple?: boolean;
}

/**
 * Email field with device Contact Picker, recent recipients, job history suggestions,
 * paste/CSV import, and always-available manual entry.
 * (Google/iCloud OAuth sync is intentionally out of MVP — Contact Picker + import covers field use.)
 */
export function ContactEmailField({
  id = "customerEmail",
  label = "Customer email",
  email,
  onEmailChange,
  onNamePicked,
  required,
  suggestions = [],
  allowMultiple = false,
}: ContactEmailFieldProps) {
  const [recent, setRecent] = useState<string[]>([]);
  const [pickerAvailable, setPickerAvailable] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");

  useEffect(() => {
    setRecent(loadRecent());
    setPickerAvailable(contactsSupported());
  }, []);

  const mergedSuggestions = useMemo(() => {
    const all = [...recent, ...suggestions.map((s) => s.trim().toLowerCase()).filter((s) => s.includes("@"))];
    return [...new Set(all)].slice(0, 24);
  }, [recent, suggestions]);

  async function pickFromDevice() {
    try {
      const nav = navigator as Navigator & {
        contacts?: { select: (props: string[], opts: { multiple: boolean }) => Promise<ContactInfo[]> };
      };
      if (!nav.contacts?.select) {
        toast.message("Contact access isn’t available on this device. Type an email, paste a list, or pick from recent.");
        return;
      }
      const selected = await nav.contacts.select(["name", "email"], { multiple: allowMultiple });
      const emails = selected
        .flatMap((c) => c.email ?? [])
        .map((e) => e.trim())
        .filter((e) => e.includes("@"));
      if (!emails.length) {
        toast.error("That contact has no email address.");
        return;
      }
      const value = allowMultiple ? [...new Set([...parseEmailList(email), ...emails])].join(", ") : emails[0];
      onEmailChange(value);
      rememberEmail(value);
      setRecent(loadRecent());
      const name = selected[0]?.name?.[0];
      if (name && onNamePicked && !allowMultiple) onNamePicked(name);
      toast.success(emails.length > 1 ? `${emails.length} contacts selected` : "Contact selected");
    } catch {
      toast.message("Contact picker cancelled or blocked. You can still type or paste any email.");
    }
  }

  function applyImport() {
    const parsed = parseEmailList(importText);
    if (!parsed.length) {
      toast.error("No email addresses found in that text.");
      return;
    }
    const value = allowMultiple ? parsed.join(", ") : parsed[0];
    onEmailChange(value);
    rememberEmail(value);
    setRecent(loadRecent());
    setImportOpen(false);
    setImportText("");
    toast.success(allowMultiple && parsed.length > 1 ? `Imported ${parsed.length} emails` : `Imported ${parsed[0]}`);
  }

  return (
    <div className="space-y-2" data-testid="contact-email-field">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => setImportOpen((v) => !v)} data-testid="paste-emails">
            <ClipboardPaste className="w-3.5 h-3.5" /> Paste / CSV
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => void pickFromDevice()} data-testid="pick-contact">
            <BookUser className="w-3.5 h-3.5" />
            {pickerAvailable ? "Device contacts" : "Contacts"}
          </Button>
        </div>
      </div>
      <Input
        id={id}
        type={allowMultiple ? "text" : "email"}
        list={`${id}-recent`}
        value={email}
        required={required}
        autoComplete="email"
        placeholder={allowMultiple ? "one@email.com, two@email.com" : "customer@email.com"}
        onChange={(e) => onEmailChange(e.target.value)}
        onBlur={() => {
          if (email.includes("@")) {
            rememberEmail(email);
            setRecent(loadRecent());
          }
        }}
        data-testid="customer-email-input"
      />
      <datalist id={`${id}-recent`}>
        {mergedSuggestions.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      {importOpen && (
        <div className="rounded-xl border border-slate-200 p-3 space-y-2" data-testid="email-import-panel">
          <Label htmlFor={`${id}-import`}>Paste emails (comma, newline, or CSV)</Label>
          <Textarea
            id={`${id}-import`}
            rows={3}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={"name,email@co.com\nother@co.com"}
            data-testid="email-import-text"
          />
          <Button type="button" size="sm" onClick={applyImport} data-testid="email-import-apply">
            Use {allowMultiple ? "these emails" : "first email"}
          </Button>
        </div>
      )}
      <p className="text-xs text-slate-500">
        {pickerAvailable
          ? "Pick from device contacts, paste a list, use recent/job emails, or type."
          : "Paste emails, use recent/job history, or type. Device Contact Picker appears on supported phones (e.g. Chrome Android)."}
        {allowMultiple ? " Separate multiple recipients with commas." : ""}
      </p>
    </div>
  );
}
