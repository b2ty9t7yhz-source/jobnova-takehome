import type { DemoApplication } from "../demo-workflow";

interface ApiEnvelope {
  application: DemoApplication;
}

interface ApiErrorEnvelope {
  error?: string;
}

export async function createDemoWorkflow(jobId: string): Promise<DemoApplication> {
  return requestDemoWorkflow("/api/demo/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId }),
  });
}

export async function advanceDemoWorkflow(applicationId: string): Promise<DemoApplication> {
  return requestDemoWorkflow(`/api/demo/applications/${encodeURIComponent(applicationId)}/advance`, {
    method: "POST",
  });
}

export async function getDemoWorkflow(applicationId: string): Promise<DemoApplication> {
  return requestDemoWorkflow(`/api/demo/applications/${encodeURIComponent(applicationId)}`);
}

async function requestDemoWorkflow(url: string, init?: RequestInit): Promise<DemoApplication> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });

  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorBody = body as ApiErrorEnvelope;
    throw new Error(errorBody.error ?? `Safe demo request failed with status ${response.status}.`);
  }

  return (body as ApiEnvelope).application;
}
