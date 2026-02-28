"use client";

import { motion } from "framer-motion";

const kpis = [
  {
    label: "Placement Rate",
    value: "92%",
    gradient: "linear-gradient(105deg, #4F46E5 0%, #3B82F6 100%)",
    subtext: null,
    progress: 92,
  },
  {
    label: "Students Placed",
    value: "12,400+",
    gradient: "linear-gradient(105deg, #F97316 0%, #FB923C 100%)",
    subtext: "Across 150+ Top Tier Companies",
  },
  {
    label: "Avg. Package",
    value: "₹18.5 LPA",
    gradient: "linear-gradient(105deg, #10B981 0%, #34D399 100%)",
    subtext: "For Engineering Freshers",
  },
];

export function KPISection() {
  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            viewport={{ once: true }}
            className="p-8 rounded-[24px] text-white shadow-xl"
            style={{ background: kpi.gradient }}
          >
            <p className="text-sm font-bold opacity-80 uppercase tracking-wider mb-2">
              {kpi.label}
            </p>
            <h4 className="text-4xl font-extrabold">{kpi.value}</h4>
            {kpi.progress && (
              <div className="mt-4 h-1 w-full bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-1000"
                  style={{ width: `${kpi.progress}%` }}
                />
              </div>
            )}
            {kpi.subtext && (
              <p className="text-xs mt-4 font-medium opacity-90">{kpi.subtext}</p>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
