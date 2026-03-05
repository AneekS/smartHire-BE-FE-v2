"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import {
  Plus,
  Edit2,
  Trash2,
  FileText,
  Github,
  Linkedin,
  Globe,
  Star,
  GraduationCap,
  AlertCircle,
  MapPin,
  Camera,
  Lock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useProfile, useResumes, useConnectedAccounts } from "@/hooks";
import { toast } from "sonner";

// â”€â”€ New section components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { ExperienceSection }        from "@/components/profile/ExperienceSection";
import { ProjectsSection }          from "@/components/profile/ProjectsSection";
import { CertificationsSection }    from "@/components/profile/CertificationsSection";
import { CareerPreferencesSection } from "@/components/profile/CareerPreferencesSection";
import { AIInsightsPanel }          from "@/components/profile/AIInsightsPanel";
import { PrivacySettingsSection }   from "@/components/profile/PrivacySettingsSection";
import { AvatarUploadModal }        from "@/components/profile/AvatarUploadModal";
import { ConnectedAccountsSection } from "@/components/profile/ConnectedAccountsSection";
import { CompletenessBar }          from "@/components/profile/CompletenessBar";
import { ReputationSection }        from "@/components/profile/ReputationSection";
import { SkillsSection }            from "@/components/profile/SkillsSection";

const EduSchema = z.object({
  school:    z.string().min(1, "School is required"),
  degree:    z.string().min(1, "Degree is required"),
  field:     z.string().min(1, "Field of study is required"),
  startYear: z.string().min(4, "Invalid year"),
  endYear:   z.string().min(4, "Invalid year"),
});

// â”€â”€ Tab definition â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TABS = [
  { value: "overview",        label: "Overview"          },
  { value: "experience",      label: "Experience"        },
  { value: "projects",        label: "Projects"          },
  { value: "certifications",  label: "Certifications"    },
  { value: "career",          label: "Career Prefs"      },
  { value: "resume",          label: "Resume"            },
  { value: "ai-insights",     label: "AI Insights"       },
  { value: "settings",        label: "Settings"          },
  { value: "privacy",         label: "Privacy"           },
] as const;

