import { Bookmark, Clock3, MapPin, Radio, UsersRound } from "lucide-react";
import { calculateMatch } from "../lib/recommendation";
import type { Job } from "../types";
import { MatchRing } from "./MatchRing";

interface JobCardProps {
  job: Job;
  saved: boolean;
  onOpen: () => void;
  onSave: () => void;
  onInterview: () => void;
}

export function JobCard({ job, saved, onOpen, onSave, onInterview }: JobCardProps) {
  const score = calculateMatch(job.match);

  return (
    <article className="job-card" data-testid={`job-card-${job.id}`}>
      <button className="job-card-main" type="button" onClick={onOpen} aria-label={`View ${job.title}`}>
        <MatchRing score={score} />
        <span className="job-card-content">
          <span className="job-title-row">
            <span>
              <strong className="job-title">{job.title}</strong>
              <span className="company-row">
                <span className="company-mark mini" style={{ backgroundColor: job.companyColor }}>
                  {job.companyMark}
                </span>
                {job.company}
              </span>
            </span>
          </span>
          <span className="meta-row">
            <span>
              <MapPin size={13} /> {job.location}
            </span>
            <span>
              <Radio size={13} /> {job.workMode}
            </span>
          </span>
          <span className="chip-row">
            <span>{job.employmentType}</span>
            <span>
              {job.skillsMatched} of {job.totalSkills} skills match
            </span>
            <span>{job.seniority}</span>
            <span>{job.salary}</span>
          </span>
        </span>
      </button>
      <div className="job-card-footer">
        <div className="activity-row">
          <span>
            <Clock3 size={13} /> {job.posted}
          </span>
          <span>
            <UsersRound size={13} /> {job.applicants} applicants
          </span>
        </div>
        <div className="card-actions">
          <button
            className={`save-button ${saved ? "is-saved" : ""}`}
            type="button"
            onClick={onSave}
            aria-label={saved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
          >
            <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
          </button>
          <button className="secondary-button" type="button" onClick={onOpen}>
            View details
          </button>
          <button className="lime-button" type="button" onClick={onInterview}>
            Mock interview
          </button>
        </div>
      </div>
    </article>
  );
}
