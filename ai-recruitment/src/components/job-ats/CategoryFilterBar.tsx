"use client";

export function CategoryFilterBar({
  categories,
  active,
  onChange,
  counts,
}: {
  categories: string[];
  active: string;
  onChange: (c: string) => void;
  counts: Record<string, number>;
}) {
  return (
    <div className="flex gap-2 flex-wrap md:flex-nowrap overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
      {categories.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onChange(cat)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
            active === cat
              ? "bg-violet-600 text-white shadow-sm"
              : "bg-white border border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600"
          }`}
        >
          {cat}
          {counts[cat] != null && (
            <span className="ml-1.5 text-xs opacity-70">{counts[cat]}</span>
          )}
        </button>
      ))}
    </div>
  );
}
