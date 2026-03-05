"use client";

import { useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, DollarSign, Briefcase, Globe, Plus, X, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useCareerPreferences } from "@/hooks";

const Schema = z.object({
  workMode:          z.string().optional(),
  salaryMin:         z.number().min(0).optional(),
  salaryMax:         z.number().min(0).optional(),
  currency:          z.string().optional(),
  openToRelocation:  z.boolean().optional(),
  preferredRoles:    z.array(z.string()).optional(),
  preferredIndustries: z.array(z.string()).optional(),
  preferredLocations:  z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof Schema>;

const WORK_MODES = [
  { value: "REMOTE",  label: "🌐 Remote",  color: "bg-emerald-100 text-emerald-700" },
  { value: "HYBRID",  label: "🏠 Hybrid",  color: "bg-blue-100 text-blue-700" },
  { value: "ONSITE",  label: "🏢 Onsite",  color: "bg-slate-100 text-slate-700" },
];

function TagInput({
  values, onChange, placeholder,
}: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState("");

  const add = useCallback(() => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput("");
  }, [input, values, onChange]);

  const remove = (tag: string) => onChange(values.filter((v) => v !== tag));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="icon" onClick={add}><Plus className="h-4 w-4" /></Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 px-2 py-1">
              {tag}
              <button type="button" onClick={() => remove(tag)} className="ml-1 hover:text-red-500">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function CareerPreferencesSection() {
  const { careerPreference, isLoading, save } = useCareerPreferences();
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    values: {
      workMode:            careerPreference?.workMode         ?? "",
      salaryMin:           careerPreference?.salaryMin        ?? undefined,
      salaryMax:           careerPreference?.salaryMax        ?? undefined,
      currency:            careerPreference?.currency         ?? "USD",
      openToRelocation:    careerPreference?.openToRelocation ?? false,
      preferredRoles:      careerPreference?.preferredRoles      ?? [],
      preferredIndustries: careerPreference?.preferredIndustries ?? [],
      preferredLocations:  careerPreference?.preferredLocations  ?? [],
    },
  });

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    try {
      await save({
        workMode:            data.workMode          || undefined,
        salaryMin:           data.salaryMin         ?? undefined,
        salaryMax:           data.salaryMax         ?? undefined,
        currency:            data.currency          ?? "USD",
        openToRelocation:    data.openToRelocation  ?? false,
        preferredRoles:      data.preferredRoles    ?? [],
        preferredIndustries: data.preferredIndustries ?? [],
        preferredLocations:  data.preferredLocations  ?? [],
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="h-64 rounded-2xl bg-slate-100 animate-pulse dark:bg-slate-800" />;

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Career Preferences
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">Help us match you with the right opportunities</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Work Mode */}
          <Card className="rounded-2xl border-slate-200/60 p-6 dark:border-slate-800">
            <h4 className="font-semibold flex items-center gap-2 text-slate-800 dark:text-white mb-4">
              <Globe className="h-4 w-4 text-primary" /> Work Mode Preference
            </h4>
            <FormField control={form.control} name="workMode" render={({ field }) => (
              <FormItem>
                <div className="flex flex-wrap gap-3">
                  {WORK_MODES.map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => field.onChange(field.value === mode.value ? "" : mode.value)}
                      className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                        field.value === mode.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-slate-200 bg-white text-slate-500 hover:border-primary/40 dark:border-slate-700 dark:bg-slate-800"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </FormItem>
            )} />
          </Card>

          {/* Salary */}
          <Card className="rounded-2xl border-slate-200/60 p-6 dark:border-slate-800">
            <h4 className="font-semibold flex items-center gap-2 text-slate-800 dark:text-white mb-4">
              <DollarSign className="h-4 w-4 text-primary" /> Salary Expectations
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Currency</Label>
                <FormField control={form.control} name="currency" render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value ?? "USD"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["USD", "EUR", "GBP", "INR", "CAD", "AUD"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <FormField control={form.control} name="salaryMin" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-500">Minimum</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="50000" {...field} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="salaryMax" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-500">Maximum</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="100000" {...field} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                  </FormControl>
                </FormItem>
              )} />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <FormField control={form.control} name="openToRelocation" render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl><Switch checked={field.value ?? false} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="cursor-pointer text-sm">Open to relocation</FormLabel>
                </FormItem>
              )} />
            </div>
          </Card>

          {/* Roles / Industries / Locations */}
          <Card className="rounded-2xl border-slate-200/60 p-6 dark:border-slate-800">
            <h4 className="font-semibold flex items-center gap-2 text-slate-800 dark:text-white mb-5">
              <Briefcase className="h-4 w-4 text-primary" /> Preferences
            </h4>
            <div className="space-y-5">
              <div>
                <Label className="text-sm font-medium mb-1.5 inline-block">Preferred Roles</Label>
                <Controller
                  control={form.control}
                  name="preferredRoles"
                  render={({ field }) => (
                    <TagInput
                      values={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="e.g. Frontend Engineer (press Enter)"
                    />
                  )}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 inline-block">Preferred Industries</Label>
                <Controller
                  control={form.control}
                  name="preferredIndustries"
                  render={({ field }) => (
                    <TagInput
                      values={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="e.g. Fintech, SaaS (press Enter)"
                    />
                  )}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Preferred Locations
                </Label>
                <Controller
                  control={form.control}
                  name="preferredLocations"
                  render={({ field }) => (
                    <TagInput
                      values={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="e.g. San Francisco, Remote (press Enter)"
                    />
                  )}
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" className="rounded-xl px-8 font-semibold" disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Preferences</>}
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}
