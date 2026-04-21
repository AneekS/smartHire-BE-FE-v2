"use client";

import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useSalaryProfile } from "@/hooks";

const DEFAULT_MIN = 0;
const DEFAULT_MAX = 0;

export function SalaryExpectationSection() {
  const { profile: salaryProfile, saveProfile, deleteProfile, isLoading, mutate } = useSalaryProfile();
  const [minSalary, setMinSalary] = useState(DEFAULT_MIN);
  const [maxSalary, setMaxSalary] = useState(DEFAULT_MAX);
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (salaryProfile) {
      setMinSalary(salaryProfile.minSalary);
      setMaxSalary(salaryProfile.maxSalary);
      setIsNegotiable(salaryProfile.isNegotiable ?? true);
    } else {
      setMinSalary(DEFAULT_MIN);
      setMaxSalary(DEFAULT_MAX);
      setIsNegotiable(true);
    }
  }, [salaryProfile]);

  const onSave = async () => {
    setSaving(true);
    try {
      await saveProfile({
        minSalary,
        maxSalary,
        currency: salaryProfile?.currency ?? "INR",
        salaryType: (salaryProfile?.salaryType as "MONTHLY" | "YEARLY") ?? "YEARLY",
        isNegotiable,
        preferredLocations: Array.isArray(salaryProfile?.preferredLocations)
          ? (salaryProfile.preferredLocations as string[])
          : [],
      });
    } finally {
      setSaving(false);
    }
  };

  const onReset = async () => {
    await mutate();
  };

  const onDelete = async () => {
    setDeleting(true);
    try {
      await deleteProfile();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="rounded-2xl border-slate-200/60 p-6 dark:border-slate-800">
      <div className="mb-4 flex items-center gap-2">
        <Coins className="h-4 w-4 text-primary" />
        <h4 className="text-base font-semibold text-slate-900 dark:text-white">Salary expectation</h4>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Min salary</Label>
          <Input
            type="number"
            min={0}
            value={minSalary === 0 ? "" : minSalary}
            onChange={(e) => setMinSalary(Number(e.target.value) || 0)}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Max salary</Label>
          <Input
            type="number"
            min={0}
            value={maxSalary === 0 ? "" : maxSalary}
            onChange={(e) => setMaxSalary(Number(e.target.value) || 0)}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-slate-200/80 px-3 py-2 dark:border-slate-700">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">Negotiable</p>
          <p className="text-xs text-slate-500">Open to discussion on compensation</p>
        </div>
        <Switch checked={isNegotiable} onCheckedChange={setIsNegotiable} disabled={isLoading} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {salaryProfile?.currency ?? "INR"} · {(salaryProfile?.salaryType as string) ?? "YEARLY"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void onReset()} disabled={isLoading}>
            Reset
          </Button>
          <Button type="button" variant="destructive" onClick={() => void onDelete()} disabled={deleting || !salaryProfile}>
            Clear saved
          </Button>
          <Button
            type="button"
            onClick={() => void onSave()}
            disabled={saving || minSalary <= 0 || minSalary > maxSalary}
          >
            Save
          </Button>
        </div>
      </div>
    </Card>
  );
}
