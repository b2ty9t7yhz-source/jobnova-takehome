import { AlertTriangle, ArrowUpRight, CheckCircle2, FileClock, Sparkles } from "lucide-react";
import {
  candidateEvidence,
  candidateProfileVersion,
} from "../data/candidate-evidence";
import { recommendationPolicy } from "../lib/recommendation";
import type { Job, MatchCategory } from "../types";

const labels: Record<MatchCategory, string> = {
  skills: "Skills",
  experience: "Experience",
  education: "Education",
  preferences: "Preferences",
};

interface MatchInsightsProps {
  job: Job;
  onImproveProfile: () => void;
}

export function MatchInsights({ job, onImproveProfile }: MatchInsightsProps) {
  const categories = Object.entries(job.match) as Array<[MatchCategory, number]>;
  const evidenceIds = [...new Set(job.recommendationReasons.flatMap((reason) => reason.evidenceIds))];

  return (
    <aside className="match-insights" aria-labelledby="fit-heading">
      <div className="insight-glow" />
      <div className="insight-header">
        <span className="panel-icon">
          <Sparkles size={18} />
        </span>
        <p className="eyebrow">Explainable recommendation</p>
        <h2 id="fit-heading">Why is this a good fit for you?</h2>
        <p>Every score comes from visible profile evidence—not a black-box label.</p>
      </div>
      <div className="score-grid">
        {categories.map(([category, value]) => (
          <div key={category}>
            <strong>{value}%</strong>
            <span>{labels[category]}</span>
            <div className="score-track">
              <span style={{ width: `${value}%` }} />
            </div>
          </div>
        ))}
      </div>
      <section className="evidence-section">
        <h3>
          Relevant evidence <span>{job.recommendationReasons.length}</span>
        </h3>
        <ul>
          {job.recommendationReasons.map((reason) => (
            <li key={reason.text}>
              <CheckCircle2 size={16} />
              <span>
                {reason.text}
                <small className="evidence-links">
                  {reason.evidenceIds.map((evidenceId) => (
                    <code key={evidenceId}>{evidenceId}</code>
                  ))}
                </small>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="gap-section">
        <h3>
          <AlertTriangle size={15} /> Gaps to consider
        </h3>
        {job.gaps.map((gap) => (
          <p key={gap}>{gap}</p>
        ))}
      </section>
      <button className="insight-upgrade" type="button" onClick={onImproveProfile}>
        Improve your profile evidence <ArrowUpRight size={15} />
      </button>
      <details className="recommendation-receipt">
        <summary>
          <FileClock size={15} /> Recommendation receipt
        </summary>
        <p>
          A reproducible record of what produced this recommendation. The demo runs locally with no external
          model call.
        </p>
        <dl>
          <div>
            <dt>Profile</dt>
            <dd>{candidateProfileVersion}</dd>
          </div>
          <div>
            <dt>Policy</dt>
            <dd>{recommendationPolicy.id}</dd>
          </div>
          <div>
            <dt>Job</dt>
            <dd>{job.id}</dd>
          </div>
        </dl>
        <div className="receipt-evidence">
          {evidenceIds.map((evidenceId) => {
            const evidence = candidateEvidence[evidenceId];
            return (
              <article key={evidenceId}>
                <code>{evidence.id}</code>
                <span>{evidence.source}</span>
                <strong>{evidence.label}</strong>
                <p>{evidence.detail}</p>
              </article>
            );
          })}
        </div>
      </details>
      <p className="method-note">
        Weighted from skills 40%, experience 25%, education 20%, preferences 15%.
      </p>
    </aside>
  );
}
