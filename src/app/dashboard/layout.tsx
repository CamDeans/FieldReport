import { RequireAuth } from "@/components/require-auth";
import { DashboardNav } from "@/components/dashboard-nav";
import { DemoBanner } from "@/components/demo-banner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
        <DashboardNav />
        <DemoBanner />
        <main id="main" className="max-w-6xl mx-auto">
          {children}
        </main>
      </div>
    </RequireAuth>
  );
}
