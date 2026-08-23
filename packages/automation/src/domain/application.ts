export const applicationStatuses = [
  "pending",
  "in_progress",
  "submitted",
  "failed",
  "manual_action_required",
] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];

export const applicationSources = ["live", "demo"] as const;

export type ApplicationSource = (typeof applicationSources)[number];

export const workflowSteps = [
  "created",
  "job_opened",
  "application_started",
  "profile_filling",
  "awaiting_manual_action",
  "awaiting_review",
  "submitting",
  "complete",
] as const;

export type WorkflowStep = (typeof workflowSteps)[number];

export type ManualActionKind =
  | "captcha"
  | "sms_verification"
  | "email_verification"
  | "device_verification"
  | "login_required"
  | "unknown_question"
  | "external_application"
  | "final_review"
  | "unsupported_step"
  | "submission_unconfirmed";

export interface TransitionEvent {
  at: string;
  from: ApplicationStatus;
  to: ApplicationStatus;
  step: WorkflowStep;
  reason: string;
}

export interface ManualAction {
  kind: ManualActionKind;
  message: string;
  detectedAt: string;
  fields: string[];
}

export interface FailureDetails {
  message: string;
  failedAt: string;
  step: WorkflowStep;
  url: string;
  screenshotPath?: string;
}

export interface ApplicationRecord {
  id: string;
  jobKey: string;
  jobUrl: string;
  source?: ApplicationSource;
  status: ApplicationStatus;
  currentStep: WorkflowStep;
  title?: string;
  company?: string;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  history: TransitionEvent[];
  manualAction?: ManualAction;
  lastFailure?: FailureDetails;
}

export interface NewApplication {
  jobUrl: string;
  title?: string;
  company?: string;
  source?: ApplicationSource;
}

export interface ApplicationDatabase {
  version: 1;
  applications: ApplicationRecord[];
}
