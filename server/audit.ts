import { appendFile } from "node:fs/promises";
import path from "node:path";

type AuditEvent = {
  username?: string;
  loginTime?: string;
  usedAt?: string;
  feature: "login" | "logout" | "deidentify" | "summarize";
  success: boolean;
  errorType?: string;
};

const logPath = path.resolve(process.cwd(), "operation_logs.jsonl");

export async function writeAuditEvent(event: AuditEvent) {
  const safeEvent = {
    username: event.username ?? "unknown",
    loginTime: event.loginTime,
    usedAt: event.usedAt ?? new Date().toISOString(),
    feature: event.feature,
    success: event.success,
    errorType: event.errorType
  };

  await appendFile(logPath, `${JSON.stringify(safeEvent)}\n`, "utf8").catch(() => {
    // Audit write failures must not expose or retain clinical content.
  });
}
