import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Calendar,
  Zap,
  Star,
  Eye,
  Clock,
  RefreshCw,
} from "lucide-react";
import type { Category, Priority } from "@/data/notifications.mock";

export const CATEGORY_CONFIG: Record<
  Category,
  { label: string; icon: LucideIcon; color: string; bg: string }
> = {
  applications: {
    label: "Applications",
    icon: Briefcase,
    color: "#6366F1",
    bg: "#EEF2FF",
  },
  interviews: {
    label: "Interviews",
    icon: Calendar,
    color: "#F97316",
    bg: "#FFF7ED",
  },
  job_alerts: {
    label: "Job Alerts",
    icon: Zap,
    color: "#10B981",
    bg: "#ECFDF5",
  },
  career: { label: "Career", icon: Star, color: "#8B5CF6", bg: "#F5F3FF" },
  recruiter: {
    label: "Recruiter",
    icon: Eye,
    color: "#EC4899",
    bg: "#FDF2F8",
  },
  reminders: {
    label: "Reminders",
    icon: Clock,
    color: "#F59E0B",
    bg: "#FFFBEB",
  },
  system: {
    label: "System",
    icon: RefreshCw,
    color: "#6B7280",
    bg: "#F9FAFB",
  },
};

export const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  critical: {
    label: "Critical",
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "#FECACA",
    dot: "#EF4444",
  },
  high: {
    label: "High",
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
    dot: "#F59E0B",
  },
  medium: {
    label: "Medium",
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    dot: "#3B82F6",
  },
  low: {
    label: "Low",
    color: "#6B7280",
    bg: "#F9FAFB",
    border: "#E5E7EB",
    dot: "#9CA3AF",
  },
};

export const PRIORITY_ORDER: Priority[] = [
  "critical",
  "high",
  "medium",
  "low",
];
