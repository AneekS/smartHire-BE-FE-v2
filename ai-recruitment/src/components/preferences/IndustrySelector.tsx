"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface IndustrySelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function IndustrySelector({ value, onChange }: IndustrySelectorProps) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const item = draft.trim();
    if (!item || value.includes(item)) return;
    onChange([...value, item]);
    setDraft("");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Industry Preferences</p>
      <div className="mt-3 flex gap-2">
        <Input
          value={draft}
          placeholder="Fintech, Healthcare, SaaS"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
        />
        <Button type="button" variant="secondary" onClick={add}>
          Add
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {value.map((industry) => (
          <button
            key={industry}
            type="button"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200"
            onClick={() => onChange(value.filter((item) => item !== industry))}
          >
            {industry} x
          </button>
        ))}
      </div>
    </div>
  );
}
