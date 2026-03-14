'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSkillGapStore } from '@/store/useSkillGapStore'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// Tab 1 — Resume Based
import { ResumeSkillAnalysis } from './tab1-resume/ResumeSkillAnalysis'

// Tab 2 — Target Role
import { TargetRoleExplorer } from './tab2-target/TargetRoleExplorer'

const tabContentVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2 },
  },
}

type TabId = 'resume' | 'target'

const TABS: { id: TabId; label: string }[] = [
  { id: 'resume', label: 'Resume-Based Analysis' },
  { id: 'target', label: 'Target Role Explorer' },
]

export function SkillGapLayout() {
  const [activeTab, setActiveTab] = useState<TabId>('resume')
  const { analyzeFromResume, resumeAnalysis, resumeAnalysisLoading } =
    useSkillGapStore()

  // Auto-trigger resume analysis on mount if not already done
  useEffect(() => {
    if (!resumeAnalysis && !resumeAnalysisLoading) {
      analyzeFromResume()
    }
  }, [])

  return (
    <div className="space-y-6">

      {/* TAB SWITCHER */}
      <div className="flex items-center gap-2 bg-gray-100 rounded-full
                      p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-5 py-2 rounded-full text-sm font-medium
                        transition-all duration-200 outline-none
                        ${activeTab === tab.id
                          ? 'text-white'
                          : 'text-gray-500 hover:text-gray-700'
                        }`}
          >
            {/* Animated active background */}
            {activeTab === tab.id && (
              <motion.div
                layoutId="active-tab-bg"
                className="absolute inset-0 bg-violet-600 rounded-full"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB CONTENT — AnimatePresence with unique hardcoded keys */}
      <AnimatePresence mode="wait">

        {activeTab === 'resume' && (
          <motion.div
            key="tab-panel-resume"
            variants={tabContentVariants}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            <ResumeSkillAnalysis />
          </motion.div>
        )}

        {activeTab === 'target' && (
          <motion.div
            key="tab-panel-target"
            variants={tabContentVariants}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            <TargetRoleExplorer />
          </motion.div>
        )}

      </AnimatePresence>

      {/* Tip card */}
      <Card className="border border-gray-200 bg-white/90 p-4 text-xs text-gray-500 shadow-sm backdrop-blur">
        <p>
          Tip: For the most accurate results, upload your latest resume in the
          Resume Optimizer first. You can still use the Target Role Explorer
          even without a resume.
        </p>
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            asChild
            className="h-7 rounded-lg border-gray-200 text-xs text-violet-600 hover:bg-violet-50"
          >
            <a href="/resume">Go to Resume Optimizer →</a>
          </Button>
        </div>
      </Card>
    </div>
  )
}
