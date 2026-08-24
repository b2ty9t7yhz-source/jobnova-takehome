import type { DemoApplication } from "../src/demo-workflow";
import { isDemoApplication } from "../src/demo-workflow";

const createTableSql = `
  CREATE TABLE IF NOT EXISTS demo_applications (
    id TEXT PRIMARY KEY NOT NULL,
    job_id TEXT NOT NULL,
    status TEXT NOT NULL,
    step TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  )
`;

const createExpiryIndexSql = `
  CREATE INDEX IF NOT EXISTS idx_demo_applications_expires_at
  ON demo_applications(expires_at)
`;

export class DemoApplicationRepository {
  constructor(private readonly db: D1Database) {}

  async initialize(): Promise<void> {
    await this.db.batch([
      this.db.prepare(createTableSql),
      this.db.prepare(createExpiryIndexSql),
    ]);
    await this.db.prepare("PRAGMA optimize").run();
  }

  async deleteExpired(now: string): Promise<void> {
    await this.db.prepare("DELETE FROM demo_applications WHERE expires_at < ?1").bind(now).run();
  }

  async findById(id: string): Promise<DemoApplication | null> {
    const row = await this.db
      .prepare("SELECT payload_json FROM demo_applications WHERE id = ?1 LIMIT 1")
      .bind(id)
      .first<{ payload_json: string }>();

    if (!row) return null;
    const parsed: unknown = JSON.parse(row.payload_json);
    if (!isDemoApplication(parsed)) {
      throw new Error("Stored demo application is invalid.");
    }
    return parsed;
  }

  async save(application: DemoApplication): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO demo_applications
          (id, job_id, status, step, payload_json, updated_at, expires_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        ON CONFLICT(id) DO UPDATE SET
          status = excluded.status,
          step = excluded.step,
          payload_json = excluded.payload_json,
          updated_at = excluded.updated_at,
          expires_at = excluded.expires_at`,
      )
      .bind(
        application.id,
        application.jobId,
        application.status,
        application.step,
        JSON.stringify(application),
        application.updatedAt,
        application.expiresAt,
      )
      .run();
  }
}
