import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type LogLevel = "info" | "warn" | "error";

export interface LogEvent {
  timestamp: string;
  level: LogLevel;
  event: string;
  applicationId?: string;
  step?: string;
  status?: string;
  message?: string;
}

export class WorkflowLogger {
  constructor(private readonly filePath: string) {}

  async write(event: Omit<LogEvent, "timestamp">): Promise<void> {
    const entry: LogEvent = { timestamp: new Date().toISOString(), ...event };
    const line = `${JSON.stringify(entry)}\n`;
    await mkdir(dirname(this.filePath), { recursive: true, mode: 0o700 });
    await writeFile(this.filePath, line, { flag: "a", mode: 0o600 });

    const prefix = `[${entry.level.toUpperCase()}] ${entry.event}`;
    const context = [entry.status, entry.step, entry.message].filter(Boolean).join(" · ");
    const output = context ? `${prefix} — ${context}` : prefix;
    if (entry.level === "error") console.error(output);
    else if (entry.level === "warn") console.warn(output);
    else console.log(output);
  }
}
