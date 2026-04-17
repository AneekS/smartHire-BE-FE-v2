"use client";

export function JobSearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search jobs, companies, or tech..."
      className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 shadow-sm"
      aria-label="Search job listings"
    />
  );
}
