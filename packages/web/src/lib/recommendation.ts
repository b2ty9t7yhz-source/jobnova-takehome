import type { Job, JobFilters, MatchBreakdown } from "../types";

export const recommendationPolicy = {
  id: "deterministic-weighted-v1",
  weights: {
  skills: 0.4,
  experience: 0.25,
  education: 0.2,
  preferences: 0.15,
  },
} as const satisfies { id: string; weights: Record<keyof MatchBreakdown, number> };

export function calculateMatch(match: MatchBreakdown): number {
  return Math.round(
    Object.entries(recommendationPolicy.weights).reduce((total, [category, weight]) => {
      return total + match[category as keyof MatchBreakdown] * weight;
    }, 0),
  );
}

export function filterJobs(
  allJobs: Job[],
  query: string,
  filters: JobFilters,
  savedOnly: boolean,
  savedIds: ReadonlySet<string>,
): Job[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return allJobs
    .filter((job) => {
      const searchableText = [
        job.title,
        job.company,
        job.location,
        job.workMode,
        ...job.qualifications,
      ]
        .join(" ")
        .toLocaleLowerCase();

      return (
        (!normalizedQuery || searchableText.includes(normalizedQuery)) &&
        (filters.workMode === "All" || job.workMode === filters.workMode) &&
        calculateMatch(job.match) >= filters.minimumMatch &&
        (!savedOnly || savedIds.has(job.id))
      );
    })
    .sort((a, b) => calculateMatch(b.match) - calculateMatch(a.match));
}

export function matchTone(score: number): "great" | "good" | "partial" {
  if (score >= 88) return "great";
  if (score >= 75) return "good";
  return "partial";
}
