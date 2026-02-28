"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <header
      className="pt-24 pb-16 min-h-[90vh] flex items-center"
      style={{
        background:
          "radial-gradient(ellipse at 20% 50%, #E0C3FC 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, #FBC2EB 0%, transparent 50%), radial-gradient(ellipse at 60% 80%, #FFECD2 0%, transparent 40%), #FFFFFF",
      }}
    >
      <div className="max-w-5xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 border border-white/40 text-[10px] uppercase tracking-widest font-extrabold text-primary mb-8 shadow-sm"
        >
          <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
          Freshman Fast-Track 2024
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-6xl font-extrabold leading-[1.1] mb-6 tracking-tight text-[#1F2937]"
        >
          Land Your Dream Tech Job. <br />
          <span className="text-primary">Zero Guesswork.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-xl text-[#6B7280] mb-10 max-w-2xl mx-auto font-medium"
        >
          The all-in-one platform for Indian engineering freshers to optimize
          resumes, master DSA, and clear mock interviews.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link href="/register">
            <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-10 py-5 text-lg font-bold rounded-[100px] shadow-2xl shadow-blue-500/30">
              Start My Career Journey
            </Button>
          </Link>
        </motion.div>
      </div>
    </header>
  );
}
