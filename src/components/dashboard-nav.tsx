"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CreditCard, HelpCircle, LayoutDashboard, LogOut, Plus, Settings } from "lucide-react";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Jobs", icon: LayoutDashboard },
  { href: "/dashboard/jobs/new", label: "New job", icon: Plus },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help", icon: HelpCircle },
];

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, logout } = useStore();

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 no-print">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <Brand href="/dashboard" />
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 h-11 inline-flex items-center text-sm font-medium rounded-lg",
                    active ? "bg-blue-50 text-primary" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-sm text-slate-500 truncate max-w-[160px]">
              {profile?.companyName || profile?.fullName}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-30 safe-bottom no-print" data-testid="mobile-bottom-nav">
        <div className="grid grid-cols-5">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex flex-col items-center justify-center py-2 text-[11px] font-medium",
                  active ? "text-primary" : "text-slate-500"
                )}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                {link.label.split(" ")[0]}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
