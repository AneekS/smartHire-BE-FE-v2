"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePreferredRoles } from "@/hooks";

function normalizeRole(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

const PRIORITIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export function PreferredRoleSelectionSection() {
  const { roles, isLoading, addRole, deleteRole } = usePreferredRoles();
  const [draft, setDraft] = useState("");
  const [priority, setPriority] = useState<number>(5);

  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => a.priority - b.priority || b.confidenceScore - a.confidenceScore),
    [roles]
  );

  const submitAdd = async () => {
    const value = normalizeRole(draft);
    if (!value) return;
    const existing = new Set(sortedRoles.map((r) => r.role.toLowerCase()));
    if (existing.has(value.toLowerCase())) return;
    await addRole(value, priority);
    setDraft("");
  };

  return (
    <Card className="rounded-2xl border-slate-200/60 p-6 dark:border-slate-800">
      <h4 className="text-base font-semibold text-slate-900 dark:text-white">Preferred roles</h4>
      <p className="mt-1 text-xs text-slate-500">
        Add job titles and set priority (1 = highest). Each add calls the API and updates the list immediately.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Role name</label>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. Backend Developer"
            onKeyDown={(e) => e.key === "Enter" && void submitAdd()}
          />
        </div>
        <div className="w-full space-y-1.5 sm:w-36">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Priority</label>
          <Select value={String(priority)} onValueChange={(v) => setPriority(Number(v))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={String(p)}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" className="sm:mb-0.5" onClick={() => void submitAdd()} disabled={!draft.trim()}>
          <Plus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
        {!isLoading && sortedRoles.length === 0 && (
          <p className="text-sm text-muted-foreground">No roles yet. Add one above.</p>
        )}
        {sortedRoles.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
          >
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{r.role}</p>
              <p className="text-xs text-slate-500">
                Priority {r.priority}
                {r.source ? ` · ${r.source}` : ""}
              </p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="text-red-600 hover:text-red-700"
              onClick={() => void deleteRole(r.id)}
              aria-label={`Remove ${r.role}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
