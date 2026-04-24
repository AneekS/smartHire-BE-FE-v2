"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  FileText,
  Filter,
  Flame,
  GraduationCap,
  Info,
  Lightbulb,
  Lock,
  Medal,
  Mic,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";

import { useCareer } from "@/hooks";

const DEFAULT_TARGET = "Software Engineer";

type MilestoneStatus = "completed" | "active" | "locked";

type RoadmapMilestone = {
  id: number;
  title: string;
  status: MilestoneStatus;
  salary: string;
  timeframe: string;
  readiness: number;
  requiredSkills: string[];
  acquiredSkills: string[];
  missingSkills: string[];
  description: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  accent: string;
};

type KpiCard = {
  label: string;
  value: string;
  sub: string;
  gradient: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
};

type ActivityRow = {
  date: string;
  event: string;
  category: "Assessment" | "Interview" | "Learning" | "Resume" | "Skill";
  score: string;
  impact: string;
  status: "completed" | "inProgress";
  icon: React.ComponentType<{ className?: string; size?: number }>;
};

type SkillGap = {
  skill: string;
  current: number;
  target: number;
  category: string;
  categoryColor: string;
  critical: boolean;
};

type VelocityPoint = {
  month: string;
  skills: number;
  projected?: boolean;
  past: number | null;
  forecast: number | null;
};

const GRADIENTS = {
  blue: "linear-gradient(105deg, #4F46E5, #3B82F6)",
  orange: "linear-gradient(105deg, #F97316, #FB923C)",
  emerald: "linear-gradient(105deg, #10B981, #34D399)",
  violet: "linear-gradient(105deg, #8B5CF6, #A78BFA)",
};

const MILESTONES: RoadmapMilestone[] = [
  {
    id: 1,
    title: "Junior Software Engineer",
    status: "completed",
    salary: "₹4–7 LPA",
    timeframe: "0–1 year",
    readiness: 85,
    requiredSkills: ["Python", "DSA", "Git", "REST APIs", "SQL"],
    acquiredSkills: ["Python", "DSA", "Git", "SQL"],
    missingSkills: ["REST APIs"],
    description:
      "Build foundations. Complete a portfolio. Secure first role.",
    icon: GraduationCap,
    accent: "#10B981",
  },
  {
    id: 2,
    title: "Software Engineer",
    status: "active",
    salary: "₹8–14 LPA",
    timeframe: "1–3 years",
    readiness: 35,
    requiredSkills: ["React", "Node.js", "System Design", "Docker", "TypeScript"],
    acquiredSkills: ["React", "Node.js"],
    missingSkills: ["System Design", "Docker", "TypeScript"],
    description:
      "Contribute to team. Own modules. Deepen framework knowledge.",
    icon: Zap,
    accent: "#F97316",
  },
  {
    id: 3,
    title: "Senior Software Engineer",
    status: "locked",
    salary: "₹18–28 LPA",
    timeframe: "3–5 years",
    readiness: 10,
    requiredSkills: [
      "System Design (Advanced)",
      "Mentoring",
      "Cloud (AWS)",
      "CI/CD",
      "Leadership",
    ],
    acquiredSkills: [],
    missingSkills: [
      "System Design (Advanced)",
      "Mentoring",
      "Cloud (AWS)",
      "CI/CD",
      "Leadership",
    ],
    description:
      "Lead projects. Mentor juniors. Drive architectural decisions.",
    icon: Flame,
    accent: "#6366F1",
  },
  {
    id: 4,
    title: "Lead Software Engineer",
    status: "locked",
    salary: "₹28–45 LPA",
    timeframe: "5–8 years",
    readiness: 0,
    requiredSkills: [
      "Architecture",
      "Team Management",
      "Stakeholder Mgmt",
      "Product Thinking",
    ],
    acquiredSkills: [],
    missingSkills: [
      "Architecture",
      "Team Management",
      "Stakeholder Mgmt",
      "Product Thinking",
    ],
    description: "Lead multiple teams. Define high-level architecture.",
    icon: Trophy,
    accent: "#8B5CF6",
  },
  {
    id: 5,
    title: "Software Architect",
    status: "locked",
    salary: "₹50L+ LPA",
    timeframe: "8+ years",
    readiness: 0,
    requiredSkills: [
      "Enterprise Architecture",
      "Tech Strategy",
      "Cross-org Leadership",
    ],
    acquiredSkills: [],
    missingSkills: [
      "Enterprise Architecture",
      "Tech Strategy",
      "Cross-org Leadership",
    ],
    description:
      "Design and implement complex systems. Define tech strategy.",
    icon: Rocket,
    accent: "#0EA5E9",
  },
];

