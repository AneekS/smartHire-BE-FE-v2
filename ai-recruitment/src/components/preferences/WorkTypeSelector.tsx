"use client";

import type { WorkType } from "@/hooks/usePreferences";

interface WorkTypeSelectorProps {
  value: WorkType[];
  onChange: (value: WorkType[]) => void;
}

const WORK_TYPES: WorkType[] = ["REMOTE", "HYBRID", "ONSITE", "CONTRACT", "FREELANCE"];

export function WorkTypeSelector({ value, onChange }: WorkTypeSelectorProps) {
  const toggle = (type: WorkType) => {
    if (value.includes(type)) {
      onChange(value.filter((item) => item !== type));
      return;
    }
    onChange([...value, type]);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Work Type Preferences</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {WORK_TYPES.map((type) => {
          const active = value.includes(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggle(type)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                active
                  ? "bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-900"
                  : "border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              {type}
            </button>
          );
        })}
      </div>
    </div>
  );
}
