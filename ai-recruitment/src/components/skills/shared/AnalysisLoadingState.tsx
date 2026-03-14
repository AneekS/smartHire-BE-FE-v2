"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

export function AnalysisLoadingState() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid gap-6 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)]"
    >
      <motion.div variants={itemVariants} className="space-y-4">
        <Skeleton className="h-64 w-full rounded-2xl bg-gray-100" />
        <Skeleton className="h-10 w-40 rounded-full bg-gray-100" />
      </motion.div>
      <motion.div variants={itemVariants} className="space-y-4">
        <Skeleton className="h-10 w-56 rounded-lg bg-gray-100" />
        <Skeleton className="h-24 w-full rounded-2xl bg-gray-100" />
        <Skeleton className="h-24 w-full rounded-2xl bg-gray-100" />
        <Skeleton className="h-24 w-full rounded-2xl bg-gray-100" />
        <p className="text-sm text-gray-500">
          AI is analyzing your resume against market data...
        </p>
      </motion.div>
    </motion.div>
  );
}
