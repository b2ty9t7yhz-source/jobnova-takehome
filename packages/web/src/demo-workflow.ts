export const demoWorkflowVersion = "safe-demo-v1";

export type DemoApplicationStatus = "pending" | "in_progress" | "manual_action_required";

export type DemoWorkflowStep =
  | "created"
  | "profile_filling"
  | "awaiting_manual_action"
  | "awaiting_review";

export type DemoManualActionKind = "verification_required" | "final_review";

export interface DemoManualAction {
  kind: DemoManualActionKind;
  message: string;
}

export interface DemoWorkflowEvent {
  sequence: number;
  status: DemoApplicationStatus;
  step: DemoWorkflowStep;
  reason: string;
  message: string;
  occurredAt: string;
}

export interface DemoApplication {
  id: string;
  source: "public_demo";
  workflowVersion: typeof demoWorkflowVersion;
  jobId: string;
  role: string;
  company: string;
  status: DemoApplicationStatus;
  step: DemoWorkflowStep;
  attempts: number;
  submitRequests: 0;
  manualAction?: DemoManualAction;
  events: DemoWorkflowEvent[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

interface CreateDemoApplicationInput {
  id: string;
  jobId: string;
  role: string;
  company: string;
  now: string;
  expiresAt: string;
}

export function createDemoApplication(input: CreateDemoApplicationInput): DemoApplication {
  const application: DemoApplication = {
    id: input.id,
    source: "public_demo",
    workflowVersion: demoWorkflowVersion,
    jobId: input.jobId,
    role: input.role,
    company: input.company,
    status: "pending",
    step: "created",
    attempts: 0,
    submitRequests: 0,
    events: [],
    createdAt: input.now,
    updatedAt: input.now,
    expiresAt: input.expiresAt,
  };

  return appendEvent(application, {
    status: "pending",
    step: "created",
    reason: "safe_demo_created",
    message: "Synthetic application record created. No employer site was contacted.",
    occurredAt: input.now,
  });
}

export function advanceDemoApplication(
  application: DemoApplication,
  now: string,
): DemoApplication {
  if (application.step === "created") {
    return appendEvent(
      {
        ...application,
        status: "in_progress",
        step: "profile_filling",
        attempts: application.attempts + 1,
        updatedAt: now,
      },
      {
        status: "in_progress",
        step: "profile_filling",
        reason: "workflow_started",
        message: "Validated synthetic profile fields and prepared a synthetic resume reference.",
        occurredAt: now,
      },
    );
  }

  if (application.step === "profile_filling") {
    return appendEvent(
      {
        ...application,
        status: "manual_action_required",
        step: "awaiting_manual_action",
        manualAction: {
          kind: "verification_required",
          message: "A live workflow would pause for CAPTCHA, SMS, email, or identity verification here.",
        },
        updatedAt: now,
      },
      {
        status: "manual_action_required",
        step: "awaiting_manual_action",
        reason: "verification_required",
        message: "Automation paused instead of solving or bypassing the human verification gate.",
        occurredAt: now,
      },
    );
  }

  if (application.step === "awaiting_manual_action") {
    const { manualAction: removedManualAction, ...applicationWithoutManualAction } = application;
    void removedManualAction;
    const resumed = appendEvent(
      {
        ...applicationWithoutManualAction,
        status: "in_progress",
        step: "profile_filling",
        attempts: application.attempts + 1,
        updatedAt: now,
      },
      {
        status: "in_progress",
        step: "profile_filling",
        reason: "manual_verification_acknowledged",
        message: "Synthetic verification acknowledgement received; the saved workflow resumed.",
        occurredAt: now,
      },
    );

    return appendEvent(
      {
        ...resumed,
        status: "manual_action_required",
        step: "awaiting_review",
        manualAction: {
          kind: "final_review",
          message: "The workflow reached final review and cannot submit from the public demo.",
        },
        updatedAt: now,
      },
      {
        status: "manual_action_required",
        step: "awaiting_review",
        reason: "final_review",
        message: "Final review reached with zero submission requests.",
        occurredAt: now,
      },
    );
  }

  return application;
}

export function isDemoApplication(value: unknown): value is DemoApplication {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DemoApplication>;
  return (
    typeof candidate.id === "string" &&
    candidate.source === "public_demo" &&
    candidate.workflowVersion === demoWorkflowVersion &&
    typeof candidate.jobId === "string" &&
    typeof candidate.role === "string" &&
    typeof candidate.company === "string" &&
    isApplicationStatus(candidate.status) &&
    isWorkflowStep(candidate.step) &&
    typeof candidate.attempts === "number" &&
    candidate.submitRequests === 0 &&
    Array.isArray(candidate.events) &&
    candidate.events.every(isWorkflowEvent) &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string" &&
    typeof candidate.expiresAt === "string"
  );
}

function isApplicationStatus(value: unknown): value is DemoApplicationStatus {
  return value === "pending" || value === "in_progress" || value === "manual_action_required";
}

function isWorkflowStep(value: unknown): value is DemoWorkflowStep {
  return (
    value === "created" ||
    value === "profile_filling" ||
    value === "awaiting_manual_action" ||
    value === "awaiting_review"
  );
}

function isWorkflowEvent(value: unknown): value is DemoWorkflowEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<DemoWorkflowEvent>;
  return (
    typeof event.sequence === "number" &&
    isApplicationStatus(event.status) &&
    isWorkflowStep(event.step) &&
    typeof event.reason === "string" &&
    typeof event.message === "string" &&
    typeof event.occurredAt === "string"
  );
}

function appendEvent(
  application: DemoApplication,
  event: Omit<DemoWorkflowEvent, "sequence">,
): DemoApplication {
  return {
    ...application,
    events: [
      ...application.events,
      {
        ...event,
        sequence: application.events.length + 1,
      },
    ],
  };
}
