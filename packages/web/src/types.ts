export type WorkMode = "Remote" | "Hybrid" | "On-site";

export type MatchCategory = "skills" | "experience" | "education" | "preferences";

export type CandidateEvidenceId =
  | "EDU-01"
  | "PORT-01"
  | "PORT-02"
  | "PORT-03"
  | "PREF-01"
  | "PREF-02";

export interface RecommendationReason {
  text: string;
  evidenceIds: CandidateEvidenceId[];
}

export interface MatchBreakdown {
  skills: number;
  experience: number;
  education: number;
  preferences: number;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  companyMark: string;
  companyColor: string;
  location: string;
  workMode: WorkMode;
  employmentType: "Full time" | "Internship" | "Contract";
  seniority: string;
  salary: string;
  posted: string;
  applicants: number;
  match: MatchBreakdown;
  skillsMatched: number;
  totalSkills: number;
  summary: string;
  qualifications: string[];
  required: string[];
  preferred: string[];
  responsibilities: string[];
  benefits: string[];
  recommendationReasons: RecommendationReason[];
  gaps: string[];
}

export interface JobFilters {
  workMode: "All" | WorkMode;
  minimumMatch: number;
}