export default function ProfilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile, isLoading, updateProfile }                = useProfile();
  const { resumes, isLoading: resumesLoading, uploadResume } = useResumes();
  const { getAccount, isConnected }                          = useConnectedAccounts();

  const [avatarOpen, setAvatarOpen] = useState(false);
  const [activeTab, setActiveTab]   = useState<string>("overview");
  const [saving, setSaving] = useState(false);

  // Inline edit states
  const [editingName, setEditingName]         = useState(false);
  const [nameVal, setNameVal]                 = useState("");
  const [editingHeadline, setEditingHeadline] = useState(false);
  const [headlineVal, setHeadlineVal]         = useState("");
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationVal, setLocationVal]         = useState("");

  // Form states
  const [form, setForm] = useState({
    email:        "",
    phone:        "",
    linkedInUrl:  "",
    githubUrl:    "",
    websiteUrl:   "",
    jobAlerts:    true,
    aiSuggestions: false,
    publicProfile: true,
  });

  const [isEduOpen, setIsEduOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        email:         profile.email        ?? "",
        phone:         profile.phone        ?? "",
        linkedInUrl:   profile.linkedInUrl  ?? "",
        githubUrl:     profile.githubUrl    ?? "",
        websiteUrl:    profile.websiteUrl   ?? "",
        jobAlerts:     profile.jobAlerts    ?? true,
        aiSuggestions: profile.aiSuggestions ?? false,
        publicProfile: profile.publicProfile ?? true,
      });
      setNameVal(profile.name ?? "");
      setHeadlineVal(profile.headline ?? "");
      const city    = profile.city ?? undefined;
      const country = profile.country ?? undefined;
      setLocationVal([city, country].filter(Boolean).join(", "));
    }
  }, [profile]);

  const eduForm = useForm<z.infer<typeof EduSchema>>({
    resolver: zodResolver(EduSchema),
    defaultValues: { school: "", degree: "", field: "", startYear: "", endYear: "" },
  });

  const handleSaveContact = async () => {
    setSaving(true);
    try {
      await updateProfile({
        phone: form.phone || undefined,
        linkedInUrl: form.linkedInUrl || undefined,
        githubUrl: form.githubUrl || undefined,
        websiteUrl: form.websiteUrl || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const saveInlineName = async () => {
    setEditingName(false);
    if (nameVal !== profile?.name) {
      await updateProfile({ name: nameVal });
    }
  };

  const saveInlineHeadline = async () => {
    setEditingHeadline(false);
    if (headlineVal !== profile?.headline) {
      await updateProfile({ headline: headlineVal });
    }
  };

  const saveInlineLocation = async () => {
    setEditingLocation(false);
    const [city, ...rest] = locationVal.split(",").map((s) => s.trim());
    const country = rest.join(", ") || undefined;
    await updateProfile({ city: city || undefined, country } as Parameters<typeof updateProfile>[0]);
  };

  const onAddEducation = async (data: z.infer<typeof EduSchema>) => {
    const freshEdu = [...(profile?.educations ?? []), data];
    await updateProfile({ educations: freshEdu });
    eduForm.reset();
    setIsEduOpen(false);
  };

  const removeEducation = async (index: number) => {
    const list = [...(profile?.educations ?? [])];
    list.splice(index, 1);
    await updateProfile({ educations: list });
  };

  const handleToggle = async (key: "jobAlerts" | "aiSuggestions" | "publicProfile") => {
    const newValue = !form[key];
    setForm((f) => ({ ...f, [key]: newValue }));
    try {
      await updateProfile({ [key]: newValue });
    } catch {
      setForm((f) => ({ ...f, [key]: !newValue }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadResume(file);
    e.target.value = "";
  };

  const completeness    = profile?.profileCompleteness ?? 0;
  const isProfileLocked = completeness < 40;

  // Derive missing sections client-side for CompletenessBar
  const missingSections: string[] = [];
  if (!profile?.name)                                                         missingSections.push("name");
  if (!profile?.headline)                                                      missingSections.push("headline");
  if (!profile?.educations?.length)                                           missingSections.push("education");
  if ((profile?.skillRecords?.length ?? 0) < 3)                              missingSections.push("skills");
  if (!resumes?.length)                                                       missingSections.push("resume");
  if (!profile?.experiences?.length)                                            missingSections.push("experience");
  if (!profile?.projects?.length)                                               missingSections.push("projects");
  if (!profile?.careerPreference)                                               missingSections.push("careerPrefs");

  const reputation = profile?.reputation as Record<string, unknown> | undefined;

  // â”€â”€â”€ Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-3/4" />
        </div>
      </div>
    );
  }

  // â”€â”€â”€ Page layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">

          {/* â”€â”€ SIDEBAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <aside className="lg:col-span-4 space-y-5">

            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Banner */}
              <div
                className="h-36 bg-gradient-to-br from-primary to-indigo-700"
                style={{
                  backgroundImage: `radial-gradient(at 0% 0%, hsla(253,16%,15%,0.4) 0, transparent 50%),
                                    radial-gradient(at 50% 0%, hsla(280,70%,60%,0.3) 0, transparent 50%)`,
                }}
              />

              {/* Avatar */}
              <div className="relative -mt-14 flex justify-center">
                <div className="group relative h-28 w-28 overflow-hidden rounded-3xl border-[6px] border-white bg-white shadow-2xl dark:border-slate-900 dark:bg-slate-800">
                  <img
                    src={
                      profile?.avatarUrl ||
                      profile?.photoUrl ||
                      profile?.image ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile?.name ?? "user")}`
                    }
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                  <button
                    aria-label="Change photo"
                    onClick={() => setAvatarOpen(true)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Camera className="h-6 w-6 text-white" />
                  </button>
                </div>
              </div>

              <div className="px-7 pb-7 pt-4 text-center">
                {/* Editable Name */}
                <div
                  className="flex items-center justify-center gap-2 group cursor-pointer"
                  onClick={() => !editingName && setEditingName(true)}
                >
                  {editingName ? (
                    <Input
                      autoFocus
                      value={nameVal}
                      onChange={(e) => setNameVal(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveInlineName()}
                      onBlur={saveInlineName}
                      className="h-8 max-w-[220px] text-center font-bold text-lg"
                    />
                  ) : (
                    <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                      {profile?.name || <span className="text-slate-400 italic">Add Name</span>}
                      <Edit2 className="inline ml-2 h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h2>
                  )}
                </div>

                {/* Editable Headline */}
                <div
                  className="mt-1.5 flex items-center justify-center gap-2 group cursor-pointer"
                  onClick={() => !editingHeadline && setEditingHeadline(true)}
                >
                  {editingHeadline ? (
                    <Input
                      autoFocus
                      value={headlineVal}
                      onChange={(e) => setHeadlineVal(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveInlineHeadline()}
                      onBlur={saveInlineHeadline}
                      className="h-7 max-w-[260px] text-xs text-center"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors max-w-[240px] mx-auto line-clamp-2">
                      {profile?.headline || <span className="italic">Add Headline</span>}
                      <Edit2 className="inline ml-1.5 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                  )}
                </div>

                {/* Editable Location */}
                <div
                  className="mt-2 flex items-center justify-center gap-1 group cursor-pointer text-xs text-slate-400"
                  onClick={() => !editingLocation && setEditingLocation(true)}
                >
                  {editingLocation ? (
                    <Input
                      autoFocus
                      placeholder="City, Country"
                      value={locationVal}
                      onChange={(e) => setLocationVal(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveInlineLocation()}
                      onBlur={saveInlineLocation}
                      className="h-6 max-w-[200px] text-xs text-center"
                    />
                  ) : (
                    <>
                      <MapPin className="h-3 w-3" />
                      <span className="group-hover:text-primary transition-colors">
                        {locationVal || "Add Location"}
                      </span>
                    </>
                  )}
                </div>

                {/* Social / connected account links */}
                <div className="mt-5 flex justify-center gap-3">
                  {([
                    { provider: "GITHUB"    as const, Icon: Github,   label: "GitHub",   fallback: form.githubUrl   },
                    { provider: "LINKEDIN"  as const, Icon: Linkedin, label: "LinkedIn", fallback: form.linkedInUrl },
                    { provider: "PORTFOLIO" as const, Icon: Globe,    label: "Portfolio",fallback: form.websiteUrl  },
                  ]).map(({ provider, Icon, label, fallback }) => {
                    const account = getAccount(provider);
                    const href = account?.profileUrl || fallback || null;
                    const connected = isConnected(provider) || !!fallback;
                    return (
                      <a
                        key={label}
                        href={href || "#"}
                        aria-label={label}
                        target={href ? "_blank" : undefined}
                        rel="noreferrer"
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-2xl border transition-all",
                          connected
                            ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:border-primary hover:text-white"
                            : "border-slate-200/50 bg-slate-50 text-slate-400 hover:bg-primary hover:border-primary hover:text-white dark:border-slate-700 dark:bg-slate-800"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* Completeness bar */}
              <div className="border-t border-slate-100 px-7 py-5 dark:border-slate-800">
                <CompletenessBar score={completeness} missing={missingSections} compact />
              </div>
            </motion.div>

            {/* Locked / AI Enabled card */}
            {isProfileLocked ? (
              <Card className="border-amber-100 bg-amber-50 p-5 dark:border-amber-900/30 dark:bg-amber-900/10">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <h4 className="font-bold text-sm text-amber-800 dark:text-amber-400">Unlock AI Features</h4>
                    <p className="text-xs mt-1 text-amber-700/80 dark:text-amber-400/80">
                      Reach 40% completeness (add Education, Skills &amp; Resume) to activate ATS scoring and AI Insights.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 h-7 rounded-lg border-amber-300 text-xs text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400"
                      onClick={() => setActiveTab("overview")}
                    >
                      Complete Profile â†’
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary to-indigo-700 p-5 text-white shadow-2xl shadow-primary/20">
                <div className="relative z-10">
                  <Sparkles className="h-5 w-5 mb-2 text-white/80" />
                  <h4 className="text-base font-bold tracking-tight">AI Enabled âœ¨</h4>
                  <p className="mt-1 text-xs text-white/75">Your profile is robust enough for deep AI analysis.</p>
                  <Button
                    size="sm"
                    className="mt-3 h-7 rounded-lg bg-white/20 text-[11px] text-white hover:bg-white/30 border-0"
                    onClick={() => setActiveTab("ai-insights")}
                  >
                    View Insights â†’
                  </Button>
                </div>
                <Star className="absolute -bottom-6 -right-6 h-36 w-36 text-white/10" />
              </Card>
            )}

            {/* Reputation section */}
            <ReputationSection reputation={reputation} />
          </aside>

          {/* â”€â”€ MAIN CONTENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="lg:col-span-8">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="overflow-x-auto">
                <TabsList className="flex min-w-max gap-0 border-b border-slate-200 dark:border-slate-800 bg-transparent h-auto p-0 justify-start w-full rounded-none">
                  {TABS.map(({ value, label }) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="whitespace-nowrap border-b-[3px] border-transparent px-4 pb-4 pt-1 text-sm font-semibold text-slate-500 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="mt-8 space-y-8">

                {/* 1. OVERVIEW */}
                <TabsContent value="overview" className="mt-0 space-y-10">
                  <SkillsSection />
                  <ExperienceSection />
                </TabsContent>

                {/* 2. EXPERIENCE */}
                <TabsContent value="experience" className="mt-0">
                  <ExperienceSection />
                </TabsContent>

                {/* 3. PROJECTS */}
                <TabsContent value="projects" className="mt-0">
                  <ProjectsSection />
                </TabsContent>

                {/* 4. CERTIFICATIONS */}
                <TabsContent value="certifications" className="mt-0">
                  <CertificationsSection />
                </TabsContent>

                {/* 5. CAREER PREFERENCES */}
                <TabsContent value="career" className="mt-0">
                  <CareerPreferencesSection />
                </TabsContent>

                {/* 6. RESUME */}
                <TabsContent value="resume" className="mt-0 space-y-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Resume Management</h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Upload and optimize your resume with AI</p>
                    </div>
                    <>
                      <input ref={fileInputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileUpload} disabled={resumesLoading} />
                      <Button type="button" className="rounded-2xl bg-slate-900 font-bold shadow-xl dark:bg-white dark:text-slate-900" onClick={() => fileInputRef.current?.click()} disabled={resumesLoading}>
                        <Plus className="mr-2 h-4 w-4" /> Upload Resume
                      </Button>
                    </>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {resumesLoading ? (
                      <Skeleton className="h-40 rounded-3xl" />
                    ) : resumes.length === 0 ? (
                      <Card className="rounded-3xl border-slate-200/60 p-8 dark:border-slate-800"><p className="text-slate-500">No resumes yet. Upload one to get started.</p></Card>
                    ) : (
                      resumes.map((v) => (
                        <Card key={v.id} className="group rounded-3xl border-slate-200/60 p-6 transition-all hover:border-primary/40 hover:shadow-2xl dark:border-slate-800">
                          <div className="mb-6 flex items-start justify-between">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-primary dark:bg-indigo-900/20">
                              <FileText className="h-7 w-7" />
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge className={cn("uppercase", v.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-50 text-slate-500")}>{v.status}</Badge>
                              <span className="text-[10px] font-semibold uppercase text-slate-400">
                                {isProfileLocked ? "ATS Hidden (Incomplete)" : `Score: ${v.atsScore ?? "â€”"}/100`}
                              </span>
                            </div>
                          </div>
                          <h4 className="font-bold text-lg">{v.title}</h4>
                          <p className="mt-2 text-xs font-medium text-slate-500">{v.roleTarget ?? "General"}</p>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* 7. AI INSIGHTS */}
                <TabsContent value="ai-insights" className="mt-0">
                  {isProfileLocked ? (
                    <Card className="rounded-3xl border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
                      <AlertCircle className="mx-auto h-10 w-10 text-amber-400 mb-4" />
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white">Profile Incomplete</h3>
                      <p className="text-sm text-slate-500 mt-2">Reach 40% profile completeness to unlock AI Insights.</p>
                      <Button variant="outline" className="mt-6 rounded-xl" onClick={() => setActiveTab("overview")}>
                        Complete Profile â†’
                      </Button>
                    </Card>
                  ) : (
                    <AIInsightsPanel />
                  )}
                </TabsContent>

                {/* 8. SETTINGS */}
                <TabsContent value="settings" className="mt-0 space-y-8">
                  {/* Connected Accounts */}
                  <ConnectedAccountsSection />
                  <Card className="rounded-3xl border-slate-200/60 p-8 dark:border-slate-800">
                    <h3 className="text-xl font-bold tracking-tight mb-8">Contact &amp; Web Links</h3>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Official Email</Label>
                        <Input disabled className="rounded-2xl border-slate-200 bg-slate-100" value={form.email} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Phone</Label>
                        <Input className="rounded-2xl border-slate-200 bg-slate-50 dark:bg-slate-800" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+1 555 000 0000" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">LinkedIn URL</Label>
                        <Input className="rounded-2xl border-slate-200 bg-slate-50 dark:bg-slate-800" value={form.linkedInUrl} onChange={(e) => setForm((f) => ({ ...f, linkedInUrl: e.target.value }))} placeholder="https://linkedin.com/in/you" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">GitHub URL</Label>
                        <Input className="rounded-2xl border-slate-200 bg-slate-50 dark:bg-slate-800" value={form.githubUrl} onChange={(e) => setForm((f) => ({ ...f, githubUrl: e.target.value }))} placeholder="https://github.com/you" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Website / Portfolio</Label>
                        <Input className="rounded-2xl border-slate-200 bg-slate-50 dark:bg-slate-800" value={form.websiteUrl} onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))} placeholder="https://yoursite.com" />
                      </div>
                    </div>
                    <div className="mt-8 flex justify-end">
                      <Button className="rounded-2xl bg-slate-900 px-8 font-black shadow-xl dark:bg-white dark:text-slate-900" onClick={handleSaveContact} disabled={saving}>
                        {saving ? "Savingâ€¦" : "Save Links"}
                      </Button>
                    </div>
                  </Card>

                  {/* Education */}
                  <div>
                    <div className="flex justify-between items-center mb-5">
                      <h3 className="font-display text-xl font-bold tracking-tight">Education Background</h3>
                      <Dialog open={isEduOpen} onOpenChange={setIsEduOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="rounded-xl"><Plus className="mr-2 h-4 w-4" /> Add Education</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader><DialogTitle>Add Academic Record</DialogTitle></DialogHeader>
                          <Form {...eduForm}>
                            <form onSubmit={eduForm.handleSubmit(onAddEducation)} className="space-y-4 pt-4">
                              <FormField control={eduForm.control} name="school" render={({ field }) => (<FormItem><FormLabel>School / University</FormLabel><FormControl><Input placeholder="Harvard University" {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={eduForm.control} name="degree" render={({ field }) => (<FormItem><FormLabel>Degree</FormLabel><FormControl><Input placeholder="B.S. Computer Science" {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={eduForm.control} name="field" render={({ field }) => (<FormItem><FormLabel>Field of Study</FormLabel><FormControl><Input placeholder="Software Engineering" {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <div className="grid grid-cols-2 gap-4">
                                <FormField control={eduForm.control} name="startYear" render={({ field }) => (<FormItem><FormLabel>Start</FormLabel><FormControl><Input placeholder="2018" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={eduForm.control} name="endYear" render={({ field }) => (<FormItem><FormLabel>End</FormLabel><FormControl><Input placeholder="2022" {...field} /></FormControl><FormMessage /></FormItem>)} />
                              </div>
                              <Button type="submit" className="w-full mt-4">Save Education</Button>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {profile?.educations?.length ? (
                        profile.educations.map((edu, idx) => (
                          <Card key={idx} className="p-5 rounded-2xl flex items-start justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-slate-100 rounded-xl dark:bg-slate-800"><GraduationCap className="h-5 w-5 text-slate-500" /></div>
                              <div>
                                <h4 className="font-bold text-slate-900 dark:text-white">{edu.school}</h4>
                                <p className="text-sm text-slate-500">{edu.degree} in {edu.field}</p>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">{edu.startYear} â€“ {edu.endYear}</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeEducation(idx)} className="text-red-500 hover:bg-red-50 shrink-0"><Trash2 className="h-4 w-4" /></Button>
                          </Card>
                        ))
                      ) : (
                        <div className="p-8 text-center text-slate-400 border border-dashed rounded-xl border-slate-300 dark:border-slate-800">No education records. Add some to boost completeness!</div>
                      )}
                    </div>
                  </div>

                  {/* Preferences toggles */}
                  <Card className="rounded-3xl border-slate-200/60 p-8 dark:border-slate-800">
                    <h3 className="text-xl font-bold tracking-tight mb-6">Preferences</h3>
                    <div className="space-y-5">
                      {(
                        [
                          { key: "jobAlerts",    label: "Job Alerts",      desc: "Receive email notifications for matching jobs"  },
                          { key: "aiSuggestions", label: "AI Suggestions", desc: "Get personalised AI career recommendations"    },
                          { key: "publicProfile", label: "Public Profile", desc: "Allow recruiters to find your profile"         },
                        ] as const
                      ).map(({ key, label, desc }) => (
                        <div key={key} className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{label}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={form[key]}
                            onClick={() => handleToggle(key)}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                              form[key] ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"
                            )}
                          >
                            <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform", form[key] ? "translate-x-6" : "translate-x-1")} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </Card>
                </TabsContent>

                {/* 9. PRIVACY */}
                <TabsContent value="privacy" className="mt-0">
                  <PrivacySettingsSection />
                </TabsContent>

              </div>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Avatar upload modal */}
      <AvatarUploadModal
        open={avatarOpen}
        onOpenChange={setAvatarOpen}
        currentUrl={profile?.avatarUrl || profile?.photoUrl || profile?.image}
        name={profile?.name}
      />
    </div>
  );
}
