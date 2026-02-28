"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Brain,
  Eye,
  Plus,
  Edit2,
  Trash2,
  FileText,
  School,
  Github,
  Linkedin,
  Globe,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useProfile, useResumes } from "@/hooks";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile, isLoading, updateProfile } = useProfile();
  const { resumes, isLoading: resumesLoading, uploadResume } = useResumes();
  const [activeTab, setActiveTab] = useState("resume");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    headline: "",
    school: "",
    graduationYear: "",
    linkedInUrl: "",
    githubUrl: "",
    websiteUrl: "",
    jobAlerts: true,
    aiSuggestions: false,
    publicProfile: true,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name ?? "",
        email: profile.email ?? "",
        phone: profile.phone ?? "",
        headline: profile.headline ?? "",
        school: profile.school ?? "",
        graduationYear: profile.graduationYear ?? "",
        linkedInUrl: profile.linkedInUrl ?? "",
        githubUrl: profile.githubUrl ?? "",
        websiteUrl: profile.websiteUrl ?? "",
        jobAlerts: true,
        aiSuggestions: false,
        publicProfile: true,
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name: form.name || undefined,
        headline: form.headline || undefined,
        phone: form.phone || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadResume(file);
    e.target.value = "";
  };

  const displayProfile = profile ?? {
    name: "Arjun Sharma",
    email: "arjun.sharma@iitb.ac.in",
    headline: "Final Year, Computer Science",
    school: "IIT Bombay",
    graduationYear: "2025",
    reputationScore: 842,
    technicalScore: 92,
    softScore: 78,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          <aside className="lg:col-span-4 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div
                className="h-40 bg-gradient-to-br from-primary to-indigo-700"
                style={{
                  backgroundImage: `radial-gradient(at 0% 0%, hsla(253,16%,15%,0.4) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(280,70%,60%,0.3) 0, transparent 50%)`,
                }}
              />
              <div className="relative -mt-14 flex justify-center">
                <div className="h-28 w-28 overflow-hidden rounded-3xl border-[6px] border-white bg-white shadow-2xl dark:border-slate-900 dark:bg-slate-800">
                  <img
                    src={
                      profile?.image ??
                      "https://api.dicebear.com/7.x/avataaars/svg?seed=arjun"
                    }
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              <div className="px-8 pb-8 pt-16 text-center">
                <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {displayProfile.name ?? "Arjun Sharma"}
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                  {displayProfile.headline ?? "Final Year, Computer Science"}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  <School className="h-3.5 w-3.5" />
                  {displayProfile.school ?? "IIT Bombay"} • Class of{" "}
                  {displayProfile.graduationYear ?? "2025"}
                </div>
                <div className="mt-8 flex justify-center gap-4">
                  <a
                    href={form.githubUrl || "#"}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/50 bg-slate-50 text-slate-500 transition-colors hover:bg-primary hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                  >
                    <Github className="h-5 w-5" />
                  </a>
                  <a
                    href={form.linkedInUrl || "#"}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/50 bg-slate-50 text-slate-500 transition-colors hover:bg-primary hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a
                    href={form.websiteUrl || "#"}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/50 bg-slate-50 text-slate-500 transition-colors hover:bg-primary hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                  >
                    <Globe className="h-5 w-5" />
                  </a>
                </div>
              </div>
              <div className="border-t border-slate-100 bg-slate-50/50 px-8 py-8 dark:border-slate-800 dark:bg-slate-800/30">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                    Reputation Mastery
                  </h3>
                  <Badge className="bg-primary px-2.5 py-1 text-[10px] font-black text-white shadow-lg shadow-primary/20">
                    ELITE TOP 5%
                  </Badge>
                </div>
                <div className="flex flex-col items-center gap-8">
                  <div className="relative h-36 w-36">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                      <circle
                        className="stroke-slate-200 dark:stroke-slate-700"
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        strokeWidth="2.5"
                      />
                      <circle
                        className="stroke-primary"
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        strokeDasharray="85, 100"
                        strokeLinecap="round"
                        strokeWidth="2.5"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-display text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                        {(displayProfile as { reputationScore?: number }).reputationScore ?? 842}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        Points
                      </span>
                    </div>
                  </div>
                  <div className="w-full space-y-5">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <span>Technical Skills</span>
                        <span className="text-primary">
                          {(displayProfile as { technicalScore?: number }).technicalScore ?? 92}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${(displayProfile as { technicalScore?: number }).technicalScore ?? 92}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <span>Soft Skills</span>
                        <span className="text-pink-500">
                          {(displayProfile as { softScore?: number }).softScore ?? 78}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className="h-full bg-pink-500"
                          style={{
                            width: `${(displayProfile as { softScore?: number }).softScore ?? 78}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <Card
              className="overflow-hidden border-0 bg-gradient-to-br from-primary to-indigo-700 p-6 text-white shadow-2xl shadow-primary/20"
            >
              <div className="relative z-10">
                <h4 className="text-lg font-bold tracking-tight">Upgrade to Pro</h4>
                <p className="mt-2 text-sm text-white/80">
                  Access unlimited AI mock interviews & top-tier career coaching.
                </p>
                <Button className="mt-6 bg-white text-primary shadow-xl hover:scale-105 hover:bg-slate-50">
                  GO PREMIUM
                </Button>
              </div>
              <Star className="absolute -bottom-6 -right-6 h-40 w-40 text-white/10" />
            </Card>
          </aside>

          <div className="lg:col-span-8 space-y-10">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex gap-8 border-b border-slate-200 overflow-x-auto pb-px dark:border-slate-800">
                <TabsTrigger
                  value="resume"
                  className={cn(
                    "whitespace-nowrap border-b-[3px] pb-5 text-sm font-bold tracking-tight data-[state=inactive]:border-transparent data-[state=inactive]:text-slate-500 data-[state=active]:border-primary data-[state=active]:text-primary"
                  )}
                >
                  Resume Management
                </TabsTrigger>
                <TabsTrigger
                  value="notifications"
                  className="whitespace-nowrap border-b-[3px] border-transparent pb-5 text-sm font-semibold text-slate-500 data-[state=active]:border-primary data-[state=active]:text-primary"
                >
                  Notifications
                </TabsTrigger>
                <TabsTrigger
                  value="account"
                  className="whitespace-nowrap border-b-[3px] border-transparent pb-5 text-sm font-semibold text-slate-500 data-[state=active]:border-primary data-[state=active]:text-primary"
                >
                  Account Settings
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="whitespace-nowrap border-b-[3px] border-transparent pb-5 text-sm font-semibold text-slate-500 data-[state=active]:border-primary data-[state=active]:text-primary"
                >
                  Interview History
                </TabsTrigger>
              </div>

              <div className="mt-8 space-y-8">
                <TabsContent value="resume" className="mt-0 space-y-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Resume Versions
                      </h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Upload and optimize your resume with AI
                      </p>
                    </div>
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={resumesLoading}
                      />
                      <Button
                        type="button"
                        className="rounded-2xl bg-slate-900 font-bold shadow-xl dark:bg-white dark:text-slate-900"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={resumesLoading}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Upload Resume
                      </Button>
                    </>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {resumesLoading ? (
                      <>
                        <Skeleton className="h-40 rounded-3xl" />
                        <Skeleton className="h-40 rounded-3xl" />
                      </>
                    ) : resumes.length === 0 ? (
                      <Card className="rounded-3xl border-slate-200/60 p-8 dark:border-slate-800">
                        <p className="text-slate-500">
                          No resumes yet. Upload one to get started.
                        </p>
                      </Card>
                    ) : (
                      resumes.map((v) => (
                        <Card
                          key={v.id}
                          className="group rounded-3xl border-slate-200/60 p-6 transition-all hover:border-primary/40 hover:shadow-2xl dark:border-slate-800 dark:hover:shadow-slate-200/30"
                        >
                          <div className="mb-6 flex items-start justify-between">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-primary dark:bg-indigo-900/20">
                              <FileText className="h-7 w-7" />
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge
                                className={cn(
                                  "uppercase",
                                  v.status === "ACTIVE"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800/40 dark:text-emerald-400"
                                    : "border-slate-200 bg-slate-50 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                                )}
                              >
                                {v.status}
                              </Badge>
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Score: {v.atsScore ?? "—"}/100
                              </span>
                            </div>
                          </div>
                          <h4 className="font-bold text-lg text-slate-900 dark:text-white">
                            {v.title}
                          </h4>
                          <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                            {v.roleTarget ?? "General"}
                          </p>
                          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6 dark:border-slate-800">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Updated {new Date(v.updatedAt).toLocaleDateString()}
                            </span>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl text-slate-400 hover:text-primary"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl text-slate-400 hover:text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="notifications" className="mt-0">
                  <p className="text-slate-500">Notification preferences.</p>
                </TabsContent>

                <TabsContent value="account" className="mt-0 space-y-10">
                  <div>
                    <h3 className="font-display text-2xl font-bold tracking-tight mb-8">
                      Personalized Preferences
                    </h3>
                    <Card className="overflow-hidden rounded-3xl border-slate-200/60 dark:border-slate-800">
                      {[
                        {
                          icon: Mail,
                          title: "Smart Job Alerts",
                          desc: "Real-time matching based on your optimized resume score",
                          key: "jobAlerts" as const,
                        },
                        {
                          icon: Brain,
                          title: "AI Interview Coaching",
                          desc: "Daily mock prompts tailored to your weak points",
                          key: "aiSuggestions" as const,
                        },
                        {
                          icon: Eye,
                          title: "Recruiter Visibility",
                          desc: "Allow vetted recruiters to view your verified skill profile",
                          key: "publicProfile" as const,
                        },
                      ].map(({ icon: Icon, title, desc, key }) => (
                        <div
                          key={key}
                          className="flex items-center justify-between border-b border-slate-100 p-6 sm:p-8 last:border-b-0 dark:border-slate-800"
                        >
                          <div className="flex items-start gap-5">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 dark:bg-slate-800">
                              <Icon className="h-6 w-6" />
                            </div>
                            <div>
                              <h5 className="font-bold tracking-tight text-slate-900 dark:text-white">
                                {title}
                              </h5>
                              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                {desc}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={form[key]}
                            onClick={() =>
                              setForm((f) => ({ ...f, [key]: !f[key] }))
                            }
                            className={cn(
                              "relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-0 transition-colors focus:ring-2 focus:ring-primary focus:ring-offset-2",
                              form[key]
                                ? "bg-primary"
                                : "bg-slate-200 dark:bg-slate-700"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-[18px] w-[18px] translate-y-0.5 rounded-full bg-white shadow transition-transform",
                                form[key] ? "translate-x-7" : "translate-x-1"
                              )}
                            />
                          </button>
                        </div>
                      ))}
                    </Card>
                  </div>
                  <Card className="rounded-3xl border-slate-200/60 p-8 sm:p-10 dark:border-slate-800">
                    <h3 className="text-xl font-bold tracking-tight mb-8">
                      Security & Verification
                    </h3>
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                          Official Email Address
                        </Label>
                        <Input
                          className="rounded-2xl border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-800"
                          value={form.email}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, email: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                          Phone Number
                        </Label>
                        <Input
                          className="rounded-2xl border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-800"
                          value={form.phone}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, phone: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-end">
                      <Button
                        variant="ghost"
                        className="text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </Button>
                      <Button
                        className="rounded-2xl bg-primary font-black shadow-xl shadow-primary/25"
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? "Saving..." : "SAVE CHANGES"}
                      </Button>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                  <p className="text-slate-500">Interview history will appear here.</p>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
