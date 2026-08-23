import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ApplicationRepository,
  normalizeJobKey,
} from "../src/storage/application-repository.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe("application repository", () => {
  it("deduplicates Indeed tracking variants by job key", async () => {
    const directory = await mkdtemp(join(tmpdir(), "jobnova-repository-"));
    temporaryDirectories.push(directory);
    const repository = new ApplicationRepository(join(directory, "applications.json"));

    const first = await repository.createOrGet({
      jobUrl: "https://www.indeed.com/viewjob?jk=abc123&utm_source=test",
    });
    const duplicate = await repository.createOrGet({
      jobUrl: "https://www.indeed.com/viewjob?from=search&jk=abc123",
    });

    expect(first.created).toBe(true);
    expect(duplicate.created).toBe(false);
    expect(duplicate.record.id).toBe(first.record.id);
    expect(await repository.list()).toHaveLength(1);
  });

  it("persists pause details and keeps the repository valid JSON", async () => {
    const directory = await mkdtemp(join(tmpdir(), "jobnova-repository-"));
    temporaryDirectories.push(directory);
    const filePath = join(directory, "applications.json");
    const repository = new ApplicationRepository(filePath);
    const { record } = await repository.createOrGet({
      jobUrl: "https://www.indeed.com/viewjob?jk=pause-me",
    });

    await repository.transition(record.id, "in_progress", "job_opened", "start");
    const paused = await repository.pause(record.id, {
      kind: "unknown_question",
      message: "User judgment required.",
      fields: ["Desired salary"],
      detectedAt: "2026-08-18T12:05:00.000Z",
    });

    expect(paused.status).toBe("manual_action_required");
    expect(paused.manualAction?.fields).toEqual(["Desired salary"]);
    const persisted = await readFile(filePath, "utf8");
    expect(() => JSON.parse(persisted)).not.toThrow();
  });

  it("normalizes non-Indeed URLs without tracking parameters", () => {
    expect(normalizeJobKey("https://example.com/jobs/1?utm_source=x&team=platform#top")).toBe(
      "https://example.com/jobs/1?team=platform",
    );
  });
});
