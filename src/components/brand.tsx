import Link from "next/link";
import { FileText } from "lucide-react";

export function Brand({ href = "/", dark = false }: { href?: string; dark?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 min-h-11" data-testid="brand-link">
      <span className="w-9 h-9 rounded-xl bg-primary text-white grid place-items-center">
        <FileText className="w-5 h-5" />
      </span>
      <span className={`font-bold text-lg ${dark ? "text-white" : "text-slate-900"}`}>FieldReport</span>
    </Link>
  );
}
