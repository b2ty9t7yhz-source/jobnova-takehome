import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { seedDemoApplications } from "../src/demo/seed-demo.js";
import { ApplicationRepository } from "../src/storage/application-repository.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe("synthetic workflow demo", () => {
  it("creates every required status without personal data or browser access", async () => {
    const directory = await mkdtemp(join(tmpdir(), "jobnova-demo-"));
    temporaryDirectories.push(directory);
    const repository = new ApplicationRepository(join(directory, "applications.json"));

    const records = await seedDemoApplications(repository);

    expect(new Set(records.map((record) => record.status))).toEqual(
      new Set(["pending", "in_progress", "manual_action_required", "failed", "submitted"]),
    );
    expect(records).toHaveLength(5);
    expect(records.every((record) => record.source === "demo")).toBe(true);
    expect(
      records.every((record) => /demo|synthetic/i.test(record.company ?? "")),
    ).toBe(true);
  });

  it("is idempotent when run more than once", async () => {
    const directory = await mkdtemp(join(tmpdir(), "jobnova-demo-"));
    temporaryDirectories.push(directory);
    const repository = new ApplicationRepository(join(directory, "applications.json"));

    await seedDemoApplications(repository);
    const secondRun = await seedDemoApplications(repository);

    expect(secondRun).toHaveLength(5);
  });
});
