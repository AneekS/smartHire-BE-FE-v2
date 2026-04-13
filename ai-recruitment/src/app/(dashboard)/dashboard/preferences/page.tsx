"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleSelector } from "@/components/preferences/RoleSelector";
import { SalaryExpectationSlider } from "@/components/preferences/SalaryExpectationSlider";
import { IndustrySelector } from "@/components/preferences/IndustrySelector";
import { WorkTypeSelector } from "@/components/preferences/WorkTypeSelector";
import { LocationPreferenceSelector } from "@/components/preferences/LocationPreferenceSelector";
import { RoleFitScoreCard } from "@/components/preferences/RoleFitScoreCard";
import { CareerTrajectoryCard } from "@/components/preferences/CareerTrajectoryCard";
import { usePreferences, type PreferenceFormState, type WorkType } from "@/hooks/usePreferences";

const EXPERIENCE_LEVELS = ["ENTRY", "MID", "SENIOR", "LEAD"] as const;
const SALARY_VISIBILITY = ["PUBLIC", "RANGE_ONLY", "PRIVATE"] as const;

type Preference = {
  primaryRole?: string;
  secondaryRoles?: string[];
  exploratoryRoles?: string[];
  experienceLevel?: PreferenceFormState["experienceLevel"];
  preferredIndustries?: string[];
  preferredWorkTypes?: WorkType[];
  preferredLocations?: string[];
  salaryMin?: number;
  salaryTarget?: number;
  salaryMax?: number;
  salaryVisibility?: PreferenceFormState["salaryVisibility"];
};

const DEFAULT_FORM: PreferenceFormState = {
  primaryRole: "",
  secondaryRoles: [],
  exploratoryRoles: [],
  experienceLevel: "MID",
  preferredIndustries: [],
  preferredWorkTypes: ["REMOTE"],
  preferredLocations: [],
  salaryMin: 600000,
  salaryTarget: 1200000,
  salaryMax: 1800000,
  salaryVisibility: "RANGE_ONLY",
};

function toFormState(pref: Preference | null): PreferenceFormState {
  if (!pref) return DEFAULT_FORM;

  return {
    primaryRole: pref.primaryRole ?? DEFAULT_FORM.primaryRole,
    secondaryRoles: Array.isArray(pref.secondaryRoles) ? pref.secondaryRoles : DEFAULT_FORM.secondaryRoles,
    exploratoryRoles: Array.isArray(pref.exploratoryRoles) ? pref.exploratoryRoles : DEFAULT_FORM.exploratoryRoles,
    experienceLevel: pref.experienceLevel ?? DEFAULT_FORM.experienceLevel,
    preferredIndustries: Array.isArray(pref.preferredIndustries) ? pref.preferredIndustries : DEFAULT_FORM.preferredIndustries,
    preferredWorkTypes: Array.isArray(pref.preferredWorkTypes) ? pref.preferredWorkTypes : DEFAULT_FORM.preferredWorkTypes,
    preferredLocations: Array.isArray(pref.preferredLocations) ? pref.preferredLocations : DEFAULT_FORM.preferredLocations,
    salaryMin: typeof pref.salaryMin === "number" ? pref.salaryMin : DEFAULT_FORM.salaryMin,
    salaryTarget: typeof pref.salaryTarget === "number" ? pref.salaryTarget : DEFAULT_FORM.salaryTarget,
    salaryMax: typeof pref.salaryMax === "number" ? pref.salaryMax : DEFAULT_FORM.salaryMax,
    salaryVisibility: pref.salaryVisibility ?? DEFAULT_FORM.salaryVisibility,
  };
}

function RolePreferences({
  form,
  onChange,
}: {
  form: PreferenceFormState;
  onChange: (next: Partial<PreferenceFormState>) => void;
}) {
  return (
    <RoleSelector
      primaryRole={form.primaryRole}
      secondaryRoles={form.secondaryRoles}
      exploratoryRoles={form.exploratoryRoles}
      onChange={onChange}
    />
  );
}

function SalaryPreferences({
  form,
  onChange,
}: {
  form: PreferenceFormState;
  onChange: (next: Partial<PreferenceFormState>) => void;
}) {
  return (
    <SalaryExpectationSlider
      salaryMin={form.salaryMin}
      salaryTarget={form.salaryTarget}
      salaryMax={form.salaryMax}
      onChange={onChange}
    />
  );
}