const KPI_CARDS: KpiCard[] = [
  {
    label: "Skills Acquired",
    value: "14",
    sub: "+3 this month",
    gradient: GRADIENTS.blue,
    icon: Sparkles,
  },
  {
    label: "Skill Gaps Remaining",
    value: "8",
    sub: "3 critical",
    gradient: GRADIENTS.orange,
    icon: Target,
  },
  {
    label: "Interview Readiness",
    value: "62%",
    sub: "↑ 12% vs last week",
    gradient: GRADIENTS.emerald,
    icon: Mic,
  },
  {
    label: "Target Salary Band",
    value: "₹18–24L",
    sub: "Mid-Level SDE",
    gradient: GRADIENTS.violet,
    icon: TrendingUp,
  },
];

const READINESS_DATA = [
  { stage: "Junior SDE", completed: 85, remaining: 15, active: false },
  { stage: "Mid-Level SDE", completed: 35, remaining: 65, active: true },
  { stage: "Senior SDE", completed: 10, remaining: 90, active: false },
  { stage: "Lead SDE", completed: 0, remaining: 100, active: false },
  { stage: "Architect", completed: 0, remaining: 100, active: false },
];

const VELOCITY_DATA: VelocityPoint[] = [
  { month: "Oct", skills: 4, past: 4, forecast: null },
  { month: "Nov", skills: 7, past: 7, forecast: null },
  { month: "Dec", skills: 9, past: 9, forecast: null },
  { month: "Jan", skills: 11, past: 11, forecast: null },
  { month: "Feb", skills: 14, past: 14, forecast: null },
  { month: "Mar", skills: 14, past: 14, forecast: 14 },
  { month: "Apr", skills: 17, projected: true, past: null, forecast: 17 },
];

const SALARY_DATA = [
  { stage: "Junior", min: 4, max: 7, range: 3, base: 4, current: true },
  { stage: "SDE", min: 8, max: 14, range: 6, base: 8, current: false },
  { stage: "Senior", min: 18, max: 28, range: 10, base: 18, current: false },
  { stage: "Lead", min: 28, max: 45, range: 17, base: 28, current: false },
  { stage: "Arch", min: 50, max: 80, range: 30, base: 50, current: false },
];

const SKILL_GAPS: SkillGap[] = [
  {
    skill: "System Design",
    current: 20,
    target: 100,
    category: "Architecture",
    categoryColor: "#8B5CF6",
    critical: true,
  },
  {
    skill: "Docker & K8s",
    current: 35,
    target: 100,
    category: "DevOps",
    categoryColor: "#0EA5E9",
    critical: true,
  },
  {
    skill: "TypeScript",
    current: 60,
    target: 100,
    category: "Language",
    categoryColor: "#6366F1",
    critical: false,
  },
  {
    skill: "React Advanced",
    current: 55,
    target: 100,
    category: "Frontend",
    categoryColor: "#F97316",
    critical: false,
  },
  {
    skill: "REST API Design",
    current: 80,
    target: 100,
    category: "Backend",
    categoryColor: "#10B981",
    critical: false,
  },
];

const ACTIVITY_LOG: ActivityRow[] = [
  {
    date: "Apr 22",
    event: "Completed Python Quiz",
    category: "Assessment",
    score: "92%",
    impact: "Skills +1",
    status: "completed",
    icon: FileText,
  },
  {
    date: "Apr 20",
    event: "AI Mock Interview — SDE-I",
    category: "Interview",
    score: "74%",
    impact: "Readiness +8%",
    status: "completed",
    icon: Mic,
  },
  {
    date: "Apr 18",
    event: "Enrolled: System Design Course",
    category: "Learning",
    score: "—",
    impact: "In Progress",
    status: "inProgress",
    icon: BookOpen,
  },
  {
    date: "Apr 15",
    event: "Resume Optimized for TCS",
    category: "Resume",
    score: "ATS: 82",
    impact: "Applied",
    status: "completed",
    icon: FileText,
  },
  {
    date: "Apr 10",
    event: "Unlocked: Docker Badge",
    category: "Skill",
    score: "—",
    impact: "Skills +1",
    status: "completed",
    icon: Medal,
  },
];

const CATEGORY_STYLES: Record<ActivityRow["category"], { bg: string; text: string }> = {
  Assessment: { bg: "rgba(139, 92, 246, 0.12)", text: "#7C3AED" },
  Interview: { bg: "rgba(249, 115, 22, 0.14)", text: "#EA580C" },
  Learning: { bg: "rgba(59, 130, 246, 0.12)", text: "#2563EB" },
  Resume: { bg: "rgba(79, 70, 229, 0.12)", text: "#4F46E5" },
  Skill: { bg: "rgba(16, 185, 129, 0.14)", text: "#059669" },
};

// ---------- Shared UI ----------

function SectionCard({
  children,
  className = "",
  style,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: "easeOut" }}
      className={`rounded-[20px] border border-[rgba(148,163,184,0.15)] bg-white shadow-[0_8px_24px_rgba(148,163,184,0.12)] ${className}`}
      style={style}
    >
      {children}
    </motion.div>
  );
}

