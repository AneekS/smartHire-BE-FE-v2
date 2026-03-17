"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LocationPreferenceSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function LocationPreferenceSelector({ value, onChange }: LocationPreferenceSelectorProps) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const location = draft.trim();
    if (!location || value.includes(location)) return;
    onChange([...value, location]);
    setDraft("");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location Preferences</p>
      <div className="mt-3 flex gap-2">
        <Input
          value={draft}
          placeholder="Bangalore, Pune, Remote"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
        />
        <Button type="button" variant="secondary" onClick={add}>
          Add
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {value.map((location) => (
          <button
            key={location}
            type="button"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200"
            onClick={() => onChange(value.filter((item) => item !== location))}
          >
            {location} x
          </button>
        ))}
      </div>
    </div>
  );
}
