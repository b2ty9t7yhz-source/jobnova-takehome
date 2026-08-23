import { SearchX, Sparkles } from "lucide-react";

export function JobListSkeleton() {
  return (
    <div className="job-list" aria-label="Loading recommended jobs" aria-busy="true">
      {[0, 1, 2].map((item) => (
        <div className="job-card skeleton-card" key={item}>
          <span className="skeleton skeleton-ring" />
          <div className="skeleton-copy">
            <span className="skeleton line wide" />
            <span className="skeleton line medium" />
            <span className="skeleton line full" />
            <span className="skeleton line short" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  savedOnly: boolean;
  onReset: () => void;
}

export function EmptyState({ savedOnly, onReset }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{savedOnly ? <Sparkles size={24} /> : <SearchX size={24} />}</span>
      <h2>{savedOnly ? "No saved jobs yet" : "No jobs match these filters"}</h2>
      <p>
        {savedOnly
          ? "Save promising roles to build a focused shortlist."
          : "Try a broader search or lower your minimum match score."}
      </p>
      <button className="dark-button" type="button" onClick={onReset}>
        {savedOnly ? "Explore recommendations" : "Reset filters"}
      </button>
    </div>
  );
}
