"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  FileText,
  Brain,
  GraduationCap,
  User,
  Target,
  Plug2,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Intelligence Hub", icon: LayoutDashboard },
  { href: "/jobs", label: "Job Search", icon: Search },
  { href: "/resume", label: "Resume Optimizer", icon: FileText },
  { href: "/interviews", label: "Mock Interviews", icon: Brain },
  { href: "/roadmap", label: "Career Path", icon: GraduationCap },
  { href: "/skills", label: "Skill Gap", icon: Target },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/integrations", label: "Integrations", icon: Plug2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
          <LayoutDashboard className="w-5 h-5" />
        </div>
        <h1 className="font-extrabold text-xl tracking-tight">SmartHire AI</h1>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all",
              pathname === item.href || pathname.startsWith(item.href + "/")
                ? "bg-primary/10 text-primary"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 mt-auto">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-10 h-10 border-2 border-white dark:border-slate-700">
              <AvatarImage src="https://github.com/shadcn.png" alt="User" />
              <AvatarFallback>AK</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold text-sm">Arjun Kumar</p>
              <p className="text-xs text-slate-500">Tier-1 Engineer</p>
            </div>
          </div>
          <Link href="/profile">
            <Button
              variant="outline"
              className="w-full py-2 text-xs font-semibold rounded-lg"
            >
              View Profile
            </Button>
          </Link>
        </div>
      </div>
    </aside>
  );
}
