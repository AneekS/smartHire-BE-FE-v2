import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  label?: string;
}

export function ThinkingIndicator({ className, label }: Props) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs text-muted-foreground",
        className,
      )}
      aria-live="polite"
      aria-label={label ?? "Thinking"}
    >
      <span className="flex h-4 items-end gap-0.5">
        <span className="h-1 w-1 rounded-full bg-primary/80 animate-[bounce_1s_infinite] [animation-delay:-200ms]" />
        <span className="h-1 w-1 rounded-full bg-primary/80 animate-[bounce_1s_infinite] [animation-delay:-100ms]" />
        <span className="h-1 w-1 rounded-full bg-primary/80 animate-[bounce_1s_infinite]" />
      </span>
      {label ?? "Thinking…"}
    </div>
  );
}
