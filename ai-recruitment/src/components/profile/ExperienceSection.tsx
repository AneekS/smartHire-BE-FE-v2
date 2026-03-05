"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Plus, Trash2, Pencil, Briefcase, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useExperiences } from "@/hooks";
import type { ExperienceRecord } from "@/lib/api-client";

const ExperienceFormSchema = z.object({
  company:        z.string().min(1, "Company is required"),
  jobTitle:       z.string().min(1, "Job title is required"),
  employmentType: z.string().optional(),
  location:       z.string().optional(),
  startDate:      z.string().min(1, "Start date is required"),
  endDate:        z.string().optional(),
  isCurrent:      z.boolean(),
  description:    z.string().optional(),
  achievements:   z.array(z.object({ value: z.string() })).optional(),
  technologies:   z.string().optional(), // comma-separated
});

type FormValues = z.infer<typeof ExperienceFormSchema>;

const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "FREELANCE", "INTERNSHIP"];
const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time", PART_TIME: "Part-time",
  CONTRACT: "Contract", FREELANCE: "Freelance", INTERNSHIP: "Internship",
};

function formatDateDisplay(dateStr?: string | null) {
  if (!dateStr) return "Present";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(d);
  } catch { return dateStr; }
}

interface ExperienceFormDialogProps {
  existing?: ExperienceRecord;
  onClose:  () => void;
}

