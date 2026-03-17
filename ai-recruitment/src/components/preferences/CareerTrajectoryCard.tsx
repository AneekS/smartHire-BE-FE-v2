"use client";

import type { CareerTrajectoryDto } from "@/hooks/usePreferences";

interface CareerTrajectoryCardProps {
  data: CareerTrajectoryDto | null;
}

function inr(value: number): string {
  return `INR ${(value / 100000).toFixed(1)}L`;
}

export function CareerTrajectoryCard({ data }: CareerTrajectoryCardProps) {
  if (!data) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500">Career trajectory will appear after role-fit scores are generated.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Career Trajectory</p>
      <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{data.currentRole}</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Next possible role: {data.nextRole}</p>
      <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">Estimated salary: {inr(data.estimatedSalary)}</p>
      <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">Timeline: {data.timeline}</p>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600">Skills to Acquire</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-200">
          {data.skillsToAcquire.length === 0 ? <li>-</li> : data.skillsToAcquire.map((item) => <li key={item}>- {item}</li>)}
        </ul>
      </div>
    </div>
  );
}
