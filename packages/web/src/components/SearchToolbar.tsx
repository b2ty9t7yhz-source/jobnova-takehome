import { BriefcaseBusiness, SlidersHorizontal, Sparkles } from "lucide-react";
import type { RefObject } from "react";
import type { JobFilters } from "../types";

interface SearchToolbarProps {
  inputRef: RefObject<HTMLInputElement | null>;
  query: string;
  filters: JobFilters;
  resultCount: number;
  onQueryChange: (value: string) => void;
  onFilterOpen: () => void;
  onPreferenceOpen: () => void;
}

export function SearchToolbar({
  inputRef,
  query,
  filters,
  resultCount,
  onQueryChange,
  onFilterOpen,
  onPreferenceOpen,
}: SearchToolbarProps) {
  const activeFilters = Number(filters.workMode !== "All") + Number(filters.minimumMatch > 0);

  return (
    <section className="search-section" aria-labelledby="recommended-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Personalized for your profile</p>
          <h1 id="recommended-heading">Recommended jobs</h1>
          <p className="demo-disclosure">Demo dataset · roles and activity are illustrative</p>
        </div>
        <p className="result-count">{resultCount} strong matches</p>
      </div>
      <div className="toolbar-row">
        <label className="search-input">
          <BriefcaseBusiness size={18} aria-hidden="true" />
          <span className="sr-only">Search recommended jobs</span>
          <input
            ref={inputRef}
            type="search"
            aria-label="Search recommended jobs"
            placeholder="Search role, company, location or skill"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <kbd>⌘ K</kbd>
        </label>
        <button className="filter-button" type="button" onClick={onFilterOpen}>
          <SlidersHorizontal size={17} />
          Filters
          {activeFilters > 0 && <span>{activeFilters}</span>}
        </button>
      </div>
      <button className="preference-banner" type="button" onClick={onPreferenceOpen}>
        <span className="preference-icon">
          <Sparkles size={16} />
        </span>
        <span>
          <strong>Software engineering · New grad & internship</strong>
          <small>Remote or North Carolina · Full time</small>
        </span>
        <span className="preference-action">Change preferences</span>
      </button>
    </section>
  );
}