function ExperienceFormDialog({ existing, onClose }: ExperienceFormDialogProps) {
  const { add, update } = useExperiences();
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(ExperienceFormSchema),
    defaultValues: {
      company:        existing?.company        ?? "",
      jobTitle:       existing?.jobTitle       ?? "",
      employmentType: existing?.employmentType ?? "",
      location:       existing?.location       ?? "",
      startDate:      existing?.startDate ? existing.startDate.slice(0, 10) : "",
      endDate:        existing?.endDate   ? existing.endDate.slice(0, 10)   : "",
      isCurrent:      existing?.isCurrent ?? false,
      description:    existing?.description ?? "",
      achievements:   (existing?.achievements ?? []).map((a) => ({ value: a })),
      technologies:   (existing?.technologies ?? []).join(", "),
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "achievements" });
  const isCurrent = form.watch("isCurrent");

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    try {
      const payload = {
        company:        data.company,
        jobTitle:       data.jobTitle,
        employmentType: data.employmentType || undefined,
        location:       data.location || undefined,
        startDate:      data.startDate,
        endDate:        data.isCurrent ? undefined : (data.endDate || undefined),
        isCurrent:      data.isCurrent,
        description:    data.description || undefined,
        achievements:   data.achievements?.map((a) => a.value).filter(Boolean) ?? [],
        technologies:   data.technologies ? data.technologies.split(",").map((t) => t.trim()).filter(Boolean) : [],
      };

      if (existing?.id) {
        await update(existing.id, payload);
      } else {
        await add(payload);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="company" render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Company *</FormLabel>
              <FormControl><Input placeholder="Acme Corp" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="jobTitle" render={({ field }) => (
            <FormItem className="col-span-2 sm:col-span-1">
              <FormLabel>Job Title *</FormLabel>
              <FormControl><Input placeholder="Senior Engineer" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="employmentType" render={({ field }) => (
            <FormItem className="col-span-2 sm:col-span-1">
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Employment type" /></SelectTrigger></FormControl>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{EMPLOYMENT_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="location" render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Location</FormLabel>
              <FormControl><Input placeholder="San Francisco, CA" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="startDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date *</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          {!isCurrent && (
            <FormField control={form.control} name="endDate" render={({ field }) => (
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
              </FormItem>
            )} />
          )}
          <FormField control={form.control} name="isCurrent" render={({ field }) => (
            <FormItem className="col-span-2 flex items-center gap-2">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="!mt-0 cursor-pointer">I currently work here</FormLabel>
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea placeholder="Describe your role and responsibilities..." rows={4} {...field} />
            </FormControl>
          </FormItem>
        )} />

        <div>
          <Label className="text-sm font-medium">Key Achievements</Label>
          <div className="mt-2 space-y-2">
            {fields.map((field, idx) => (
              <div key={field.id} className="flex items-center gap-2">
                <Input
                  {...form.register(`achievements.${idx}.value`)}
                  placeholder={`Achievement ${idx + 1}`}
                  className="flex-1"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)}>
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ value: "" })}>
              <Plus className="mr-1 h-3 w-3" /> Add Achievement
            </Button>
          </div>
        </div>

        <FormField control={form.control} name="technologies" render={({ field }) => (
          <FormItem>
            <FormLabel>Technologies Used</FormLabel>
            <FormControl>
              <Input placeholder="React, TypeScript, Node.js (comma-separated)" {...field} />
            </FormControl>
          </FormItem>
        )} />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : (existing ? "Update" : "Add Experience")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function ExperienceSection() {
  const { experiences, isLoading, remove } = useExperiences();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExperienceRecord | undefined>();
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try { await remove(id); }
    finally { setDeleting(null); }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Work Experience
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">Your professional journey</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(undefined); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="rounded-xl gap-1.5">
              <Plus className="h-4 w-4" /> Add Experience
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[580px]">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Experience" : "Add Work Experience"}</DialogTitle>
            </DialogHeader>
            <ExperienceFormDialog existing={editing} onClose={() => { setOpen(false); setEditing(undefined); }} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse dark:bg-slate-800" />
          ))}
        </div>
      ) : experiences.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-14 text-center dark:border-slate-800">
          <Briefcase className="h-10 w-10 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No work experience yet</p>
          <p className="text-slate-400 text-sm mt-1">Add your professional history to boost your profile</p>
        </div>
      ) : (
        <div className="relative space-y-0">
          <div className="absolute left-[22px] top-6 bottom-6 w-px bg-slate-200 dark:bg-slate-700" />
          {experiences.map((exp, idx) => (
            <div key={exp.id ?? idx} className="relative flex gap-5 pb-8 last:pb-0">
              <div className="relative mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 z-10">
                <Briefcase className="h-5 w-5 text-slate-500" />
              </div>
              <Card className="flex-1 rounded-2xl border-slate-200/60 p-5 dark:border-slate-800 hover:border-primary/30 transition-colors group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white truncate">{exp.jobTitle}</h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{exp.company}</span>
                      {exp.employmentType && (
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                          {EMPLOYMENT_LABELS[exp.employmentType] ?? exp.employmentType}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-medium">
                      {formatDateDisplay(exp.startDate)} → {exp.isCurrent ? "Present" : formatDateDisplay(exp.endDate)}
                      {exp.location && <span className="ml-2 text-slate-400">· {exp.location}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(exp); setOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-50 hover:text-red-600"
                      onClick={() => exp.id && handleDelete(exp.id)}
                      disabled={deleting === exp.id}
                    >
                      {deleting === exp.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
                {exp.description && (
                  <p className="mt-3 text-sm text-slate-500 leading-relaxed line-clamp-2">{exp.description}</p>
                )}
                {(exp.technologies?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {exp.technologies!.slice(0, 6).map((tech) => (
                      <Badge key={tech} variant="outline" className="text-[10px] bg-slate-50 dark:bg-slate-800">{tech}</Badge>
                    ))}
                    {(exp.technologies?.length ?? 0) > 6 && (
                      <Badge variant="outline" className="text-[10px]">+{exp.technologies!.length - 6}</Badge>
                    )}
                  </div>
                )}
                {(exp.achievements?.length ?? 0) > 0 && (
                  <ul className="mt-3 space-y-1">
                    {exp.achievements!.slice(0, 3).map((a, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-slate-500">
                        <ChevronRight className="h-3 w-3 mt-px text-primary shrink-0" />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
