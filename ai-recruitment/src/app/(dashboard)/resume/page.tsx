"use client";

import { useResumes } from "@/hooks";
import { ResumeStudioLayout } from "@/components/resume/ResumeStudioLayout";
import { Loader2 } from "lucide-react";

export default function ResumePage() {
  const { resumes, isLoading } = useResumes();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0F0F13]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  const selected = resumes[0]; // For this MVP, we just take the latest/first resume

  return <ResumeStudioLayout initialData={selected} />;
}
