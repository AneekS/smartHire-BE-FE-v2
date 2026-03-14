'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSkillGapStore } from '@/store/useSkillGapStore'
import { TargetRoleResults } from './TargetRoleResults'

const POPULAR_ROLES = [
  { emoji: '💻', label: 'Full Stack Engineer' },
  { emoji: '🤖', label: 'ML Engineer' },
  { emoji: '☁️', label: 'DevOps Engineer' },
  { emoji: '📱', label: 'Mobile Developer' },
  { emoji: '🛡️', label: 'Security Engineer' },
  { emoji: '📊', label: 'Data Analyst' },
]

const LEVELS = ['entry', 'mid', 'senior', 'staff'] as const

export function TargetRoleExplorer() {
  const [targetRole, setTargetRole] = useState('')
  const [experienceLevel, setExperienceLevel] =
    useState<(typeof LEVELS)[number]>('mid')
  const resultsRef = useRef<HTMLDivElement>(null)

  const targetAnalysis = useSkillGapStore((s) => s.targetAnalysis)
  const targetAnalysisLoading = useSkillGapStore(
    (s) => s.targetAnalysisLoading,
  )
  const targetAnalysisError = useSkillGapStore((s) => s.targetAnalysisError)
  const analyzeTargetRole = useSkillGapStore((s) => s.analyzeTargetRole)

  const handleAnalyze = async () => {
    const role = targetRole.trim()
    if (!role) return
    await analyzeTargetRole(role, experienceLevel)
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 100)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <h2 className="mb-1 text-xl font-bold text-gray-900">
          Step 1: Choose your target
        </h2>
        <p className="mb-6 text-sm text-gray-400">
          Tell us where you want to go. We&apos;ll map out how to get there.
        </p>

        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-violet-600">
          Target Role or Title
        </label>
        <input
          type="text"
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
          placeholder="e.g. Senior Frontend Engineer"
          className="mb-5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 placeholder-gray-400 outline-none transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
        />

        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Popular Roles
        </p>
        <div className="mb-6 grid grid-cols-3 gap-3">
          {POPULAR_ROLES.map((role) => (
            <motion.button
              key={role.label}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setTargetRole(role.label)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                targetRole === role.label
                  ? 'border-violet-400 bg-violet-50 shadow-sm'
                  : 'border-gray-200 bg-gray-50 hover:border-violet-300'
              }`}
            >
              <span className="text-2xl">{role.emoji}</span>
              <span className="text-sm font-medium text-gray-700">
                {role.label}
              </span>
            </motion.button>
          ))}
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Experience Level
        </p>
        <div className="mb-6 flex gap-2">
          {LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setExperienceLevel(level)}
              className={`rounded-full px-5 py-2 text-sm font-medium capitalize transition-all ${
                experienceLevel === level
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        {targetAnalysisError && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3">
            <p className="text-sm text-red-600">{targetAnalysisError}</p>
          </div>
        )}

        <motion.button
          type="button"
          whileHover={{ scale: targetRole.trim() ? 1.02 : 1 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleAnalyze}
          disabled={!targetRole.trim() || targetAnalysisLoading}
          className={`flex items-center gap-2 rounded-full px-8 py-3 text-sm font-semibold shadow-md transition-all ${
            targetRole.trim() && !targetAnalysisLoading
              ? 'cursor-pointer bg-violet-600 text-white hover:bg-violet-700'
              : 'cursor-not-allowed bg-gray-300 text-gray-500'
          }`}
        >
          {targetAnalysisLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Analyzing your profile...
            </>
          ) : (
            <>✨ Analyze Gap →</>
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {targetAnalysisLoading && (
          <motion.div
            key="loading-state"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm"
          >
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
            <p className="font-medium text-gray-600">
              Analyzing your profile for{' '}
              <span className="text-violet-600">{targetRole}</span>...
            </p>
            <p className="mt-1 text-sm text-gray-400">
              This takes about 10–15 seconds
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={resultsRef}>
        <AnimatePresence>
          {!targetAnalysisLoading && targetAnalysis !== null && (
            <motion.div
              key="results-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <TargetRoleResults
                analysis={targetAnalysis}
                targetRole={targetRole}
                experienceLevel={experienceLevel}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!targetAnalysis && !targetAnalysisLoading && (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
          <p className="text-sm text-gray-500">
            💡 Tip: Upload your latest resume in the Resume Optimizer first for
            the most accurate analysis.
          </p>
          <a
            href="/resume"
            className="mt-2 inline-block text-sm font-medium text-violet-600 hover:underline"
          >
            Go to Resume Optimizer →
          </a>
        </div>
      )}
    </div>
  )
}

