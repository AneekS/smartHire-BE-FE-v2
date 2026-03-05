"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Plus, Trash2, Pencil, Award, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCertifications } from "@/hooks";
import type { CertificationRecord } from "@/lib/api-client";

const CertSchema = z.object({
  name:          z.string().min(1, "Certification name is required"),
  issuer:        z.string().min(1, "Issuing organization is required"),
  issueDate:     z.string().optional(),
  expiryDate:    z.string().optional(),
  credentialId:  z.string().optional(),
  credentialUrl: z.string().url().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof CertSchema>;

function formatDate(dateStr?: string | null) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(d);
  } catch { return dateStr; }
}

function isExpired(expiryDate?: string | null): boolean {
  if (!expiryDate) return false;
  try { return new Date(expiryDate) < new Date(); }
  catch { return false; }
}

interface CertFormDialogProps { existing?: CertificationRecord; onClose: () => void; }

function CertFormDialog({ existing, onClose }: CertFormDialogProps) {
  const { add, update } = useCertifications();
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(CertSchema),
    defaultValues: {
      name:          existing?.name          ?? "",
      issuer:        existing?.issuer        ?? "",
      issueDate:     existing?.issueDate     ? existing.issueDate.slice(0, 10)  : "",
      expiryDate:    existing?.expiryDate    ? existing.expiryDate.slice(0, 10) : "",
      credentialId:  existing?.credentialId  ?? "",
      credentialUrl: existing?.credentialUrl ?? "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    try {
      const payload = {
        name: data.name, issuer: data.issuer,
        issueDate: data.issueDate || undefined, expiryDate: data.expiryDate || undefined,
        credentialId: data.credentialId || undefined, credentialUrl: data.credentialUrl || undefined,
      };
      if (existing?.id) await update(existing.id, payload);
      else await add(payload);
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Certification Name *</FormLabel>
            <FormControl><Input placeholder="AWS Solutions Architect" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="issuer" render={({ field }) => (
          <FormItem><FormLabel>Issuing Organization *</FormLabel>
            <FormControl><Input placeholder="Amazon Web Services" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="issueDate" render={({ field }) => (
            <FormItem><FormLabel>Issue Date</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="expiryDate" render={({ field }) => (
            <FormItem><FormLabel>Expiry Date</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="credentialId" render={({ field }) => (
          <FormItem><FormLabel>Credential ID</FormLabel>
            <FormControl><Input placeholder="ABC-123-XYZ" {...field} /></FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="credentialUrl" render={({ field }) => (
          <FormItem><FormLabel>Credential URL</FormLabel>
            <FormControl><Input placeholder="https://credential.link/verify/..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : (existing ? "Update" : "Add Certification")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function CertificationsSection() {
  const { certifications, isLoading, remove } = useCertifications();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CertificationRecord | undefined>();
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try { await remove(id); } finally { setDeleting(null); }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Certifications</h3>
          <p className="text-sm text-slate-500 mt-0.5">Credentials & licenses</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(undefined); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="rounded-xl gap-1.5"><Plus className="h-4 w-4" /> Add</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader><DialogTitle>{editing ? "Edit Certification" : "Add Certification"}</DialogTitle></DialogHeader>
            <CertFormDialog existing={editing} onClose={() => { setOpen(false); setEditing(undefined); }} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[0,1,2].map(i => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse dark:bg-slate-800" />)}</div>
      ) : certifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center dark:border-slate-800">
          <Award className="h-10 w-10 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No certifications yet</p>
          <p className="text-slate-400 text-sm mt-1">Add certifications to validate your expertise</p>
        </div>
      ) : (
        <div className="space-y-3">
          {certifications.map((cert, idx) => {
            const expired = isExpired(cert.expiryDate);
            return (
              <Card key={cert.id ?? idx} className="group flex items-center gap-4 rounded-2xl border-slate-200/60 p-4 dark:border-slate-800 hover:border-primary/30 transition-colors">
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${expired ? "bg-red-50 dark:bg-red-900/20" : "bg-amber-50 dark:bg-amber-900/20"}`}>
                  <Award className={`h-5 w-5 ${expired ? "text-red-400" : "text-amber-500"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{cert.name}</h4>
                    {expired && <Badge variant="destructive" className="text-[10px] shrink-0">Expired</Badge>}
                    {!expired && cert.expiryDate && <Badge className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-200 shrink-0">Active</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{cert.issuer}{cert.issueDate ? ` · Issued ${formatDate(cert.issueDate)}` : ""}{cert.expiryDate ? ` · Expires ${formatDate(cert.expiryDate)}` : ""}</p>
                  {cert.credentialId && <p className="text-xs text-slate-400 mt-0.5">ID: {cert.credentialId}</p>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {cert.credentialUrl && (
                    <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-8 w-8"><ExternalLink className="h-3.5 w-3.5" /></Button>
                    </a>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(cert); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-50"
                    onClick={() => cert.id && handleDelete(cert.id)} disabled={deleting === cert.id}>
                    {deleting === cert.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
