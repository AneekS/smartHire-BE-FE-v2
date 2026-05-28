"use client";

import { Sidebar } from "./Sidebar";
import { ClerkDatabaseSync } from "@/components/auth/ClerkDatabaseSync";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
      <ClerkDatabaseSync />
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
