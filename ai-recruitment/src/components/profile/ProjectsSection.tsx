"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Pencil, FolderGit2, Globe, Github, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useProjects } from "@/hooks";
import type { ProjectRecord } from "@/lib/api-client";

const ProjectFormSchema = z.object({
  title:        z.string().min(1, "Title is required"),
  description:  z.string().optional(),
  technologies: z.string().optional(),
  repoUrl:      z.string().url().optional().or(z.literal("")),
  demoUrl:      z.string().url().optional().or(z.literal("")),
  teamRole:     z.string().optional(),
  isCurrent:    z.boolean(),
});

type FormValues = z.infer<typeof ProjectFormSchema>;

interface ProjectFormDialogProps {
  existing?: ProjectRecord;
  onClose:   () => void;
}

function ProjectFormDialog({ existing, onClose }: ProjectFormDialogProps) {
  const { add, update } = useProjects();
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(ProjectFormSchema),
    defaultValues: {
      title:        existing?.title ?? "",
      description:  existing?.description ?? "",
      technologies: (existing?.technologies ?? []).join(", "),
      repoUrl:      existing?.repoUrl ?? "",
      demoUrl:      existing?.demoUrl ?? "",
      teamRole:     existing?.teamRole ?? "",
      isCurrent:    existing?.isCurrent ?? false,
    },
  });

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    try {
      const payload = {
        title:        data.title,
        description:  data.description || undefined,
        technologies: data.technologies ? data.technologies.split(",").map((t) => t.trim()).filter(Boolean) : [],
        repoUrl:      data.repoUrl || undefined,
        demoUrl:      data.demoUrl || undefined,
        teamRole:     data.teamRole || undefined,
        isCurrent:    data.isCurrent,
      };
      if (existing?.id) await update(existing.id, payload);
      else await add(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem>
            <FormLabel>Project Title *</FormLabel>
            <FormControl><Input placeholder="My Awesome Project" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea placeholder="What does this project do? What problem does it solve?" rows={4} {...field} />
            </FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="technologies" render={({ field }) => (
          <FormItem>
            <FormLabel>Tech Stack</FormLabel>
            <FormControl><Input placeholder="React, TypeScript, Postgres (comma-separated)" {...field} /></FormControl>
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="repoUrl" render={({ field }) => (
            <FormItem>
              <FormLabel>GitHub Repo</FormLabel>
              <FormControl><Input placeholder="https://github.com/..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="demoUrl" render={({ field }) => (
            <FormItem>
              <FormLabel>Live Demo</FormLabel>
              <FormControl><Input placeholder="https://myapp.com" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="teamRole" render={({ field }) => (
          <FormItem>
            <FormLabel>Your Role</FormLabel>
            <FormControl><Input placeholder="e.g., Frontend Lead, Full-Stack Developer" {...field} /></FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="isCurrent" render={({ field }) => (
          <FormItem className="flex items-center gap-2">
            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            <FormLabel className="!mt-0 cursor-pointer">Ongoing project</FormLabel>
          </FormItem>
        )} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : (existing ? "Save Changes" : "Add Project")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function ProjectsSection() {
  const { projects, isLoading, remove } = useProjects();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectRecord | undefined>();
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
          <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Projects</h3>
          <p className="text-sm text-slate-500 mt-0.5">Showcase your best work</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(undefined); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="rounded-xl gap-1.5">
              <Plus className="h-4 w-4" /> Add Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[540px]">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Project" : "Add Project"}</DialogTitle>
            </DialogHeader>
            <ProjectFormDialog existing={editing} onClose={() => { setOpen(false); setEditing(undefined); }} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => <div key={i} className="h-44 rounded-2xl bg-slate-100 animate-pulse dark:bg-slate-800" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-14 text-center dark:border-slate-800">
          <FolderGit2 className="h-10 w-10 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No projects yet</p>
          <p className="text-slate-400 text-sm mt-1">Add projects to demonstrate your skills</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {projects.map((proj, idx) => (
            <Card key={proj.id ?? idx} className="group relative rounded-2xl border-slate-200/60 p-5 dark:border-slate-800 hover:border-primary/40 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                    <FolderGit2 className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white truncate">{proj.title}</h4>
                    {proj.teamRole && <p className="text-xs text-slate-500">{proj.teamRole}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(proj); setOpen(true); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-red-50"
                    onClick={() => proj.id && handleDelete(proj.id)}
                    disabled={deleting === proj.id}
                  >
                    {deleting === proj.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  </Button>
                </div>
              </div>

              {proj.description && (
                <p className="mt-3 text-sm text-slate-500 leading-relaxed line-clamp-3">{proj.description}</p>
              )}

              {(proj.technologies?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {proj.technologies!.slice(0, 5).map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px] px-2 py-0.5">{t}</Badge>
                  ))}
                </div>
              )}

              {(proj.repoUrl || proj.demoUrl) && (
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  {proj.repoUrl && (
                    <a href={proj.repoUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                      <Github className="h-3.5 w-3.5" /> Code
                    </a>
                  )}
                  {proj.demoUrl && (
                    <a href={proj.demoUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-primary transition-colors">
                      <Globe className="h-3.5 w-3.5" /> Live Demo
                    </a>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
