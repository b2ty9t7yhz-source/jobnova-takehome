import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CirclePause,
  FileCheck2,
  LoaderCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  UserRoundCheck,
  X,
} from "lucide-react";
import type { DemoApplication, DemoWorkflowStep } from "../demo-workflow";
import { advanceDemoWorkflow, createDemoWorkflow } from "../lib/demo-workflow-api";
import type { Job } from "../types";

interface SafeApplyPanelProps {
  job: Job | undefined;
  open: boolean;
  onClose: () => void;
}

const workflowSteps = [
  {
    icon: UserRoundCheck,
    title: "Use verified profile data",
    detail: "Only fields already present in the candidate profile are eligible for autofill.",
  },
  {
    icon: FileCheck2,
    title: "Attach the selected resume",
    detail: "The workflow confirms the exact local file before moving to employer questions.",
  },
  {
    icon: CirclePause,
    title: "Pause at every human gate",
    detail: "CAPTCHA, login checks, unknown questions, and legal answers become explicit checkpoints.",
  },
  {
    icon: CheckCircle2,
    title: "Stop at final review",
    detail: "No external application is submitted from this product-demo interaction.",
  },
];

export function SafeApplyPanel({ job, open, onClose }: SafeApplyPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const wasOpenRef = useRef(false);
  const [application, setApplication] = useState<DemoApplication | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setApplication(null);
      setBusy(false);
      setError(null);
    }
    wasOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, [open]);

  if (!open || !job) return null;

  async function startDemo() {
    if (!job) return;
    setBusy(true);
    setError(null);
    try {
      setApplication(await createDemoWorkflow(job.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The safe demo could not start.");
    } finally {
      setBusy(false);
    }
  }

  async function advanceDemo() {
    if (!application) return;
    setBusy(true);
    setError(null);
    try {
      setApplication(await advanceDemoWorkflow(application.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The safe demo could not continue.");
    } finally {
      setBusy(false);
    }
  }

  const action = application ? actionForStep(application.step) : null;

  return (
    <div className="application-layer" role="presentation" onMouseDown={onClose}>
      <section
        ref={panelRef}
        className="application-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="application-review-heading"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="application-panel-header">
          <span className="application-shield" aria-hidden="true">
            <ShieldCheck size={22} />
          </span>
          <div>
            <p className="eyebrow">Safe application preview</p>
            <h2 id="application-review-heading">Review-before-submit workflow</h2>
          </div>
          <button
            ref={closeButtonRef}
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close application preview"
          >
            <X size={18} />
          </button>
        </div>

        <div className="application-job-summary">
          <span className="company-mark large" style={{ backgroundColor: job.companyColor }}>
            {job.companyMark}
          </span>
          <span>
            <strong>{job.title}</strong>
            <small>{job.company} · {job.workMode}</small>
          </span>
        </div>

        {!application ? (
          <>
            <div className="demo-api-intro">
              <span className="live-dot" aria-hidden="true" />
              <span>
                <strong>Connected safe demo</strong>
                Start a synthetic backend workflow and watch its persisted state change in this panel.
              </span>
            </div>

            <ol className="application-checklist">
              {workflowSteps.map(({ icon: Icon, title, detail }, index) => (
                <li key={title}>
                  <span className="application-step-number">{index + 1}</span>
                  <Icon size={18} aria-hidden="true" />
                  <span>
                    <strong>{title}</strong>
                    <small>{detail}</small>
                  </span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <DemoWorkflow application={application} />
        )}

        {error ? <p className="application-error" role="alert">{error}</p> : null}

        <div className="application-safety-note">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>
            <strong>Submission is disabled in this demo.</strong>
            The API stores only synthetic job and workflow state for 24 hours. It receives no profile,
            resume, credentials, cookies, verification codes, or legal answers.
          </span>
        </div>

        <div className="application-panel-actions">
          {application ? (
            <button
              className="secondary-button"
              type="button"
              disabled={busy}
              onClick={() => {
                setApplication(null);
                setError(null);
              }}
            >
              <RotateCcw size={15} aria-hidden="true" />
              Start over
            </button>
          ) : (
            <button className="secondary-button" type="button" onClick={onClose}>
              Back to job
            </button>
          )}
          {application?.step === "awaiting_review" ? (
            <button className="dark-button" type="button" onClick={onClose}>
              <CheckCircle2 size={16} aria-hidden="true" />
              Keep in review mode
            </button>
          ) : (
            <button
              className="dark-button"
              type="button"
              disabled={busy}
              onClick={() => void (application ? advanceDemo() : startDemo())}
            >
              {busy ? (
                <LoaderCircle className="spin" size={16} aria-hidden="true" />
              ) : application ? (
                <ArrowRight size={16} aria-hidden="true" />
              ) : (
                <Play size={16} aria-hidden="true" />
              )}
              {busy ? "Updating safe demo…" : application ? action?.label : "Start safe demo"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function DemoWorkflow({ application }: { application: DemoApplication }) {
  const atVerification = application.step === "awaiting_manual_action";
  const atReview = application.step === "awaiting_review";
  const statusLabel = atReview
    ? "Final review reached"
    : application.status === "manual_action_required"
      ? "Manual action required"
      : application.status === "in_progress"
        ? "In progress"
        : "Pending";

  return (
    <div className="demo-workflow" aria-live="polite">
      <div className="workflow-summary">
        <span className={`workflow-status status-${application.status}`}>{statusLabel}</span>
        <span>Demo #{application.id.slice(0, 8)}</span>
        <span>Submit requests: <strong>{application.submitRequests}</strong></span>
      </div>

      {atVerification || atReview ? (
        <div className={`manual-gate ${atReview ? "is-review" : ""}`} role="status">
          {atReview ? <ShieldCheck size={20} aria-hidden="true" /> : <AlertTriangle size={20} aria-hidden="true" />}
          <span>
            <strong>{atReview ? "Human-controlled final review" : "Automation paused safely"}</strong>
            {application.manualAction?.message}
            {!atReview ? " This button acknowledges only a synthetic gate; it does not solve a CAPTCHA." : null}
          </span>
        </div>
      ) : null}

      <ol className="workflow-timeline" aria-label="Application workflow history">
        {application.events.map((event) => (
          <li key={event.sequence}>
            <span className="timeline-marker" aria-hidden="true">
              {event.sequence}
            </span>
            <span>
              <strong>{formatReason(event.reason)}</strong>
              <small>{event.message}</small>
            </span>
            <span className="timeline-status">{formatStep(event.step)}</span>
          </li>
        ))}
      </ol>

      <p className="workflow-receipt">
        <ShieldCheck size={15} aria-hidden="true" />
        Receipt: {application.workflowVersion} · synthetic D1 record · expires in 24 hours
      </p>
    </div>
  );
}

function actionForStep(step: DemoWorkflowStep): { label: string } | null {
  const labels: Partial<Record<DemoWorkflowStep, string>> = {
    created: "Begin profile check",
    profile_filling: "Continue to verification gate",
    awaiting_manual_action: "Acknowledge simulated verification",
  };
  const label = labels[step];
  return label ? { label } : null;
}

function formatReason(reason: string): string {
  return reason
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatStep(step: DemoWorkflowStep): string {
  return step.replaceAll("_", " ");
}
