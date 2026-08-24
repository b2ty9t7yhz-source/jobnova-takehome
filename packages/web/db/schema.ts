import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const demoApplications = sqliteTable(
  "demo_applications",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id").notNull(),
    status: text("status").notNull(),
    step: text("step").notNull(),
    payloadJson: text("payload_json").notNull(),
    updatedAt: text("updated_at").notNull(),
    expiresAt: text("expires_at").notNull(),
  },
  (table) => [index("idx_demo_applications_expires_at").on(table.expiresAt)],
);
