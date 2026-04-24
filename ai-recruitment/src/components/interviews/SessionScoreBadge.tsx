import { cn } from "@/lib/utils";

interface Props {
  score: number | null | undefined;
  className?: string;
}

function bandFor(score: number) {
  if (score >= 85) return { label: "Strong", className: "bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-500/30" };
  if (score >= 70) return { label: "Solid", className: "bg-sky-500/10 text-sky-600 ring-1 ring-inset ring-sky-500/30" };
  if (score >= 55) return { label: "Mixed", className: "bg-amber-500/10 text-amber-600 ring-1 ring-inset ring-amber-500/30" };
  return { label: "Developing", className: "bg-rose-500/10 text-rose-600 ring-1 ring-inset ring-rose-500/30" };
}

export function SessionScoreBadge({ score, className }: Props) {
  if (score == null) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground",
          className,
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
        Pending
      </span>
    );
  }

  const band = bandFor(score);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
        band.className,
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {score} · {band.label}
    </span>
  );
}
