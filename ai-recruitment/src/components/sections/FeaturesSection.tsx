"use client";

import { motion } from "framer-motion";
import { FileText, BarChart3 } from "lucide-react";
import Link from "next/link";

export function FeaturesSection() {
  return (
    <section className="py-20 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-xl">
            <h2 className="text-4xl font-extrabold mb-4 text-[#1F2937] dark:text-white">
              Precision Tools for Your Career.
            </h2>
            <p className="text-lg text-[#6B7280] dark:text-slate-400">
              No fluff. Just the specific tools you need to beat the competition
              and secure high-paying offers.
            </p>
          </div>
          <Link href="/resume">
            <button className="bg-white dark:bg-slate-800 border border-[rgba(148,163,184,0.15)] px-6 py-3 text-sm font-bold rounded-xl text-[#1F2937] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2">
              Explore All Features
              <span className="text-sm">→</span>
            </button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="md:col-span-7 p-10 rounded-[24px] border border-[rgba(148,163,184,0.15)] bg-white dark:bg-slate-900 shadow-[0_10px_15px_-3px_rgba(148,163,184,0.12)] flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-[#3B82F6] rounded-xl flex items-center justify-center mb-6">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-[#1F2937] dark:text-white">
                ATS Resume Optimizer
              </h3>
              <p className="text-[#6B7280] dark:text-slate-400 leading-relaxed mb-8">
                Most resumes never reach a human recruiter. Our AI engine
                optimizes your keywords and formatting to ensure you pass the
                80% score threshold for MAANG and top Indian unicorns.
              </p>
            </div>
            <div className="bg-[#F8F9FD] dark:bg-slate-800 p-4 rounded-2xl border border-[rgba(148,163,184,0.15)]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-[#6B7280]">
                  Optimization Progress
                </span>
                <span className="text-xs font-extrabold text-[#3B82F6]">
                  89% Match
                </span>
              </div>
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full">
                <div
                  className="h-full bg-[#3B82F6] rounded-full"
                  style={{ width: "89%" }}
                />
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="md:col-span-5 p-10 rounded-[24px] border border-[rgba(148,163,184,0.15)] bg-white dark:bg-slate-900 shadow-[0_10px_15px_-3px_rgba(148,163,184,0.12)]"
          >
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-primary rounded-xl flex items-center justify-center mb-6">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-[#1F2937] dark:text-white">
              Skill Gap Analysis
            </h3>
            <p className="text-[#6B7280] dark:text-slate-400 leading-relaxed mb-6">
              Know exactly what&apos;s missing. We compare your profile with
              successful hires in your target roles.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-sm font-semibold text-[#1F2937] dark:text-white">
                <span className="text-emerald-500">✓</span> System Design
                Basics
              </li>
              <li className="flex items-center gap-3 text-sm font-semibold text-[#1F2937] dark:text-white">
                <span className="text-emerald-500">✓</span> Advanced SQL
              </li>
              <li className="flex items-center gap-3 text-sm font-semibold text-orange-400">
                <span>!</span> Dynamic Programming (Missing)
              </li>
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
