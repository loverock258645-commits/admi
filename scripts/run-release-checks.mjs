import { existsSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const operationLogPath = path.resolve(process.cwd(), "operation_logs.jsonl");
const operationLogBackupPath = path.join(
  tmpdir(),
  `admi-operation_logs-${Date.now()}.jsonl.bak`
);

const checks = [
  "typecheck",
  "build",
  "test:fixtures",
  "test:pdf-fixtures",
  "test:local-deidentify",
  "test:summary-postprocess",
  "test:security-workflow"
];

function runNpmScript(scriptName) {
  console.log("");
  console.log(`==> npm run ${scriptName}`);
  const result = spawnSync(npmCommand, ["run", scriptName], {
    stdio: "inherit",
    shell: false
  });

  if (result.status !== 0) {
    throw new Error(`${scriptName} failed`);
  }
}

let movedOperationLog = false;

try {
  if (existsSync(operationLogPath)) {
    renameSync(operationLogPath, operationLogBackupPath);
    movedOperationLog = true;
    console.log("Temporarily moved operation_logs.jsonl before fixture tests.");
  }

  for (const check of checks) {
    runNpmScript(check);
  }

  console.log("");
  console.log("Release checks passed.");
} catch (error) {
  console.error("");
  console.error(`Release checks failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  if (movedOperationLog && existsSync(operationLogBackupPath)) {
    renameSync(operationLogBackupPath, operationLogPath);
    console.log("Restored operation_logs.jsonl.");
  }
}
