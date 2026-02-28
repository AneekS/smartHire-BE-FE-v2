import Link from "next/link";
import { Bolt, Globe, Mail } from "lucide-react";

const platformLinks = [
  { href: "#", label: "Resume Builder" },
  { href: "#", label: "Mock Interviews" },
  { href: "#", label: "Skill Analysis" },
  { href: "#", label: "Roadmaps" },
];

const companyLinks = [
  { href: "/about", label: "About Us" },
  { href: "#", label: "Contact" },
  { href: "#", label: "Privacy Policy" },
  { href: "#", label: "Terms" },
];

export function Footer() {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-[rgba(148,163,184,0.15)] py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Bolt className="text-white w-4 h-4" />
              </div>
              <span className="font-bold text-xl tracking-tight text-[#1F2937] dark:text-white">
                SmartHire AI
              </span>
            </div>
            <p className="max-w-sm mb-8 font-medium text-[#6B7280] dark:text-slate-400">
              Empowering the next generation of Indian engineers with
              high-precision career growth tools.
            </p>
            <div className="flex gap-4">
              <Link
                href="#"
                className="w-10 h-10 rounded-full bg-[#F8F9FD] dark:bg-slate-800 flex items-center justify-center text-[#6B7280] hover:text-[#3B82F6] transition-colors"
              >
                <Globe className="w-5 h-5" />
              </Link>
              <Link
                href="#"
                className="w-10 h-10 rounded-full bg-[#F8F9FD] dark:bg-slate-800 flex items-center justify-center text-[#6B7280] hover:text-[#3B82F6] transition-colors"
              >
                <Mail className="w-5 h-5" />
              </Link>
            </div>
          </div>
          <div>
            <h5 className="font-extrabold text-[#1F2937] dark:text-white mb-6">
              Platform
            </h5>
            <ul className="space-y-4 text-sm font-medium text-[#6B7280] dark:text-slate-400">
              {platformLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="hover:text-[#4F46E5] dark:hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="font-extrabold text-[#1F2937] dark:text-white mb-6">
              Company
            </h5>
            <ul className="space-y-4 text-sm font-medium text-[#6B7280] dark:text-slate-400">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="hover:text-[#4F46E5] dark:hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-16 pt-8 border-t border-[rgba(148,163,184,0.15)] text-center text-xs font-bold text-[#6B7280] dark:text-slate-500">
          © 2024 SmartHire AI. For the focused engineers of tomorrow.
        </div>
      </div>
    </footer>
  );
}
