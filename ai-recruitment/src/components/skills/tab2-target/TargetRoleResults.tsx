'use client'

import { motion } from 'framer-motion'

export function TargetRoleResults({
  analysis,
  targetRole,
  experienceLevel,
}: {
  analysis: any
  targetRole: string
  experienceLevel: string
}) {
  if (!analysis) return null

  const {
    roleMatchScore = 0,
    timeToReady = 'N/A',
    skillsYouHave = [],
    criticalGaps = [],
    partialSkills = [],
    personalizedInsights = [],
    learningRoadmap,
  } = analysis

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50 p-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{targetRole}</h3>
            <p className="capitalize text-sm text-gray-400">
              {experienceLevel} Level
            </p>
          </div>
          <div className="text-right">
            <div
              className={`text-5xl font-black ${
                roleMatchScore >= 80
                  ? 'text-emerald-600'
                  : roleMatchScore >= 60
                  ? 'text-blue-600'
                  : roleMatchScore >= 40
                  ? 'text-amber-600'
                  : 'text-red-500'
              }`}
            >
              {roleMatchScore}
              <span className="text-2xl">%</span>
            </div>
            <p className="text-xs text-gray-400">Role Match</p>
          </div>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/60">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400"
            initial={{ width: 0 }}
            animate={{ width: `${roleMatchScore}%` }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {[
            { label: `${skillsYouHave.length} Skills Match`, color: 'emerald' },
            { label: `${criticalGaps.length} Critical Gaps`, color: 'red' },
            { label: `${partialSkills.length} Need Leveling`, color: 'amber' },
            { label: `Ready in ${timeToReady}`, color: 'violet' },
          ].map((stat) => (
            <span
              key={stat.label}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                stat.color === 'emerald'
                  ? 'bg-emerald-100 text-emerald-700'
                  : stat.color === 'red'
                  ? 'bg-red-100 text-red-700'
                  : stat.color === 'amber'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-violet-100 text-violet-700'
              }`}
            >
              {stat.label}
            </span>
          ))}
        </div>
      </div>

      {personalizedInsights.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h4 className="mb-3 text-sm font-bold text-gray-700">
            💡 Personalized Insights
          </h4>
          <ul className="space-y-2">
            {personalizedInsights.map((insight: string, i: number) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-2 text-sm text-gray-600"
              >
                <span className="mt-0.5 flex-shrink-0 text-violet-400">•</span>
                {insight}
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {criticalGaps.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h4 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-800">
            ⚡ Critical Gaps
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
              {criticalGaps.length}
            </span>
          </h4>
          <div className="space-y-3">
            {criticalGaps.map((gap: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`rounded-xl border-l-4 bg-gray-50 p-4 ${
                  gap.demandScore >= 80
                    ? 'border-l-red-400'
                    : gap.demandScore >= 60
                    ? 'border-l-amber-400'
                    : 'border-l-blue-400'
                }`}
              >
                <div className="mb-2 flex items-start justify-between">
                  <span className="text-sm font-semibold text-gray-800">
                    {gap.skill}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      gap.demandScore >= 80
                        ? 'bg-red-100 text-red-700'
                        : gap.demandScore >= 60
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {gap.demandScore}% demand
                  </span>
                </div>

                <div className="mb-2 h-1 w-full rounded-full bg-gray-200">
                  <motion.div
                    className={`h-full rounded-full ${
                      gap.demandScore >= 80
                        ? 'bg-red-400'
                        : gap.demandScore >= 60
                        ? 'bg-amber-400'
                        : 'bg-blue-400'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${gap.demandScore}%` }}
                    transition={{ duration: 0.7, delay: i * 0.06 }}
                  />
                </div>

                <p className="mb-3 text-xs text-gray-500">{gap.why}</p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    ⏱ ~{gap.estimatedWeeks} weeks at 2hrs/day
                  </span>
                  <button className="rounded-lg border border-violet-300 px-3 py-1 text-xs text-violet-600 hover:bg-violet-50 transition-colors">
                    ▶ Start Learning
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {skillsYouHave.length > 0 && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <h4 className="mb-3 text-sm font-bold text-emerald-700">
            ✅ Skills You Already Have ({skillsYouHave.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {skillsYouHave.map((skill: any, i: number) => (
              <span
                key={i}
                className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-700"
              >
                {typeof skill === 'string' ? skill : skill.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {learningRoadmap?.phases?.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h4 className="mb-5 text-base font-bold text-gray-800">
            🗺️ Your Learning Roadmap
          </h4>
          <div className="relative space-y-6">
            <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-gray-100" />
            {learningRoadmap.phases.map((phase: any, pi: number) => (
              <motion.div
                key={pi}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: pi * 0.1 }}
                className="relative pl-10"
              >
                <div
                  className="absolute left-2 top-1 h-4 w-4 rounded-full border-2 border-white shadow"
                  style={{ backgroundColor: phase.color ?? '#6366F1' }}
                />
                <p
                  className="mb-3 text-xs font-bold uppercase tracking-widest"
                  style={{ color: phase.color ?? '#6366F1' }}
                >
                  Phase {phase.phase} · {phase.title}
                  <span className="ml-2 font-normal normal-case text-gray-400">
                    {phase.weeks}
                  </span>
                </p>
                <div className="space-y-2">
                  {(phase.items ?? []).map((item: any) => (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-4 text-sm ${
                        item.type === 'learn'
                          ? 'bg-violet-50 border-violet-100'
                          : item.type === 'build'
                          ? 'bg-blue-50 border-blue-100'
                          : 'bg-emerald-50 border-emerald-100'
                      }`}
                    >
                      <p className="mb-0.5 font-semibold text-gray-800">
                        {item.type === 'learn'
                          ? '📖'
                          : item.type === 'build'
                          ? '🛠'
                          : '🎯'}{' '}
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.description}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        ⏱ {item.estimatedWeeks} week
                        {item.estimatedWeeks !== 1 ? 's' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