function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-6">
      <div>
        <h3 className="font-display text-lg font-bold tracking-tight text-[#0F172A]">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-1 text-sm text-[#64748B]">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

// ---------- HERO ----------

function HeroBanner({
  selectedRole,
  inputRole,
  setInputRole,
  onUpdate,
  progress,
}: {
  selectedRole: string;
  inputRole: string;
  setInputRole: (v: string) => void;
  onUpdate: () => void;
  progress: number;
}) {
  const circumference = 2 * Math.PI * 42;
  const dashLength = (progress / 100) * circumference;

  const stats = [
    { label: "Current Stage", value: "Junior SDE", color: "#FDBA74" },
    { label: "Next Milestone", value: "Mid-Level SDE", color: "#C4B5FD" },
    { label: "Est. Time", value: "8–12 months", color: "#6EE7B7" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative mb-6 overflow-hidden rounded-[24px]"
      style={{
        background:
          "linear-gradient(135deg, #1E1B4B 0%, #312E81 40%, #4338CA 100%)",
        minHeight: 220,
      }}
    >
      <div
        className="roadmap-orb pointer-events-none absolute"
        style={{
          top: -60,
          right: 140,
          width: 260,
          height: 260,
          background:
            "radial-gradient(circle, rgba(139,92,246,0.42) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      />
      <div
        className="roadmap-orb pointer-events-none absolute"
        style={{
          bottom: -40,
          right: 360,
          width: 200,
          height: 200,
          background:
            "radial-gradient(circle, rgba(249,115,22,0.32) 0%, transparent 70%)",
          borderRadius: "50%",
          animationDelay: "2s",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />

      <div className="relative z-10 flex flex-col gap-8 p-8 md:flex-row md:items-center md:justify-between md:p-10">
        <div className="max-w-xl">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-md"
          >
            <Sparkles size={12} /> Career Path
          </span>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white md:text-[34px]">
            Your Career Roadmap
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70">
            AI-generated path for{" "}
            <strong className="text-white">{selectedRole}</strong>. Track
            milestones, skill velocity, and salary growth.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md">
              <Target size={14} className="text-white/70" />
              <input
                placeholder="e.g. Frontend Engineer, Data Scientist"
                value={inputRole}
                onChange={(e) => setInputRole(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onUpdate();
                }}
                className="w-[260px] bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
              />
            </div>
            <button
              onClick={onUpdate}
              className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgba(249,115,22,0.8)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
              style={{ background: GRADIENTS.orange }}
            >
              <Zap size={14} /> Update Path
            </button>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-center">
            <div className="relative h-[120px] w-[120px]">
              <svg width="120" height="120" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F97316" />
                    <stop offset="100%" stopColor="#FB923C" />
                  </linearGradient>
                </defs>
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="8"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="url(#arcGrad)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: `0 ${circumference}` }}
                  animate={{
                    strokeDasharray: `${dashLength} ${circumference - dashLength}`,
                  }}
                  transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
                  style={{
                    transform: "rotate(-90deg)",
                    transformOrigin: "50% 50%",
                  }}
                />
                <text
                  x="50"
                  y="48"
                  textAnchor="middle"
                  style={{
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: 18,
                    fontWeight: 700,
                    fill: "white",
                  }}
                >
                  {progress}%
                </text>
                <text
                  x="50"
                  y="64"
                  textAnchor="middle"
                  style={{
                    fontSize: 9,
                    fill: "rgba(255,255,255,0.55)",
                    letterSpacing: "0.12em",
                  }}
                >
                  READY
                </text>
              </svg>
            </div>
            <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-white/60">
              Overall Progress
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="min-w-[180px] rounded-[14px] border border-white/12 bg-white/10 px-4 py-2.5 backdrop-blur-md"
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">
                  {stat.label}
                </div>
                <div
                  className="font-display text-[14px] font-bold leading-tight"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------- KPI STRIP ----------

function KpiStrip() {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {KPI_CARDS.map((kpi, i) => {
        const Icon = kpi.icon;
        return (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.08, duration: 0.45 }}
            className="relative overflow-hidden rounded-[20px] p-6 text-white shadow-[0_12px_30px_-12px_rgba(15,23,42,0.3)]"
            style={{ background: kpi.gradient }}
          >
            <div
              className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full"
              style={{ background: "rgba(255,255,255,0.14)" }}
            />
            <div
              className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full"
              style={{ background: "rgba(255,255,255,0.08)" }}
            />
            <div className="relative flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
                  {kpi.label}
                </p>
                <p
                  className="mt-2 font-display text-[32px] font-extrabold leading-none tracking-tight"
                  style={{ fontFamily: "var(--font-geist-mono), monospace" }}
                >
                  {kpi.value}
                </p>
                <p className="mt-2 text-xs font-medium text-white/85">{kpi.sub}</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                <Icon size={20} className="text-white" />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ---------- READINESS BAR CHART ----------

function ReadinessChart() {
  return (
    <SectionCard delay={0.1} className="flex h-full flex-col">
      <SectionHeader
        title="Milestone Readiness"
        subtitle="Your progress per career stage"
        right={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(148,163,184,0.25)] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] shadow-sm transition hover:bg-[#F8F9FD]"
          >
            This Month <ChevronDown size={12} />
          </button>
        }
      />
      <div className="flex-1 px-4 pb-5 pt-4">
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={READINESS_DATA}
              layout="vertical"
              margin={{ top: 8, right: 40, left: 10, bottom: 0 }}
              barCategoryGap={14}
            >
              <defs>
                <linearGradient id="readinessFill" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#4F46E5" />
                  <stop offset="100%" stopColor="#6366F1" />
                </linearGradient>
                <linearGradient id="readinessActive" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#F97316" />
                  <stop offset="100%" stopColor="#FB923C" />
                </linearGradient>
                <pattern
                  id="readinessHatch"
                  patternUnits="userSpaceOnUse"
                  width="6"
                  height="6"
                  patternTransform="rotate(45)"
                >
                  <rect width="6" height="6" fill="#F1F5F9" />
                  <line x1="0" y1="0" x2="0" y2="6" stroke="#E2E8F0" strokeWidth="2" />
                </pattern>
              </defs>
              <CartesianGrid
                horizontal={false}
                stroke="rgba(148,163,184,0.15)"
                strokeDasharray="4 4"
              />
              <XAxis
                type="number"
                domain={[0, 100]}
                hide
              />
              <YAxis
                type="category"
                dataKey="stage"
                width={100}
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "#0F172A",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
              <Tooltip
                cursor={{ fill: "rgba(79,70,229,0.06)" }}
                content={(props) => {
                  const { active, payload, label } = props as unknown as {
                    active?: boolean;
                    payload?: Array<{ payload: (typeof READINESS_DATA)[number] }>;
                    label?: string;
                  };
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-[rgba(148,163,184,0.2)] bg-white px-3 py-2 text-xs shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                      <div className="font-semibold text-[#0F172A]">
                        {label}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[#4F46E5]">
                        <span className="h-2 w-2 rounded-full bg-[#4F46E5]" />
                        Completed: <strong>{item.completed}%</strong>
                      </div>
                      <div className="flex items-center gap-2 text-[#94A3B8]">
                        <span className="h-2 w-2 rounded-full bg-[#CBD5E1]" />
                        Remaining: {item.remaining}%
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="completed"
                stackId="r"
                radius={[8, 0, 0, 8]}
                barSize={22}
              >
                {READINESS_DATA.map((d) => (
                  <Cell
                    key={`c-${d.stage}`}
                    fill={d.active ? "url(#readinessActive)" : "url(#readinessFill)"}
                  />
                ))}
              </Bar>
              <Bar
                dataKey="remaining"
                stackId="r"
                fill="url(#readinessHatch)"
                radius={[0, 8, 8, 0]}
                barSize={22}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[rgba(148,163,184,0.15)] pt-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: GRADIENTS.blue }}
            />
            Completed
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: GRADIENTS.orange }}
            />
            Current stage
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#E2E8F0]" />
            Remaining
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[rgba(16,185,129,0.12)] px-3 py-1 text-xs font-semibold text-[#059669]">
            <BadgeCheck size={12} /> 1 of 5 milestones closed
          </span>
        </div>
      </div>
    </SectionCard>
  );
}

// ---------- SKILL VELOCITY CHART ----------

function VelocityChart() {
  return (
    <SectionCard delay={0.18} className="flex h-full flex-col">
      <SectionHeader
        title="Skill Velocity"
        subtitle="Skills acquired over time + projection"
        right={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(16,185,129,0.12)] px-3 py-1 text-xs font-semibold text-[#059669]">
            <TrendingUp size={12} /> +3 new this month
          </span>
        }
      />
      <div className="flex-1 px-4 pb-5 pt-4">
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={VELOCITY_DATA}
              margin={{ top: 20, right: 16, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="velocityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="rgba(148,163,184,0.15)"
                strokeDasharray="4 4"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748B", fontSize: 11, fontWeight: 600 }}
              />
              <YAxis hide domain={[0, "dataMax + 4"]} />
              <Tooltip
                cursor={{
                  stroke: "#4F46E5",
                  strokeDasharray: "4 4",
                  strokeWidth: 1,
                }}
                content={(props) => {
                  const { active, payload, label } = props as unknown as {
                    active?: boolean;
                    payload?: Array<{ value: number; payload: VelocityPoint }>;
                    label?: string;
                  };
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload;
                  const color = point.projected ? "#8B5CF6" : "#4F46E5";
                  return (
                    <div className="rounded-xl border border-[rgba(148,163,184,0.2)] bg-white px-3 py-2 text-xs shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                      <div className="font-semibold text-[#0F172A]">{label}</div>
                      <div
                        className="mt-1 text-lg font-bold"
                        style={{
                          fontFamily: "var(--font-geist-mono), monospace",
                          color,
                        }}
                      >
                        {point.skills} skills
                      </div>
                      {point.projected ? (
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8B5CF6]">
                          Projected
                        </div>
                      ) : null}
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="past"
                stroke="#4F46E5"
                strokeWidth={2.5}
                fill="url(#velocityFill)"
                connectNulls={false}
                dot={(dotProps) => {
                  const { cx, cy, index } = dotProps as {
                    cx?: number;
                    cy?: number;
                    index?: number;
                  };
                  if (cx == null || cy == null) {
                    return <g key={`dot-past-${index ?? 0}`} />;
                  }
                  return (
                    <g key={`dot-past-${index ?? 0}`}>
                      <circle cx={cx} cy={cy} r={5.5} fill="white" stroke="#4F46E5" strokeWidth={2.5} />
                    </g>
                  );
                }}
                activeDot={{ r: 7, fill: "#4F46E5", stroke: "white", strokeWidth: 2 }}
                isAnimationActive
                animationDuration={900}
              />
              <Area
                type="monotone"
                dataKey="forecast"
                stroke="#8B5CF6"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                fill="transparent"
                isAnimationActive={false}
                connectNulls={false}
                dot={(dotProps) => {
                  const { cx, cy, payload, index } = dotProps as {
                    cx?: number;
                    cy?: number;
                    payload?: VelocityPoint;
                    index?: number;
                  };
                  if (cx == null || cy == null || !payload?.projected) {
                    return <g key={`dot-fc-${index ?? 0}`} />;
                  }
                  return (
                    <g key={`dot-fc-${index ?? 0}`}>
                      <circle cx={cx} cy={cy} r={5.5} fill="white" stroke="#8B5CF6" strokeWidth={2.5} />
                    </g>
                  );
                }}
                activeDot={{ r: 7, fill: "#8B5CF6", stroke: "white", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-[rgba(148,163,184,0.15)] pt-4 text-xs">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 font-medium text-[#64748B]">
              <span className="h-2.5 w-5 rounded-full bg-[#4F46E5]" /> Acquired
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-[#64748B]">
              <span className="h-[2px] w-5 border-t-2 border-dashed border-[#8B5CF6]" />{" "}
              Projected
            </span>
          </div>
          <div className="text-[#64748B]">
            Avg. velocity:{" "}
            <strong
              className="text-[#0F172A]"
              style={{ fontFamily: "var(--font-geist-mono), monospace" }}
            >
              2.1 skills/mo
            </strong>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

// ---------- MILESTONE TIMELINE ----------

function StatusChip({ status }: { status: MilestoneStatus }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(16,185,129,0.15)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#047857]">
        <CheckCircle2 size={12} /> Completed
      </span>
    );
  }
  if (status === "active") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
        style={{ background: GRADIENTS.orange }}
      >
        <Flame size={12} /> Current
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(148,163,184,0.15)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
      <Lock size={11} /> Locked
    </span>
  );
}

function MilestoneCard({
  milestone,
  index,
  isLast,
  expanded,
  onToggle,
}: {
  milestone: RoadmapMilestone;
  index: number;
  isLast: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const Icon = milestone.icon;
  const statusStyles: Record<MilestoneStatus, React.CSSProperties> = {
    completed: {
      background: "linear-gradient(135deg, #ECFDF5, #D1FAE5)",
      borderLeft: "4px solid #10B981",
    },
    active: {
      background: "linear-gradient(135deg, #FFF7ED, #FFEDD5)",
      borderLeft: "4px solid #F97316",
    },
    locked: {
      background: "#FFFFFF",
      borderLeft: "4px solid #E5E7EB",
    },
  };

  const titleColor =
    milestone.status === "locked" ? "#94A3B8" : "#0F172A";

  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 + index * 0.08, duration: 0.45 }}
        className={`relative overflow-hidden rounded-[20px] border border-[rgba(148,163,184,0.12)] shadow-[0_8px_24px_rgba(148,163,184,0.12)] ${
          milestone.status === "active" ? "roadmap-milestone-active" : ""
        }`}
        style={statusStyles[milestone.status]}
      >
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-start gap-4 px-6 py-5 text-left"
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white"
            style={{
              background:
                milestone.status === "locked"
                  ? "linear-gradient(135deg, #E5E7EB, #CBD5E1)"
                  : milestone.status === "completed"
                  ? "linear-gradient(135deg, #10B981, #34D399)"
                  : GRADIENTS.orange,
              boxShadow:
                milestone.status === "active"
                  ? "0 8px 24px -8px rgba(249,115,22,0.6)"
                  : "none",
            }}
          >
            {milestone.status === "locked" ? (
              <Lock size={18} />
            ) : (
              <Icon size={20} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4
                className="font-display text-[16px] font-bold tracking-tight"
                style={{ color: titleColor }}
              >
                {milestone.title}
              </h4>
              <StatusChip status={milestone.status} />
              <span
                className="rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] font-semibold text-[#4F46E5] shadow-sm"
                style={{ fontFamily: "var(--font-geist-mono), monospace" }}
              >
                {milestone.salary}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-2.5 py-0.5 text-[11px] font-semibold text-[#64748B]">
                <Clock size={11} /> {milestone.timeframe}
              </span>
            </div>
            <p className="mt-1.5 text-[13px] text-[#64748B]">
              {milestone.description}
            </p>

            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="relative h-[6px] w-full overflow-hidden rounded-full bg-[#E5E7EB]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${milestone.readiness}%` }}
                    transition={{
                      duration: 1,
                      delay: 0.4 + index * 0.08,
                      ease: "easeOut",
                    }}
                    className="absolute left-0 top-0 h-full rounded-full"
                    style={{
                      background:
                        milestone.status === "completed"
                          ? "linear-gradient(90deg, #10B981, #34D399)"
                          : milestone.status === "active"
                          ? "linear-gradient(90deg, #F97316, #FB923C)"
                          : "linear-gradient(90deg, #4F46E5, #8B5CF6)",
                    }}
                  />
                </div>
              </div>
              <span
                className="text-[12px] font-bold"
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  color:
                    milestone.status === "locked" ? "#94A3B8" : "#0F172A",
                }}
              >
                {milestone.readiness}%
              </span>
            </div>
          </div>

          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="mt-1 shrink-0 text-[#94A3B8]"
          >
            <ChevronDown size={18} />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="grid gap-4 border-t border-white/50 px-6 py-5 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#059669]">
                    Acquired ({milestone.acquiredSkills.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {milestone.acquiredSkills.length ? (
                      milestone.acquiredSkills.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1 rounded-full bg-[rgba(16,185,129,0.16)] px-2.5 py-1 text-[11px] font-semibold text-[#047857]"
                        >
                          <CheckCircle2 size={11} /> {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-[12px] text-[#94A3B8]">
                        None yet
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#E11D48]">
                    Missing ({milestone.missingSkills.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {milestone.missingSkills.length ? (
                      milestone.missingSkills.map((s) => (
                        <span
                          key={s}
                          className="group inline-flex items-center gap-1 rounded-full border border-[rgba(244,63,94,0.4)] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#E11D48] transition hover:bg-[rgba(244,63,94,0.08)]"
                        >
                          {s}
                          <span className="opacity-60 transition group-hover:opacity-100">
                            · Learn
                            <ArrowRight size={10} className="inline" />
                          </span>
                        </span>
                      ))
                    ) : (
                      <span className="text-[12px] text-[#94A3B8]">
                        All required skills acquired
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>

      {!isLast ? (
        <div className="flex justify-start pl-[34px]">
          <div className="flex flex-col items-center py-2">
            <div
              className="h-5 w-px"
              style={{
                borderLeftWidth: 2,
                borderLeftStyle:
                  milestone.status === "completed" ? "solid" : "dashed",
                borderLeftColor:
                  milestone.status === "completed"
                    ? "#10B981"
                    : milestone.status === "active"
                    ? "#F97316"
                    : "#E5E7EB",
              }}
            />
            <div
              className="h-3 w-3 rounded-full border-2"
              style={{
                borderColor:
                  milestone.status === "completed"
                    ? "#10B981"
                    : milestone.status === "active"
                    ? "#F97316"
                    : "#CBD5E1",
                background:
                  milestone.status === "completed"
                    ? "#10B981"
                    : milestone.status === "active"
                    ? "white"
                    : "white",
                boxShadow:
                  milestone.status === "active"
                    ? "0 0 0 4px rgba(249,115,22,0.18)"
                    : "none",
              }}
            />
            <div
              className="h-5 w-px"
              style={{
                borderLeftWidth: 2,
                borderLeftStyle: "dashed",
                borderLeftColor: "#E5E7EB",
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MilestoneTimeline({
  expandedId,
  onToggle,
}: {
  expandedId: number | null;
  onToggle: (id: number) => void;
}) {
  return (
    <SectionCard delay={0.22} className="flex h-full flex-col">
      <SectionHeader
        title="Career Milestones"
        subtitle="Click a stage to see the skills breakdown"
        right={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(148,163,184,0.25)] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A]">
            <Info size={12} /> AI-generated
          </span>
        }
      />
      <div className="px-6 pb-6 pt-5">
        <div className="flex flex-col">
          {MILESTONES.map((m, i) => (
            <MilestoneCard
              key={m.id}
              milestone={m}
              index={i}
              isLast={i === MILESTONES.length - 1}
              expanded={expandedId === m.id || m.status === "active"}
              onToggle={() => onToggle(m.id)}
            />
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

// ---------- SALARY GROWTH CHART ----------

function SalaryChart() {
  return (
    <SectionCard delay={0.26} className="flex flex-col">
      <SectionHeader
        title="Salary Growth Projection"
        subtitle="Expected bands per career stage (Indian market)"
      />
      <div className="px-4 pb-5 pt-4">
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={SALARY_DATA}
              margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
              barCategoryGap={22}
            >
              <defs>
                <linearGradient id="salaryFuture" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
                <linearGradient id="salaryCurrent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F97316" />
                  <stop offset="100%" stopColor="#FB923C" />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="rgba(148,163,184,0.15)"
                strokeDasharray="4 4"
                vertical={false}
              />
              <XAxis
                dataKey="stage"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748B", fontSize: 11, fontWeight: 600 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94A3B8", fontSize: 10 }}
                tickFormatter={(v) => `₹${v}L`}
                width={40}
              />
              <Tooltip
                cursor={{ fill: "rgba(79,70,229,0.06)" }}
                content={(props) => {
                  const { active, payload } = props as unknown as {
                    active?: boolean;
                    payload?: Array<{ payload: (typeof SALARY_DATA)[number] }>;
                  };
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-[rgba(148,163,184,0.2)] bg-white px-3 py-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                      <div className="text-[12px] font-bold text-[#0F172A]">
                        {d.stage} SDE
                      </div>
                      <div className="text-[11px] text-[#64748B]">
                        Salary Range
                      </div>
                      <div
                        className="mt-1 text-[18px] font-bold text-[#4F46E5]"
                        style={{ fontFamily: "var(--font-geist-mono), monospace" }}
                      >
                        ₹{d.min}L — ₹{d.max}L
                      </div>
                      {d.current ? (
                        <div className="mt-0.5 text-[11px] font-semibold text-[#F97316]">
                          You are here
                        </div>
                      ) : (
                        <div className="mt-0.5 text-[11px] font-semibold text-[#10B981]">
                          ↑ +₹{d.max - 7}L from current band
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Bar dataKey="base" stackId="s" fill="transparent" />
              <Bar dataKey="range" stackId="s" radius={[8, 8, 0, 0]} barSize={32}>
                {SALARY_DATA.map((d) => (
                  <Cell
                    key={`salary-${d.stage}`}
                    fill={d.current ? "url(#salaryCurrent)" : "url(#salaryFuture)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[rgba(148,163,184,0.15)] pt-3 text-[11px] font-medium text-[#64748B]">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: GRADIENTS.orange }}
            />
            Current band
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                background: "linear-gradient(180deg, #4F46E5, #8B5CF6)",
              }}
            />
            Future projection
          </span>
          <span className="ml-auto">Source: PayScale · Glassdoor India</span>
        </div>
      </div>
    </SectionCard>
  );
}

// ---------- SKILL GAP BARS ----------

function SkillGapBars() {
  const critical = SKILL_GAPS.filter((s) => s.critical).length;
  const moderate = SKILL_GAPS.length - critical;

  return (
    <SectionCard delay={0.3}>
      <SectionHeader
        title="Skill Gap Analysis"
        subtitle="For: Mid-Level SDE"
        right={
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(244,63,94,0.12)] px-2.5 py-1 text-[11px] font-semibold text-[#E11D48]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F43F5E]" />
              {critical} Critical
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(245,158,11,0.14)] px-2.5 py-1 text-[11px] font-semibold text-[#B45309]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
              {moderate} Moderate
            </span>
          </div>
        }
      />
      <div className="space-y-4 px-6 pb-6 pt-5">
        {SKILL_GAPS.map((gap, i) => {
          const fill = gap.critical
            ? "linear-gradient(90deg, #F43F5E, #FB7185)"
            : gap.current >= 70
            ? "linear-gradient(90deg, #10B981, #34D399)"
            : "linear-gradient(90deg, #F97316, #FBB24B)";

          return (
            <div key={gap.skill}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[13px] font-semibold text-[#0F172A]">
                    {gap.skill}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      background: `${gap.categoryColor}1F`,
                      color: gap.categoryColor,
                    }}
                  >
                    {gap.category}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[12px] font-bold text-[#0F172A]"
                    style={{ fontFamily: "var(--font-geist-mono), monospace" }}
                  >
                    {gap.current}%
                  </span>
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-[#4F46E5] hover:underline"
                  >
                    Learn <ArrowRight size={10} className="inline" />
                  </button>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${gap.current}%` }}
                  transition={{
                    duration: 0.9,
                    delay: 0.35 + i * 0.08,
                    ease: "easeOut",
                  }}
                  className="h-full rounded-full"
                  style={{ background: fill }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ---------- AI RECOMMENDATION CARD ----------

function AiRecommendation() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.45 }}
      className="relative overflow-hidden rounded-[20px] border border-[rgba(79,70,229,0.2)] p-6"
      style={{
        background: "linear-gradient(105deg, #EEF2FF, #E0E7FF)",
        borderLeft: "4px solid #4F46E5",
      }}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(79,70,229,0.15), transparent 70%)",
        }}
      />
      <div className="relative flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white"
            style={{ background: GRADIENTS.blue }}
          >
            <Lightbulb size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-display text-[15px] font-bold text-[#0F172A]">
                AI Recommendation
              </h4>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#4F46E5] shadow-sm">
                <Sparkles size={10} /> Priority
              </span>
            </div>
            <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[#334155]">
              Complete the{" "}
              <strong className="text-[#0F172A]">System Design course</strong>{" "}
              (Educative) to unlock the Senior SDE milestone. Estimated time:{" "}
              <strong>6–8 hours</strong>. This single skill closes your biggest
              gap.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgba(79,70,229,0.7)] transition hover:scale-[1.02]"
          style={{ background: GRADIENTS.blue }}
        >
          Start Learning <ArrowRight size={14} />
        </button>
      </div>
    </motion.div>
  );
}

// ---------- ACTIVITY LOG ----------

function ActivityLog() {
  return (
    <SectionCard delay={0.4}>
      <SectionHeader
        title="Activity Log"
        subtitle="Track your learning journey"
        right={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(148,163,184,0.25)] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] hover:bg-[#F8F9FD]"
            >
              <Filter size={12} /> Filter
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F172A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1E293B]"
            >
              <Download size={12} /> Export
            </button>
          </div>
        }
      />

      <div className="mt-4 px-2 pb-4">
        <div className="overflow-hidden rounded-2xl">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#F8F9FD] text-[11px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
                <th className="px-5 py-3 text-left font-bold">Date</th>
                <th className="px-5 py-3 text-left font-bold">Activity</th>
                <th className="px-5 py-3 text-left font-bold">Category</th>
                <th className="px-5 py-3 text-left font-bold">Score</th>
                <th className="px-5 py-3 text-left font-bold">Impact</th>
                <th className="px-5 py-3 text-left font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {ACTIVITY_LOG.map((row, i) => {
                const Icon = row.icon;
                const catStyle = CATEGORY_STYLES[row.category];
                return (
                  <motion.tr
                    key={row.event}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 + i * 0.05 }}
                    className="border-b border-[#F1F5F9] bg-white transition hover:bg-[#F8F9FD]"
                  >
                    <td className="whitespace-nowrap px-5 py-4 text-[12px] font-medium text-[#64748B]">
                      {row.date}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#475569]">
                          <Icon size={15} />
                        </div>
                        <span className="text-[13px] font-semibold text-[#0F172A]">
                          {row.event}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
                        style={{
                          background: catStyle.bg,
                          color: catStyle.text,
                        }}
                      >
                        {row.category}
                      </span>
                    </td>
                    <td
                      className="px-5 py-4 text-[13px] font-semibold text-[#0F172A]"
                      style={{ fontFamily: "var(--font-geist-mono), monospace" }}
                    >
                      {row.score}
                    </td>
                    <td className="px-5 py-4 text-[13px] font-medium text-[#475569]">
                      {row.impact}
                    </td>
                    <td className="px-5 py-4">
                      {row.status === "completed" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(16,185,129,0.15)] px-2.5 py-1 text-[11px] font-semibold text-[#047857]">
                          <CheckCircle2 size={12} /> Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(245,158,11,0.18)] px-2.5 py-1 text-[11px] font-semibold text-[#B45309]">
                          <Clock size={12} /> In Progress
                        </span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </SectionCard>
  );
}

// ---------- MAIN PAGE ----------

export default function RoadmapPage() {
  const [selectedRole, setSelectedRole] = useState(DEFAULT_TARGET);
  const [inputRole, setInputRole] = useState("");
  const [expandedMilestone, setExpandedMilestone] = useState<number | null>(2);

  // Keep the API/hook wired so real data can flow later.
  useCareer(selectedRole);

  const overallProgress = useMemo(() => {
    const total = MILESTONES.reduce((acc, m) => acc + m.readiness, 0);
    return Math.round(total / MILESTONES.length);
  }, []);

  const handleUpdate = () => {
    if (inputRole.trim()) {
      setSelectedRole(inputRole.trim());
      setInputRole("");
    }
  };

  const handleToggle = (id: number) => {
    setExpandedMilestone((curr) => (curr === id ? null : id));
  };

  return (
    <div className="min-h-full bg-[#F8F9FD]">
      <div className="mx-auto max-w-[1360px] px-6 py-8 lg:px-8">
        <HeroBanner
          selectedRole={selectedRole}
          inputRole={inputRole}
          setInputRole={setInputRole}
          onUpdate={handleUpdate}
          progress={overallProgress}
        />

        <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ReadinessChart />
          <VelocityChart />
        </div>

        <KpiStrip />

        <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <MilestoneTimeline
              expandedId={expandedMilestone}
              onToggle={handleToggle}
            />
          </div>
          <div className="flex flex-col gap-5 xl:col-span-2">
            <SalaryChart />
            <SkillGapBars />
          </div>
        </div>

        <div className="mb-6">
          <AiRecommendation />
        </div>

        <ActivityLog />
      </div>
    </div>
  );
}
