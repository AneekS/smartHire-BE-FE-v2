"use client";

import { motion } from "framer-motion";
import { Upload, MousePointerClick, Video } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "1. Upload Resume",
    description:
      "Our AI scans your resume against top Indian tech firm requirements instantly.",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-100",
    iconColor: "text-[#3B82F6]",
  },
  {
    icon: MousePointerClick,
    title: "2. Get Roadmap",
    description:
      "Receive a personalized skill gap analysis and step-by-step learning path.",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-100",
    iconColor: "text-[#6366F1]",
  },
  {
    icon: Video,
    title: "3. Practice Mock",
    description:
      "Simulate real technical interviews with AI feedback on your performance.",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-100",
    iconColor: "text-[#8B5CF6]",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-12 border-b border-[rgba(148,163,184,0.15)] bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-xs uppercase tracking-[0.2em] text-center mb-12 font-extrabold text-[#6B7280] dark:text-slate-400">
          How It Works in 3 Simple Steps
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="flex items-start gap-6"
            >
              <div
                className={`w-14 h-14 shrink-0 rounded-2xl ${step.bgColor} flex items-center justify-center border ${step.borderColor}`}
              >
                <step.icon className={`w-8 h-8 ${step.iconColor}`} />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2 text-[#1F2937] dark:text-white">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#6B7280] dark:text-slate-400">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
