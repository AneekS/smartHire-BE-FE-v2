"use client";

interface SalaryExpectationSliderProps {
  salaryMin: number;
  salaryTarget: number;
  salaryMax: number;
  onChange: (next: { salaryMin: number; salaryTarget: number; salaryMax: number }) => void;
}

function formatLakh(value: number): string {
  return `${(value / 100000).toFixed(1)}L`;
}

export function SalaryExpectationSlider({
  salaryMin,
  salaryTarget,
  salaryMax,
  onChange,
}: SalaryExpectationSliderProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Salary Expectation (INR/year)</p>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          Min {formatLakh(salaryMin)}
          <input
            type="range"
            min={200000}
            max={5000000}
            step={50000}
            value={salaryMin}
            onChange={(e) =>
              onChange({
                salaryMin: Number(e.target.value),
                salaryTarget: Math.max(Number(e.target.value), salaryTarget),
                salaryMax: Math.max(Number(e.target.value), salaryMax),
              })
            }
            className="w-full"
          />
        </label>

        <label className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          Target {formatLakh(salaryTarget)}
          <input
            type="range"
            min={salaryMin}
            max={salaryMax}
            step={50000}
            value={salaryTarget}
            onChange={(e) =>
              onChange({
                salaryMin,
                salaryTarget: Number(e.target.value),
                salaryMax,
              })
            }
            className="w-full"
          />
        </label>

        <label className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          Max {formatLakh(salaryMax)}
          <input
            type="range"
            min={salaryTarget}
            max={7000000}
            step={50000}
            value={salaryMax}
            onChange={(e) =>
              onChange({
                salaryMin,
                salaryTarget,
                salaryMax: Number(e.target.value),
              })
            }
            className="w-full"
          />
        </label>
      </div>
    </div>
  );
}
