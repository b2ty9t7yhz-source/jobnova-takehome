import type {
  ApplicationRecord,
  ApplicationStatus,
  TransitionEvent,
  WorkflowStep,
} from "./application.js";

const allowedTransitions: Record<ApplicationStatus, ReadonlySet<ApplicationStatus>> = {
  pending: new Set(["in_progress", "failed"]),
  in_progress: new Set(["manual_action_required", "submitted", "failed"]),
  manual_action_required: new Set(["in_progress", "failed"]),
  failed: new Set(["in_progress"]),
  submitted: new Set(),
};

export class InvalidStatusTransitionError extends Error {
  constructor(from: ApplicationStatus, to: ApplicationStatus) {
    super(`Invalid application status transition: ${from} -> ${to}`);
    this.name = "InvalidStatusTransitionError";
  }
}

export function canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return from === to || allowedTransitions[from].has(to);
}

export function transitionApplication(
  record: ApplicationRecord,
  to: ApplicationStatus,
  step: WorkflowStep,
  reason: string,
  at = new Date().toISOString(),
): ApplicationRecord {
  if (!canTransition(record.status, to)) {
    throw new InvalidStatusTransitionError(record.status, to);
  }

  const event: TransitionEvent = {
    at,
    from: record.status,
    to,
    step,
    reason,
  };

  const next: ApplicationRecord = {
    ...record,
    status: to,
    currentStep: step,
    updatedAt: at,
    attempts: to === "in_progress" && record.status !== "in_progress" ? record.attempts + 1 : record.attempts,
    history: [...record.history, event],
  };

  if (to !== "manual_action_required") delete next.manualAction;

  return next;
}
