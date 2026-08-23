import type { CandidateEvidenceId } from "../types";

export interface CandidateEvidence {
  id: CandidateEvidenceId;
  label: string;
  source: "Education" | "Portfolio" | "Preference";
  detail: string;
}

export const candidateProfileVersion = "jinhan-demo-profile-v1";

export const candidateEvidence: Record<CandidateEvidenceId, CandidateEvidence> = {
  "EDU-01": {
    id: "EDU-01",
    label: "Mathematics + Computer Science",
    source: "Education",
    detail: "UNC undergraduate background connecting mathematical reasoning with software engineering.",
  },
  "PORT-01": {
    id: "PORT-01",
    label: "Reproducible software portfolio",
    source: "Portfolio",
    detail: "Projects emphasize validation, failure analysis, provenance, and reproducible results.",
  },
  "PORT-02": {
    id: "PORT-02",
    label: "Full-stack take-home evidence",
    source: "Portfolio",
    detail: "This project demonstrates React, TypeScript, responsive UI, testing, and backend workflow design.",
  },
  "PORT-03": {
    id: "PORT-03",
    label: "Scientific and data tooling",
    source: "Portfolio",
    detail: "Python-oriented work focuses on dependable ingestion, structured data, and explicit assumptions.",
  },
  "PREF-01": {
    id: "PREF-01",
    label: "Early-career target",
    source: "Preference",
    detail: "Current search prioritizes internships, new-grad roles, and credible growth paths.",
  },
  "PREF-02": {
    id: "PREF-02",
    label: "Location and work mode",
    source: "Preference",
    detail: "Remote opportunities and roles in North Carolina receive preference weight.",
  },
};
