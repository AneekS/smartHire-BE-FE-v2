"use client";

import { InsforgeBrowserProvider } from "@insforge/nextjs";
import { insforge } from "@/lib/insforge";

export function InsforgeProvider({ children }: { children: React.ReactNode }) {
  return (
    <InsforgeBrowserProvider
      client={
        insforge as unknown as Parameters<
          typeof InsforgeBrowserProvider
        >[0]["client"]
      }
      afterSignInUrl="/dashboard"
    >
      {children}
    </InsforgeBrowserProvider>
  );
}
