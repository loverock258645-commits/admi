import {
  createConfirmationToken,
  verifyConfirmationToken
} from "../server/confirmationToken.js";
import { deIdentifyMedicalText } from "../server/deidentify.js";
import {
  checkDeidentifiedTextRisk,
  checkSummaryOutputRisk
} from "../server/riskCheck.js";

type TestResult = {
  name: string;
  passed: boolean;
  detail: string;
};

process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? "test-secret-for-security-workflow-at-least-32-chars";

const results: TestResult[] = [];

function addResult(name: string, passed: boolean, detail: string) {
  results.push({ name, passed, detail });
}

const original = `Patient Name: Test Patient
MRN: TEST-12345
ID No: A123456789
Phone: 0912-345-678
DOB: 1940-01-01
Admission Date: 2026-07-22
Family meeting documented DNR and comfort care.
`;

const deidentified = deIdentifyMedicalText(original);
const { confirmationToken } = createConfirmationToken(deidentified);

addResult(
  "確認憑證可驗證同一段去識別化文字",
  verifyConfirmationToken(deidentified, confirmationToken),
  "same text"
);

addResult(
  "確認憑證不可套用到被修改過的文字",
  !verifyConfirmationToken(`${deidentified}\nextra`, confirmationToken),
  "modified text rejected"
);

const privacyRisk = checkDeidentifiedTextRisk(
  "Patient Name: Jane Test\nMRN: ABC-12345\nDOB: 1940-01-01\nPhone: 0912345678"
);
addResult(
  "摘要前風險檢查會擋疑似未遮蔽個資",
  privacyRisk.blockingIssues.length >= 3,
  privacyRisk.blockingIssues.join(", ")
);

const cleanRisk = checkDeidentifiedTextRisk(deidentified);
addResult(
  "摘要前風險檢查不會擋已遮蔽假病歷",
  cleanRisk.blockingIssues.length === 0,
  cleanRisk.blockingIssues.join(", ") || "no blocking issues"
);

const outputRisk = checkSummaryOutputRisk(
  "Family meeting documented DNR, comfort care, hospice and withhold tube feeding.",
  "家屬已了解病況，後續以症狀控制為主。"
);
addResult(
  "摘要後 QA 會提示漏掉安寧決策關鍵字",
  outputRisk.warnings.length >= 3,
  outputRisk.warnings.join(", ")
);

const adviceRisk = checkSummaryOutputRisk(
  "Patient had dyspnea.",
  "建議治療應立即使用抗生素。"
);
addResult(
  "摘要後 QA 會提示過度醫療建議語氣",
  adviceRisk.warnings.includes("摘要可能出現過度醫療建議語氣"),
  adviceRisk.warnings.join(", ")
);

const passed = results.filter((result) => result.passed).length;
const failed = results.length - passed;

console.log("安全流程測試結果");
console.log("================");
console.log(`通過：${passed}`);
console.log(`失敗：${failed}`);
console.log("");

for (const result of results) {
  console.log(`${result.passed ? "PASS" : "FAIL"} ${result.name} - ${result.detail}`);
}

if (failed > 0) {
  process.exit(1);
}
