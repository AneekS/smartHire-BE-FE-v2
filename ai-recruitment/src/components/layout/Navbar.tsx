"use client";

import Link from "next/link";
import { Bolt } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#career-paths", label: "Career Paths" },
  { href: "#pricing", label: "Pricing" },
];

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-[rgba(148,163,184,0.15)]">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Bolt className="text-white w-6 h-6" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-[#1F2937] dark:text-white">
            SmartHire AI
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-10 text-sm font-semibold text-[#6B7280] dark:text-slate-400">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-6">
          <Link href="/login">
            <Button variant="ghost" className="text-sm font-bold text-[#1F2937]">
              Log in
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-8 py-3 text-sm font-bold rounded-[100px] shadow-lg shadow-blue-500/20">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
