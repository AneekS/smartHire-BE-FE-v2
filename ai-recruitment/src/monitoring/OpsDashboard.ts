import { readFileSync } from "fs";
import path from "path";
import {
  MetricsCollector,
  type DashboardPayload,
} from "@/monitoring/MetricsCollector";

export type { DashboardPayload };

export class OpsDashboard {
  static async buildPayload(days = 7): Promise<DashboardPayload> {
    return MetricsCollector.getDashboardData(days);
  }

  static renderHtml(payload: DashboardPayload): string {
    const templatePath = path.join(
      process.cwd(),
      "src/monitoring/templates/dashboard.html"
    );
    const template = readFileSync(templatePath, "utf8");
    return template.replace(
      "__DASHBOARD_JSON__",
      JSON.stringify(payload).replace(/</g, "\\u003c")
    );
  }
}

/** @deprecated Use OpsDashboard.buildPayload */
export async function buildDashboardPayload(days = 7): Promise<DashboardPayload> {
  return OpsDashboard.buildPayload(days);
}

export { MetricsCollector };
