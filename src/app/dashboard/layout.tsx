import { ReactNode } from "react";
import { DashboardNav } from "./DashboardNav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen stitch-bg">
      <DashboardNav />
      <main className="flex-1 min-w-0 pt-16 sm:pt-0 sm:pl-0" data-dashboard>
        <div className="p-4 sm:p-6 lg:p-8 text-slate-200">{children}</div>
      </main>
    </div>
  );
}
