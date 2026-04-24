import { Loader2 } from "lucide-react";

export default function InterviewRoomLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading interview…
      </div>
    </div>
  );
}
