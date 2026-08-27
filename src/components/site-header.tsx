"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#use-cases", label: "Use cases" },
  { href: "#pricing", label: "Pricing" },
  { href: "/help", label: "Help" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Brand />
        <nav className="hidden sm:flex items-center gap-6 text-sm text-slate-600">
          {nav.map((item) =>
            item.href.startsWith("#") ? (
              <a key={item.href} href={item.href} className="hover:text-slate-900">
                {item.label}
              </a>
            ) : (
              <Link key={item.href} href={item.href} className="hover:text-slate-900">
                {item.label}
              </Link>
            )
          )}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Start free</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="sm:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            data-testid="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            Menu
          </Button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" className="sm:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1 animate-in" data-testid="mobile-nav">
          {nav.map((item) =>
            item.href.startsWith("#") ? (
              <a key={item.href} href={item.href} className="block py-2 text-slate-700" onClick={() => setOpen(false)}>
                {item.label}
              </a>
            ) : (
              <Link key={item.href} href={item.href} className="block py-2 text-slate-700" onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            )
          )}
        </nav>
      )}
    </header>
  );
}
