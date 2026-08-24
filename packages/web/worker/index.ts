import { DemoApplicationRepository } from "../db/demo-application-repository";
import { jobs } from "../src/data/jobs";
import { advanceDemoApplication, createDemoApplication } from "../src/demo-workflow";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
}

const demoTtlMilliseconds = 24 * 60 * 60 * 1000;
const applicationRoute = /^\/api\/demo\/applications\/([0-9a-f-]{36})$/;
const advanceRoute = /^\/api\/demo\/applications\/([0-9a-f-]{36})\/advance$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    try {
      return await handleApiRequest(request, env, url);
    } catch (error) {
      console.error("safe_demo_api_error", error instanceof Error ? error.message : "unknown_error");
      return jsonResponse({ error: "The safe demo could not continue. Please start a fresh demo." }, 500);
    }
  },
} satisfies ExportedHandler<Env>;

async function handleApiRequest(request: Request, env: Env, url: URL): Promise<Response> {
  if (!isSameOriginRequest(request, url)) {
    return jsonResponse({ error: "Cross-origin demo requests are not allowed." }, 403);
  }

  const repository = new DemoApplicationRepository(env.DB);
  await repository.initialize();

  if (request.method === "POST" && url.pathname === "/api/demo/applications") {
    const body = await parseCreateBody(request);
    if (!body) {
      return jsonResponse({ error: "Choose one of the published demo jobs." }, 400);
    }

    const job = jobs.find((candidate) => candidate.id === body.jobId);
    if (!job) {
      return jsonResponse({ error: "The selected role is not part of the synthetic dataset." }, 404);
    }

    const now = new Date();
    await repository.deleteExpired(now.toISOString());
    const application = createDemoApplication({
      id: crypto.randomUUID(),
      jobId: job.id,
      role: job.title,
      company: job.company,
      now: now.toISOString(),
      expiresAt: new Date(now.getTime() + demoTtlMilliseconds).toISOString(),
    });
    await repository.save(application);
    return jsonResponse({ application }, 201);
  }

  const applicationMatch = url.pathname.match(applicationRoute);
  if (request.method === "GET" && applicationMatch?.[1]) {
    const application = await repository.findById(applicationMatch[1]);
    if (!application || application.expiresAt < new Date().toISOString()) {
      return jsonResponse({ error: "This demo application was not found or has expired." }, 404);
    }
    return jsonResponse({ application });
  }

  const advanceMatch = url.pathname.match(advanceRoute);
  if (request.method === "POST" && advanceMatch?.[1]) {
    const application = await repository.findById(advanceMatch[1]);
    if (!application || application.expiresAt < new Date().toISOString()) {
      return jsonResponse({ error: "This demo application was not found or has expired." }, 404);
    }
    if (application.step === "awaiting_review") {
      return jsonResponse({ application });
    }

    const advanced = advanceDemoApplication(application, new Date().toISOString());
    await repository.save(advanced);
    return jsonResponse({ application: advanced });
  }

  return jsonResponse({ error: "Safe demo endpoint not found." }, 404);
}

async function parseCreateBody(request: Request): Promise<{ jobId: string } | null> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return null;
  }
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 1024) return null;

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return null;
  const jobId = (body as { jobId?: unknown }).jobId;
  return typeof jobId === "string" && /^[a-z0-9-]{1,80}$/.test(jobId) ? { jobId } : null;
}

function isSameOriginRequest(request: Request, url: URL): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === url.origin;
}

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff",
      "X-JobNova-Workflow-Version": "safe-demo-v1",
    },
  });
}
