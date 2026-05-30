import { describe, expect, it } from "vitest";
import { estimateYearsFromEntries } from "@/scoring/experience-years";

describe("estimateYearsFromEntries", () => {
  it("does not double-count overlapping employment intervals", () => {
    const result = estimateYearsFromEntries([
      {
        company: "A",
        title: "Dev",
        startDate: "2020-01",
        endDate: "2022-06",
        isCurrent: false,
        achievements: [],
      },
      {
        company: "B",
        title: "Dev",
        startDate: "2021-06",
        endDate: "2023-12",
        isCurrent: false,
        achievements: [],
      },
    ]);

    expect(result.isEstimate).toBe(false);
    expect(result.years).toBeLessThan(4);
    expect(result.years).toBeGreaterThan(2.5);
  });
});
