"use client";

interface SectionScores {
  [key: string]: any;
}

interface Props {
  sectionScores: SectionScores;
}

function scoreTone(score: number) {
  if (score >= 80) return "bg-emerald-50 border-emerald-100";
  if (score >= 60) return "bg-blue-50 border-blue-100";
  if (score >= 40) return "bg-amber-50 border-amber-100";
  return "bg-red-50 border-red-100";
}

export function SectionScoresGrid({ sectionScores }: Props) {
  const entries = Object.entries(sectionScores ?? {});

  const labelFor = (key: string) => {
    switch (key) {
      case "summary":
        return "Summary";
      case "experience":
        return "Experience";
      case "skills":
        return "Skills";
      case "education":
        return "Education";
      case "projects":
        return "Projects";
      default:
        return key;
    }
  };

  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {entries.map(([key, value], index) => {
        if (!value) return null;
        const score = typeof value.score === "number" ? value.score : 0;
        return (
          <div
            key={key}
            className={`rounded-2xl border p-4 text-xs shadow-sm ${scoreTone(
              score
            )}`}
            style={{
              transform: "translateY(16px)",
              opacity: 0,
              animation: "section-rise 0.35s ease-out forwards",
              animationDelay: `${index * 0.08}s`,
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="font-semibold text-slate-800">
                {labelFor(key)}
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                <span>{score}</span>
              </div>
            </div>
            {value.feedback && (
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {value.feedback}
              </p>
            )}
            {Array.isArray(value.relevantRoles) && value.relevantRoles.length > 0 && (
              <p className="mt-1 text-[11px] text-slate-500">
                Relevant roles:{" "}
                <span className="font-medium">
                  {value.relevantRoles.join(", ")}
                </span>
              </p>
            )}
            {Array.isArray(value.relevantProjects) &&
              value.relevantProjects.length > 0 && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Relevant projects:{" "}
                  <span className="font-medium">
                    {value.relevantProjects.join(", ")}
                  </span>
                </p>
              )}
          </div>
        );
      })}
      <style jsx>{`
        @keyframes section-rise {
          0% {
            opacity: 0;
            transform: translateY(16px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

