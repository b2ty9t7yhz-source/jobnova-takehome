import { useEffect, useRef } from "react";
import {
  CheckCircle2,
  CirclePause,
  FileCheck2,
  ShieldCheck,
  UserRoundCheck,
  X,
} from "lucide-react";
import type { Job } from "../types";

interface SafeApplyPanelProps {
  job: Job | undefined;
  open: boolean;
  onClose: () => void;
  onAcknowledge: () => void;
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

export function SafeApplyPanel({ job, open, onClose, onAcknowledge }: SafeApplyPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

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

        <div className="application-safety-note">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>
            <strong>Submission is disabled in this demo.</strong>
            This preview opens no employer site, transmits no profile data, and requires no CAPTCHA.
          </span>
        </div>

        <div className="application-panel-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Back to job
          </button>
          <button className="dark-button" type="button" onClick={onAcknowledge}>
            Keep in review mode
          </button>
        </div>
      </section>
    </div>
  );
}
