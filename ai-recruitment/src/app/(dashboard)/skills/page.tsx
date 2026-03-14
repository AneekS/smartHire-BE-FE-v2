import { SkillGapAnalyzer } from "@/components/skills/SkillGapAnalyzer";

export default function SkillsPage() {
  return (
    <div className="relative min-h-screen bg-[#FAFAFA]">
      {/* Grid dot pattern (hero only) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-60"
        style={{
          backgroundImage: "radial-gradient(circle, #E5E7EB 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "linear-gradient(to bottom, black 0%, transparent 60%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 60%)",
        }}
      />
      {/* Soft purple gradient blob (mindset health style) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 z-0 h-[400px] w-[800px] -translate-x-1/2 -translate-y-[200px]"
        style={{
          background: "radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 70%)",
        }}
      />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-200">
                <span className="text-base">🎯</span>
                <span>Skill Intelligence</span>
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Skill Gap Analysis
              </h1>
              <p className="max-w-2xl text-sm text-gray-500">
                Identify your gaps. Build your path. Land your role.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Live market data
              </span>
            </div>
          </div>
        </header>

        <section>
          <SkillGapAnalyzer />
        </section>
      </main>
    </div>
  );
}
