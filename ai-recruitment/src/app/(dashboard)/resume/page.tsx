"use client";

import { useResumes } from "@/hooks";
import { ResumeStudioLayout } from "@/components/resume/ResumeStudioLayout";
import { Loader2 } from "lucide-react";

export default function ResumePage() {
  const { isLoading } = useResumes();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#FAFAFA]">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Subtle grid dot texture (Mindset Health style) */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.4]"
        style={{
          backgroundImage: "radial-gradient(circle, #E5E7EB 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      {/* Soft purple gradient blob */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-0 z-0 h-[400px] w-[800px] -translate-x-1/2 -translate-y-[120px]"
        style={{
          background: "radial-gradient(ellipse, rgba(124,58,237,0.06) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10">
        <ResumeStudioLayout />
      </div>
    </div>
  );
}
