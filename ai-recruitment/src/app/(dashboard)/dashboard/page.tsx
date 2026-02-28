"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Target,
  Zap,
  TrendingUp,
  Briefcase,
  Percent,
  Star,
  ChevronRight,
  Verified,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATS = [
  {
    label: "ATS Score",
    value: "74",
    suffix: "/100",
    subtext: "+5.2% this week",
    color: "text-blue-600",
    icon: Percent,
  },
  {
    label: "Active Applications",
    value: "08",
    subtext: "3 pending interview calls",
    color: "text-orange-500",
    icon: Briefcase,
  },
  {
    label: "Career Readiness",
    value: "68%",
    subtext: "Top 5% in Peer Group",
    color: "text-emerald-500",
    icon: TrendingUp,
  },
  {
    label: "Reputation Score",
    value: "78",
    subtext: "Verified Engineer Status",
    color: "text-violet-500",
    icon: Star,
  },
];

export default function DashboardPage() {
  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-slate-900 text-white p-8 md:p-12 shadow-2xl shadow-primary/20"
        style={{
          background:
            "linear-gradient(135deg, #1e293b 0%, #3B82F6 50%, #6366f1 100%)",
        }}
      >
        <div className="absolute inset-0 opacity-60 bg-[radial-gradient(ellipse_at_0%_0%,hsla(253,16%,7%,1)_0,transparent_50%),radial-gradient(ellipse_at_50%_0%,hsla(225,39%,30%,1)_0,transparent_50%)]" />
        <div className="relative z-10">
          <Badge className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-widest border border-white/20">
            Active Goal
          </Badge>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight">
            Backend Developer
          </h2>
          <p className="mt-2 text-blue-100/80 max-w-md">
            You&apos;re 12% away from your dream role at top product firms.
            Complete your system design module today.
          </p>
          <div className="mt-8 flex gap-4">
            <Link href="/resume">
              <Button className="px-6 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-blue-50 flex items-center gap-2">
                Resume Analysis <Zap className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/interviews">
              <Button
                variant="outline"
                className="px-6 py-3 bg-white/10 backdrop-blur-md border-white/20 text-white font-bold rounded-xl hover:bg-white/20"
              >
                Take Mock Test
              </Button>
            </Link>
          </div>
        </div>
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-primary/30 rounded-full blur-[100px]" />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
            className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group"
          >
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
              {stat.label}
            </p>
            <h3
              className={`text-3xl font-extrabold mt-1 ${stat.color}`}
            >
              {stat.value}
              {stat.suffix && (
                <span className="text-sm font-normal text-slate-400">
                  {stat.suffix}
                </span>
              )}
            </h3>
            <div className="mt-3 flex items-center gap-1 text-emerald-500 text-xs font-bold">
              {stat.subtext}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">Application Pipeline</h3>
            <Button variant="ghost" className="text-primary font-bold text-sm">
              View all <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {["Applied", "Reviewing", "Interview", "Offers"].map(
              (stage, i) => (
                <Card
                  key={stage}
                  className="flex-shrink-0 w-72 p-4 border-slate-200 dark:border-slate-800"
                >
                  <div className="flex items-center justify-between px-2 mb-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          i === 0
                            ? "bg-slate-300"
                            : i === 1
                            ? "bg-orange-400"
                            : i === 2
                            ? "bg-blue-500"
                            : "bg-emerald-500"
                        }`}
                      />
                      <span className="font-bold text-slate-600 dark:text-slate-400 uppercase text-xs tracking-wider">
                        {stage}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {i < 3 ? (i === 0 ? 3 : i === 1 ? 2 : 1) : 0}
                      </Badge>
                    </div>
                  </div>
                  <div className="h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center">
                    <span className="text-slate-400 text-sm">{stage} items</span>
                  </div>
                </Card>
              )
            )}
          </div>
        </div>
        <div className="lg:col-span-4 space-y-8">
          <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800">
            <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
              <Verified className="text-primary w-5 h-5" /> Resume Health
            </h4>
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <Badge className="bg-emerald-200/30 text-emerald-600">
                  Good
                </Badge>
                <span className="text-xs font-bold text-emerald-600">82%</span>
              </div>
              <div className="h-2 w-full bg-emerald-100 dark:bg-emerald-900/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: "82%" }}
                />
              </div>
            </div>
            <ul className="space-y-3 text-[11px]">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">✓</span>
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  Keywords for &quot;Backend&quot; detected (14/15)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400">!</span>
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  Missing GitHub activity visualization
                </span>
              </li>
            </ul>
          </Card>
          <Card
            className="p-6 rounded-3xl border-0 text-white overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
            }}
          >
            <Badge className="bg-white/20 text-[10px] font-bold mb-2">
              UP NEXT
            </Badge>
            <h4 className="text-lg font-bold mt-2">Mock Interview #4</h4>
            <p className="text-xs text-indigo-100 mt-1">
              With Senior Eng from Microsoft
            </p>
            <div className="flex items-center gap-4 mt-6">
              <div>
                <p className="text-[10px] text-indigo-200">Date</p>
                <p className="text-sm font-bold">Dec 22</p>
              </div>
              <div>
                <p className="text-[10px] text-indigo-200">Time</p>
                <p className="text-sm font-bold">14:00 IST</p>
              </div>
            </div>
            <Button className="mt-6 w-full py-2.5 bg-white text-indigo-700 font-bold rounded-xl text-xs hover:bg-blue-50">
              Set Reminder
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
