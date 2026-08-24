import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { EmptyState, JobListSkeleton } from "./components/JobListStates";
import { FilterSheet } from "./components/FilterSheet";
import { InterviewPanel } from "./components/InterviewPanel";
import { JobCard } from "./components/JobCard";
import { JobDetail } from "./components/JobDetail";
import { MatchInsights } from "./components/MatchInsights";
import { MobileNav } from "./components/MobileNav";
import { SearchToolbar } from "./components/SearchToolbar";
import { SafeApplyPanel } from "./components/SafeApplyPanel";
import { Sidebar } from "./components/Sidebar";
import { Toast } from "./components/Toast";
import { jobs } from "./data/jobs";
import { filterJobs } from "./lib/recommendation";
import type { JobFilters } from "./types";

const defaultFilters: JobFilters = { workMode: "All", minimumMatch: 0 };
const savedJobsStorageKey = "jobnova.saved-jobs.v1";

export default function App() {
  const initialJobId = getJobIdFromHash();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<JobFilters>(defaultFilters);
  const [savedIds, setSavedIds] = useState<Set<string>>(loadSavedJobs);
  const [activeTab, setActiveTab] = useState<"matched" | "saved">("matched");
  const [page, setPage] = useState<"list" | "detail">(initialJobId ? "detail" : "list");
  const [selectedJobId, setSelectedJobId] = useState(initialJobId ?? jobs[0]?.id ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [applicationReviewOpen, setApplicationReviewOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 420);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    function syncFromLocation() {
      const jobId = getJobIdFromHash();
      if (jobId) {
        setSelectedJobId(jobId);
        setPage("detail");
      } else {
        setPage("list");
      }
    }

    window.addEventListener("popstate", syncFromLocation);
    window.addEventListener("hashchange", syncFromLocation);
    return () => {
      window.removeEventListener("popstate", syncFromLocation);
      window.removeEventListener("hashchange", syncFromLocation);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    window.localStorage.setItem(savedJobsStorageKey, JSON.stringify([...savedIds]));
  }, [savedIds]);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if (event.key.toLocaleLowerCase() !== "k" || (!event.metaKey && !event.ctrlKey)) return;
      event.preventDefault();
      setPage("list");
      window.requestAnimationFrame(() => searchInputRef.current?.focus());
    }

    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const visibleJobs = useMemo(
    () => filterJobs(jobs, query, filters, activeTab === "saved", savedIds),
    [query, filters, activeTab, savedIds],
  );

  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? jobs[0];

  function openJob(jobId: string) {
    setSelectedJobId(jobId);
    setPage("detail");
    window.history.pushState(null, "", `#job=${encodeURIComponent(jobId)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showJobList() {
    setPage("list");
    window.history.pushState(null, "", `${window.location.pathname}${window.location.search}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function changeTab(tab: "matched" | "saved") {
    setActiveTab(tab);
    if (page === "detail") showJobList();
  }

  function toggleSaved(jobId: string) {
    setSavedIds((current) => {
      const next = new Set(current);
      if (next.has(jobId)) {
        next.delete(jobId);
        setToast("Removed from saved jobs");
      } else {
        next.add(jobId);
        setToast("Saved to your shortlist");
      }
      return next;
    });
  }

  function resetDiscovery() {
    setQuery("");
    setFilters(defaultFilters);
    setActiveTab("matched");
  }

  function showInterviewToast() {
    setToast("Role-aware interview coaching is a product concept in this focused prototype");
  }

  function showApplicationReview() {
    setApplicationReviewOpen(true);
  }

  function showPrototypeNotice(feature: string) {
    if (feature === "Jobs") {
      resetDiscovery();
      showJobList();
      return;
    }
    setToast(`${feature} is shown as a product concept outside this focused recommendation slice`);
  }

  async function copyShareLink() {
    if (!selectedJob) return;
    const shareUrl = new URL(window.location.href);
    shareUrl.hash = `job=${encodeURIComponent(selectedJob.id)}`;
    window.history.replaceState(null, "", shareUrl);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(shareUrl.toString());
      setToast("Share link copied to clipboard");
    } catch {
      setToast("Share link is ready in the address bar");
    }
  }

  return (
    <div className="app-shell">
      <Sidebar onSelect={showPrototypeNotice} />
      <div className="app-main">
        <AppHeader
          activeTab={activeTab}
          matchedCount={jobs.length}
          savedCount={savedIds.size}
          onTabChange={changeTab}
          onMenuOpen={() => setToast("Primary destinations are available in the navigation below")}
          onNotificationsOpen={() => showPrototypeNotice("Notifications")}
          onProfileOpen={() => showPrototypeNotice("Profile")}
        />
        {page === "list" ? (
          <div className="list-layout">
            <main className="list-column">
              <SearchToolbar
                inputRef={searchInputRef}
                query={query}
                filters={filters}
                resultCount={visibleJobs.length}
                onQueryChange={setQuery}
                onFilterOpen={() => setFiltersOpen(true)}
                onPreferenceOpen={() => setFiltersOpen(true)}
              />
              {loading ? (
                <JobListSkeleton />
              ) : visibleJobs.length > 0 ? (
                <div className="job-list" aria-live="polite">
                  {visibleJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      saved={savedIds.has(job.id)}
                      onOpen={() => openJob(job.id)}
                      onSave={() => toggleSaved(job.id)}
                      onInterview={showInterviewToast}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState savedOnly={activeTab === "saved"} onReset={resetDiscovery} />
              )}
            </main>
            <InterviewPanel onStart={showInterviewToast} />
          </div>
        ) : selectedJob ? (
          <div className="detail-layout">
            <JobDetail
              job={selectedJob}
              saved={savedIds.has(selectedJob.id)}
              onBack={showJobList}
              onSave={() => toggleSaved(selectedJob.id)}
              onShare={() => void copyShareLink()}
              onApply={showApplicationReview}
              onInterview={showInterviewToast}
            />
            <MatchInsights
              job={selectedJob}
              onImproveProfile={() => showPrototypeNotice("Profile evidence editor")}
            />
          </div>
        ) : null}
      </div>
      <MobileNav activeTab={activeTab} onTabChange={changeTab} />
      <FilterSheet
        open={filtersOpen}
        filters={filters}
        onChange={setFilters}
        onClose={() => setFiltersOpen(false)}
        onReset={() => setFilters(defaultFilters)}
      />
      <Toast message={toast} onClose={() => setToast(null)} />
      <SafeApplyPanel
        job={selectedJob}
        open={applicationReviewOpen}
        onClose={() => setApplicationReviewOpen(false)}
      />
    </div>
  );
}

function loadSavedJobs(): Set<string> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(savedJobsStorageKey) ?? "null");
    if (Array.isArray(parsed) && parsed.every((value) => typeof value === "string")) {
      return new Set(parsed);
    }
  } catch {
    // Fall back to the product-demo shortlist when local storage is unavailable or malformed.
  }
  return new Set(["network-infrastructure-engineer"]);
}

function getJobIdFromHash(): string | undefined {
  const jobId = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("job");
  return jobId && jobs.some((job) => job.id === jobId) ? jobId : undefined;
}
