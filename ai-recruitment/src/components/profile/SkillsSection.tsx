"use client";

import { useState, KeyboardEvent } from "react";
import { X, Plus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfile } from "@/hooks";
import type { SkillRecord } from "@/lib/api-client";
import { toast } from "sonner";

type SkillLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: "BEGINNER",     label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED",     label: "Advanced" },
  { value: "EXPERT",       label: "Expert" },
];

const LEVEL_COLORS: Record<SkillLevel, string> = {
  BEGINNER:     "bg-slate-100 text-slate-600 border-slate-200",
  INTERMEDIATE: "bg-blue-50 text-blue-600 border-blue-200",
  ADVANCED:     "bg-violet-50 text-violet-600 border-violet-200",
  EXPERT:       "bg-amber-50 text-amber-600 border-amber-200",
};

const LEVEL_LABELS: Record<SkillLevel, string> = {
  BEGINNER:     "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED:     "Advanced",
  EXPERT:       "Expert",
};

// "General" is represented by an empty selectedCategory (placeholder shown);
// CATEGORIES only contains non-empty values to satisfy Radix UI requirements.
const CATEGORIES = ["Frontend", "Backend", "DevOps", "Data", "Mobile", "AI/ML", "Soft Skills", "Other"];

export function SkillsSection() {
  const { profile, isLoading, updateProfile } = useProfile();
  const [skillInput, setSkillInput] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<SkillLevel>("INTERMEDIATE");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const skills: SkillRecord[] = profile?.skillRecords ?? [];

  const addSkill = async (e?: KeyboardEvent<HTMLInputElement>) => {
    if (e && e.key !== "Enter") return;
    if (e) e.preventDefault();
    const name = skillInput.trim();
    if (!name) return;

    const exists = skills.some((s) => s.name.toLowerCase() === name.toLowerCase());
    if (exists) { toast.error("Skill already added"); return; }

    setSaving(true);
    try {
      const newSkill: SkillRecord = { name, level: selectedLevel, category: selectedCategory || undefined };
      await updateProfile({ skillRecords: [...skills, newSkill] });
      setSkillInput("");
    } finally {
      setSaving(false);
    }
  };

  const removeSkill = async (index: number) => {
    setSaving(true);
    try {
      const updated = skills.filter((_, i) => i !== index);
      await updateProfile({ skillRecords: updated });
    } finally {
      setSaving(false);
    }
  };

  // Group skills by category
  const grouped = skills.reduce<Record<string, SkillRecord[]>>((acc, skill, idx) => {
    const cat = skill.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ ...skill, _idx: idx } as SkillRecord & { _idx: number });
    return acc;
  }, {});

  if (isLoading) return <div className="h-64 rounded-2xl bg-slate-100 animate-pulse dark:bg-slate-800" />;

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Skills</h3>
          <p className="text-sm text-slate-500 mt-0.5">Your technical and soft skills</p>
        </div>
        <span className="text-xs font-semibold text-slate-400">{skills.length} skill{skills.length !== 1 ? "s" : ""}</span>
      </div>

      <Card className="rounded-2xl border-slate-200/60 p-6 dark:border-slate-800">
        {/* Add skill row */}
        <div className="flex flex-col gap-3 sm:flex-row mb-6">
          <Input
            placeholder="Type a skill and press Enter…"
            className="flex-1 rounded-xl h-11"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={addSkill}
            disabled={saving}
          />
          <Select value={selectedLevel} onValueChange={(v) => setSelectedLevel(v as SkillLevel)}>
            <SelectTrigger className="w-36 rounded-xl h-11">
              <SelectValue placeholder="Skill level" />
            </SelectTrigger>
            <SelectContent>
              {SKILL_LEVELS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-36 rounded-xl h-11">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {/* No value="" item — placeholder handles the "no category" state */}
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            type="button"
            className="rounded-xl h-11 gap-1.5"
            onClick={() => addSkill()}
            disabled={saving || !skillInput.trim()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </div>

        {/* Skills by category */}
        {skills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-slate-400 text-sm">No skills added yet. Start typing above!</p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(grouped).map(([category, catSkills]) => (
              <div key={category}>
                <h5 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">{category}</h5>
                <div className="flex flex-wrap gap-2">
                  {catSkills.map((skill) => {
                    const idx = (skill as SkillRecord & { _idx: number })._idx;
                    const level = (skill.level ?? "INTERMEDIATE") as SkillLevel;
                    return (
                      <Badge
                        key={`${skill.name}-${idx}`}
                        className={`gap-2 px-3 py-1.5 text-sm font-medium border ${LEVEL_COLORS[level] ?? "bg-slate-50 text-slate-600"}`}
                      >
                        {skill.name}
                        {skill.level && skill.level !== "INTERMEDIATE" && (
                          <span className="text-[10px] opacity-70">· {LEVEL_LABELS[level]}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeSkill(idx)}
                          className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
