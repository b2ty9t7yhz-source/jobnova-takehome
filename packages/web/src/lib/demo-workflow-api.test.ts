import { afterEach, describe, expect, it, vi } from "vitest";
import { createDemoApplication } from "../demo-workflow";
import { advanceDemoWorkflow, createDemoWorkflow } from "./demo-workflow-api";

const application = createDemoApplication({
  id: "00000000-0000-4000-8000-000000000003",
  jobId: "research-software-engineer",
  role: "Research Software Engineer",
  company: "Lattice Lab",
  now: "2026-08-23T20:00:00.000Z",
  expiresAt: "2026-08-24T20:00:00.000Z",
});

describe("safe demo API client", () => {
  afterEach(() => vi.restoreAllMocks());

  it("creates and advances same-origin demo records", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      Response.json({ application }, { status: 201 }),
    );

    await expect(createDemoWorkflow(application.jobId)).resolves.toEqual(application);
    await expect(advanceDemoWorkflow(application.id)).resolves.toEqual(application);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/demo/applications",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `/api/demo/applications/${application.id}/advance`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("surfaces bounded API errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ error: "This demo application has expired." }, { status: 404 }),
    );

    await expect(advanceDemoWorkflow(application.id)).rejects.toThrow("has expired");
  });
});