export default function PreferencesPage() {
  const router = useRouter();

  const {
    roleFitScores,
    trajectory,
    save,
    refreshRoleFit,
    roleFitError,
  } = usePreferences();

  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [preference, setPreference] = useState<Preference | null>(null);
  const [form, setForm] = useState<PreferenceFormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const hasBootstrappedAutoSave = useRef(false);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const res = await fetch("/api/preferences", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        const json = (await res.json().catch(() => ({}))) as {
          authenticated?: boolean;
          preference?: Preference | null;
        };

        const nextAuthenticated = json.authenticated ?? false;
        const nextPreference = json.preference ?? null;

        setAuthenticated(nextAuthenticated);
        setPreference(nextPreference);
        setForm(toFormState(nextPreference));
      } catch (error) {
        console.error("Preferences fetch failed:", error);
        setAuthenticated(false);
        setPreference(null);
        setForm(DEFAULT_FORM);
      } finally {
        setLoading(false);
      }
    };

    void fetchPreferences();
  }, []);

  const canSave = useMemo(
    () => form.primaryRole.trim().length > 1 && form.salaryMin <= form.salaryTarget && form.salaryTarget <= form.salaryMax,
    [form],
  );

  const syncFromServer = () => setForm(toFormState(preference));

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await save(form);
      toast.success("Preferences saved");
      setPreference(form);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!authenticated || preference === null) return;

    if (!hasBootstrappedAutoSave.current) {
      hasBootstrappedAutoSave.current = true;
      return;
    }

    const timeout = setTimeout(() => {
      if (!canSave) return;

      void (async () => {
        try {
          setAutoSaving(true);
          await saveRef.current(form);
          setPreference(form);
        } catch (error) {
          console.error("Preferences auto-save failed:", error);
        } finally {
          setAutoSaving(false);
        }
      })();
    }, 500);

    return () => clearTimeout(timeout);
    // Omit preference + save from deps to avoid loop: save -> mutate -> save ref changes -> effect re-runs -> save again
  }, [authenticated, canSave, form]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="p-6 space-y-4">
        <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800 dark:border-cyan-900/40 dark:bg-cyan-950/30 dark:text-cyan-200">
          You&apos;re browsing as guest. Login for full experience.
        </div>
        <div className="rounded-lg border p-6 bg-white dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Login Required</h2>
          <p className="text-muted-foreground mt-2">
            Please login to set your job preferences and get personalized recommendations.
          </p>
          <Button className="mt-4" onClick={() => router.push("/login")}>
            Login
          </Button>
        </div>
      </div>
    );
  }

  if (authenticated && !preference) {
    return (
      <div className="p-6 border rounded-lg bg-white dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Set Your Preferences</h2>
        <p className="text-muted-foreground mt-2">
          Add your preferred roles and salary expectations to unlock personalized job matches.
        </p>
        <Button className="mt-4" onClick={() => setPreference({})}>
          Edit Preferences
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,#e0f2fe_0%,#f8fafc_45%,#ffffff_100%)] dark:bg-[radial-gradient(circle_at_top,#022c43_0%,#020617_50%,#020617_100%)]">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-3xl border border-cyan-200/70 bg-white/90 p-8 shadow-xl backdrop-blur dark:border-cyan-900/50 dark:bg-slate-900/80"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-400">SmartHire Preference Engine</p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Preferred Role + Salary Expectations
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            Configure your role priorities, compensation bands, and work preferences. SmartHire uses this to power recommendations,
            recruiter visibility, and AI career trajectory insights.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button disabled={!canSave || saving || loading} onClick={() => void submit()}>
              {saving ? "Saving..." : "Save Preferences"}
            </Button>
            <Button variant="secondary" disabled={saving || loading} onClick={syncFromServer}>
              Reset
            </Button>
            <Button variant="outline" disabled={saving || loading} onClick={() => void refreshRoleFit()}>
              Recompute Role Fit
            </Button>
          </div>

          {autoSaving && (
            <p className="mt-3 text-xs text-muted-foreground">Auto-saving your preferences...</p>
          )}
        </motion.div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
          <section className="space-y-5 xl:col-span-7">
            <RolePreferences form={form} onChange={(next) => setForm((prev) => ({ ...prev, ...next }))} />

            <SalaryPreferences form={form} onChange={(next) => setForm((prev) => ({ ...prev, ...next }))} />

            <IndustrySelector
              value={form.preferredIndustries}
              onChange={(preferredIndustries) => setForm((prev) => ({ ...prev, preferredIndustries }))}
            />

            <WorkTypeSelector
              value={form.preferredWorkTypes}
              onChange={(preferredWorkTypes) => setForm((prev) => ({ ...prev, preferredWorkTypes }))}
            />

            <LocationPreferenceSelector
              value={form.preferredLocations}
              onChange={(preferredLocations) => setForm((prev) => ({ ...prev, preferredLocations }))}
            />

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Experience + Salary Visibility</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Experience Level</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
                    value={form.experienceLevel}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        experienceLevel: e.target.value as PreferenceFormState["experienceLevel"],
                      }))
                    }
                  >
                    {EXPERIENCE_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Salary Visibility</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
                    value={form.salaryVisibility}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        salaryVisibility: e.target.value as PreferenceFormState["salaryVisibility"],
                      }))
                    }
                  >
                    {SALARY_VISIBILITY.map((visibility) => (
                      <option key={visibility} value={visibility}>
                        {visibility}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Primary role quick edit</label>
                <Input
                  className="mt-1"
                  value={form.primaryRole}
                  onChange={(e) => setForm((prev) => ({ ...prev, primaryRole: e.target.value }))}
                />
              </div>
            </div>
          </section>

          <aside className="space-y-5 xl:col-span-5">
            <CareerTrajectoryCard data={trajectory} />
            <div className="space-y-4">
              {roleFitError && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
                  Role-fit insights are temporarily unavailable. You can still save and manage your preferences.
                </div>
              )}
              {roleFitScores.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  No role-fit insights yet. Save preferences and click &quot;Recompute Role Fit&quot;.
                </div>
              ) : (
                roleFitScores.map((score) => <RoleFitScoreCard key={score.id} score={score} />)
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
