export type Priority = "critical" | "high" | "medium" | "low";

export type Category =
  | "applications"
  | "interviews"
  | "job_alerts"
  | "career"
  | "recruiter"
  | "reminders"
  | "system";

export interface Notification {
  id: string;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  timestamp: string;
  isRead: boolean;
  isSnoozed: boolean;
  isPinned: boolean;
  actionLabel?: string;
  actionHref?: string;
  secondaryAction?: string;
  aiReason?: string;
  aiRecommendation?: string;
  relevanceScore?: number;
  meta?: Record<string, string>;
  avatarUrl?: string;
  avatarFallback?: string;
}

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    title: "Interview Today at 11:30 AM",
    description:
      "Frontend Engineer interview with Amazon is in 2 hours. Join link is ready.",
    category: "interviews",
    priority: "critical",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    isRead: false,
    isSnoozed: false,
    isPinned: true,
    actionLabel: "Join Interview",
    actionHref: "#",
    secondaryAction: "View Details",
    aiReason:
      "This interview was scheduled 3 days ago based on your application.",
    aiRecommendation:
      "Review the System Design questions we practiced in your last mock interview.",
    relevanceScore: 99,
    meta: { company: "Amazon", role: "Frontend Engineer", time: "11:30 AM" },
    avatarFallback: "AM",
  },
  {
    id: "n2",
    title: "Application Deadline Today",
    description:
      "Your application to Razorpay — Backend Engineer closes at 11:59 PM tonight.",
    category: "applications",
    priority: "critical",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    isRead: false,
    isSnoozed: false,
    isPinned: false,
    actionLabel: "Complete Application",
    actionHref: "#",
    aiReason: "You started this application 5 days ago but did not submit.",
    relevanceScore: 97,
    meta: { company: "Razorpay", role: "Backend Engineer" },
    avatarFallback: "RZ",
  },
  {
    id: "n3",
    title: "Recruiter Message from Infosys",
    description:
      "Hiring Manager Priya K. sent you a message regarding the SDE-I opening.",
    category: "recruiter",
    priority: "critical",
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    isRead: false,
    isSnoozed: false,
    isPinned: false,
    actionLabel: "Reply Now",
    actionHref: "#",
    aiRecommendation:
      "Respond within 2 hours to maintain your Reputation Score.",
    relevanceScore: 95,
    meta: { company: "Infosys", recruiter: "Priya K." },
    avatarFallback: "IN",
  },
  {
    id: "n4",
    title: "You Were Shortlisted!",
    description:
      "Accenture shortlisted you for React Developer role. Interview round expected soon.",
    category: "applications",
    priority: "high",
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    isRead: false,
    isSnoozed: false,
    isPinned: false,
    actionLabel: "View Application",
    actionHref: "#",
    aiReason: "Your ATS score of 88/100 put you in the top 12% of applicants.",
    relevanceScore: 91,
    meta: {
      company: "Accenture",
      role: "React Developer",
      atsScore: "88/100",
    },
    avatarFallback: "AC",
  },
  {
    id: "n5",
    title: "Interview Scheduled — TCS",
    description:
      "Technical Round 1 scheduled for April 26 at 2:00 PM. Prepare DSA + System Design.",
    category: "interviews",
    priority: "high",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    isRead: false,
    isSnoozed: false,
    isPinned: false,
    actionLabel: "Add to Calendar",
    secondaryAction: "Practice Now",
    aiRecommendation:
      "Focus on Array problems and Low-Level Design questions based on the JD.",
    relevanceScore: 88,
    meta: { company: "TCS", role: "SDE-I", date: "Apr 26", time: "2:00 PM" },
    avatarFallback: "TC",
  },
  {
    id: "n6",
    title: "ATS Score Improved by 9 Points",
    description:
      "After your resume update, your score for Backend Dev at Razorpay went from 73 → 82.",
    category: "career",
    priority: "high",
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    isRead: false,
    isSnoozed: false,
    isPinned: false,
    actionLabel: "View Resume",
    aiReason: "Adding Docker and REST API keywords triggered this score jump.",
    relevanceScore: 82,
    meta: { previousScore: "73", newScore: "82", company: "Razorpay" },
    avatarFallback: "AI",
  },
  {
    id: "n7",
    title: "New Job Match: React Engineer @ Accenture",
    description:
      "94% skill match. ₹12–18 LPA · Hybrid · Bangalore. 3 days left to apply.",
    category: "job_alerts",
    priority: "medium",
    timestamp: new Date(Date.now() - 259200000).toISOString(),
    isRead: true,
    isSnoozed: false,
    isPinned: false,
    actionLabel: "Apply Now",
    secondaryAction: "Save Job",
    aiReason:
      "Matched on React, TypeScript, Node.js and your location preference.",
    relevanceScore: 94,
    meta: {
      company: "Accenture",
      role: "React Engineer",
      match: "94%",
      salary: "₹12–18 LPA",
    },
    avatarFallback: "AC",
  },
  {
    id: "n8",
    title: "Profile Viewed by Google Recruiter",
    description:
      "A recruiter from Google viewed your profile 3 times in the last 24 hours.",
    category: "recruiter",
    priority: "medium",
    timestamp: new Date(Date.now() - 345600000).toISOString(),
    isRead: true,
    isSnoozed: false,
    isPinned: false,
    actionLabel: "Update Profile",
    aiRecommendation:
      "Your GitHub link is missing. Add it to increase recruiter conversion by ~34%.",
    relevanceScore: 78,
    avatarFallback: "GO",
  },
  {
    id: "n9",
    title: "Skill Gap Insight: System Design",
    description:
      "Closing this gap could unlock 14 new Senior SDE roles in your profile feed.",
    category: "career",
    priority: "low",
    timestamp: new Date(Date.now() - 604800000).toISOString(),
    isRead: true,
    isSnoozed: false,
    isPinned: false,
    actionLabel: "Start Learning",
    aiReason:
      "System Design appears in 89% of Senior SDE job descriptions you matched.",
    relevanceScore: 65,
    avatarFallback: "AI",
  },
  {
    id: "n10",
    title: "Resume Uploaded Successfully",
    description:
      "Resume_v3.pdf was parsed. 22 skills extracted. ATS score: 74/100.",
    category: "system",
    priority: "low",
    timestamp: new Date(Date.now() - 691200000).toISOString(),
    isRead: true,
    isSnoozed: false,
    isPinned: false,
    actionLabel: "View Analysis",
    relevanceScore: 40,
    avatarFallback: "SH",
  },
];
