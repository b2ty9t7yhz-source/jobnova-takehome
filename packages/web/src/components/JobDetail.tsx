import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  BriefcaseBusiness,
  Check,
  Clock3,
  GraduationCap,
  MapPin,
  Radio,
  Share2,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { calculateMatch } from "../lib/recommendation";
import type { Job } from "../types";
import { MatchRing } from "./MatchRing";

interface JobDetailProps {
  job: Job;
  saved: boolean;
  onBack: () => void;
  onSave: () => void;
  onShare: () => void;
  onApply: () => void;
  onInterview: () => void;
}

export function JobDetail({ job, saved, onBack, onSave, onShare, onApply, onInterview }: JobDetailProps) {
  const score = calculateMatch(job.match);

  return (
    <main className="job-detail" aria-labelledby="job-detail-heading">
      <div className="detail-toolbar">
        <button className="back-button" type="button" onClick={onBack}>
          <ArrowLeft size={17} /> Back to recommendations
        </button>
        <span className="applicant-pill">
          <UsersRound size={14} /> {job.applicants} applicants
        </span>
        <div className="detail-actions">
          <button className="icon-button" type="button" aria-label="Copy share link" onClick={onShare}>
            <Share2 size={17} />
          </button>
          <button
            className={`icon-button ${saved ? "is-saved" : ""}`}
            type="button"
            onClick={onSave}
            aria-label={saved ? "Remove from saved jobs" : "Save job"}
          >
            <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
          </button>
          <button className="dark-button" type="button" onClick={onApply}>
            Review application <ArrowUpRight size={15} />
          </button>
        </div>
      </div>

      <article className="detail-card">
        <div className="detail-hero">
          <div className="company-mark large" style={{ backgroundColor: job.companyColor }}>
            {job.companyMark}
          </div>
          <div className="detail-title-copy">
            <span className="posted-pill">
              <Clock3 size={12} /> {job.posted}
            </span>
            <h1 id="job-detail-heading">{job.title}</h1>
            <p>{job.company}</p>
            <div className="meta-row detail-meta">
              <span>
                <MapPin size={14} /> {job.location}
              </span>
              <span>
                <Radio size={14} /> {job.workMode}
              </span>
            </div>
          </div>
          <MatchRing score={score} size="large" />
        </div>

        <div className="fact-grid">
          <div>
            <MapPin size={16} />
            <span>Location</span>
            <strong>{job.location}</strong>
          </div>
          <div>
            <BriefcaseBusiness size={16} />
            <span>Employment</span>
            <strong>{job.employmentType}</strong>
          </div>
          <div>
            <GraduationCap size={16} />
            <span>Experience</span>
            <strong>{job.seniority}</strong>
          </div>
          <div>
            <Sparkles size={16} />
            <span>Compensation</span>
            <strong>{job.salary}</strong>
          </div>
        </div>

        <section className="description-section">
          <h2>About the role</h2>
          <p>{job.summary}</p>
        </section>

        <section className="interview-cta">
          <span className="cta-icon">
            <Sparkles size={21} />
          </span>
          <div className="cta-heading">
            <p className="eyebrow">Role-aware practice</p>
            <h2>Maximize your interview success</h2>
            <p>Practice the evidence this role is likely to test, then improve with structured feedback.</p>
          </div>
          <div className="cta-features">
            <div>
              <Check size={16} />
              <span>
                <strong>Job-specific questions</strong>
                Calibrated to the responsibilities
              </span>
            </div>
            <div>
              <Check size={16} />
              <span>
                <strong>Actionable feedback</strong>
                Clear next steps after every answer
              </span>
            </div>
            <div>
              <Check size={16} />
              <span>
                <strong>Evidence coaching</strong>
                Turn project work into strong stories
              </span>
            </div>
          </div>
          <button className="dark-button" type="button" onClick={onInterview}>
            Start interview <ArrowUpRight size={15} />
          </button>
        </section>

        <section className="description-section">
          <h2>Qualifications</h2>
          <p>Skills and experience highlighted in this position.</p>
          <div className="qualification-tags">
            {job.qualifications.map((qualification) => (
              <span key={qualification}>{qualification}</span>
            ))}
          </div>
        </section>

        <DetailList title="Required" items={job.required} />
        <DetailList title="Preferred" items={job.preferred} />
        <DetailList title="Responsibilities" items={job.responsibilities} />
        <DetailList title="Benefits" items={job.benefits} />
      </article>
    </main>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="description-section detail-list-section">
      <h2>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
