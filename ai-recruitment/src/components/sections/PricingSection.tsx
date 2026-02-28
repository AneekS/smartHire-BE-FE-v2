"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const freeFeatures = [
  "1 ATS Resume Scan",
  "Basic Career Roadmap",
];

const proFeatures = [
  "Unlimited Resume Scans",
  "Unlimited AI Mock Interviews",
  "Priority Mentorship Access",
];

export function PricingSection() {
  return (
    <section className="py-24 bg-[#F8F9FD] dark:bg-slate-950">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl font-extrabold mb-12 text-[#1F2937] dark:text-white">
          Invest in Your Future.
        </h2>
        <div className="grid md:grid-cols-2 gap-8 text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-10 rounded-[24px] border border-[rgba(148,163,184,0.15)] bg-white dark:bg-slate-900 shadow-[0_10px_15px_-3px_rgba(148,163,184,0.12)]"
          >
            <h4 className="text-xl font-bold mb-2 text-[#1F2937] dark:text-white">
              Free Starter
            </h4>
            <p className="text-sm text-[#6B7280] dark:text-slate-400 mb-8">
              Perfect for exploring the basics.
            </p>
            <div className="text-4xl font-extrabold mb-8 text-[#1F2937] dark:text-white">
              ₹0
            </div>
            <ul className="space-y-4 mb-10">
              {freeFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-3 text-sm font-medium text-[#1F2937] dark:text-slate-300"
                >
                  <Check className="text-[#3B82F6] w-5 h-5 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Link href="/register">
              <Button
                variant="outline"
                className="w-full py-4 font-bold rounded-xl"
              >
                Get Started Free
              </Button>
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="p-10 rounded-[24px] border-2 border-[#3B82F6] bg-white dark:bg-slate-900 shadow-[0_10px_15px_-3px_rgba(148,163,184,0.12)] relative"
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#3B82F6] text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
              Most Popular
            </div>
            <h4 className="text-xl font-bold mb-2 text-[#1F2937] dark:text-white">
              Pro Accelerator
            </h4>
            <p className="text-sm text-[#6B7280] dark:text-slate-400 mb-8">
              Everything you need to get hired.
            </p>
            <div className="text-4xl font-extrabold mb-8 text-[#1F2937] dark:text-white">
              ₹499 <span className="text-lg font-medium text-[#6B7280]">/mo</span>
            </div>
            <ul className="space-y-4 mb-10">
              {proFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-3 text-sm font-medium text-[#1F2937] dark:text-slate-300"
                >
                  <Check className="text-[#3B82F6] w-5 h-5 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Link href="/register?plan=pro">
              <Button className="w-full py-4 font-bold rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] shadow-xl shadow-blue-500/20">
                Go Pro Now
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
