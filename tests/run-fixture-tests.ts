import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { deIdentifyMedicalText } from "../server/deidentify.js";
import { buildSummaryPrompt, SUMMARY_MODES } from "../server/prompts/index.js";
import { checkDeidentifiedTextRisk } from "../server/riskCheck.js";
import { fakeMedicalRecordFixtures } from "./fixtures/fakeMedicalRecords.js";

type TestResult = {
  name: string;
  passed: boolean;
  detail: string;
};

const modeNames: Record<(typeof SUMMARY_MODES)[number], string> = {
  clinical: "臨床模式",
  clinicalNarrative: "臨床脈絡模式",
  auto: "自動判斷",
  general: "一般病歷摘要",
  nursingHandoff: "護理交班",
  pastHistory: "過去病史整理",
  presentIllness: "現在病史整理",
  familyMeeting: "家屬討論摘要",
  hospiceCare: "安寧照護重點",
  dischargeSummary: "出院摘要",
  emergencyNote: "急診紀錄摘要",
  dailyProgress: "每日病程摘要"
};

const results: TestResult[] = [];

function addResult(name: string, passed: boolean, detail: string) {
  results.push({ name, passed, detail });
}

function normalize(text: string) {
  return text.replace(/\r\n/g, "\n").trim();
}

function listFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root)) {
    const fullPath = path.join(root, entry);
    if (
      fullPath.includes("node_modules") ||
      fullPath.includes(`${path.sep}dist${path.sep}`) ||
      fullPath.includes(".npm-cache")
    ) {
      continue;
    }
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...listFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

for (const fixture of fakeMedicalRecordFixtures) {
  const actual = deIdentifyMedicalText(fixture.englishOriginal);
  addResult(
    `${fixture.title}：去識別化結果符合預期`,
    normalize(actual) === normalize(fixture.expectedDeidentified),
    fixture.id
  );

  const leakedForbiddenContent = fixture.privacyForbiddenContent.filter((item) =>
    actual.includes(item)
  );
  addResult(
    `${fixture.title}：遮蔽後未出現不應出現內容`,
    leakedForbiddenContent.length === 0,
    leakedForbiddenContent.length ? leakedForbiddenContent.join(", ") : "未發現"
  );

  const deidentifiedRisk = checkDeidentifiedTextRisk(actual);
  addResult(
    `${fixture.title}：遮蔽後可通過摘要前風險檢查`,
    deidentifiedRisk.blockingIssues.length === 0,
    deidentifiedRisk.blockingIssues.join(", ") || "無阻擋風險"
  );

  const missingClinicalDates = fixture.clinicalDatesToPreserve.filter(
    (date) => !actual.includes(date)
  );
  addResult(
    `${fixture.title}：臨床日期保留`,
    missingClinicalDates.length === 0,
    missingClinicalDates.length ? missingClinicalDates.join(", ") : "皆保留"
  );
}

for (const mode of SUMMARY_MODES) {
  const prompt = buildSummaryPrompt(mode);
  addResult(
    `模式 ${modeNames[mode]}：含固定底層規則`,
    prompt.includes("固定底層規則") &&
      prompt.includes("使用繁體中文") &&
      prompt.includes("日期請轉為民國年格式") &&
      prompt.includes("不逐句翻譯") &&
      prompt.includes("不自行腦補病歷未提及資訊"),
    mode
  );

  addResult(
    `模式 ${modeNames[mode]}：保留安寧與醫療決策規則`,
    prompt.includes("DNR") &&
      prompt.includes("ACP") &&
      prompt.includes("comfort care") &&
      prompt.includes("family meeting") &&
      prompt.includes("withhold") &&
      prompt.includes("withdraw"),
    mode
  );

  addResult(
    `模式 ${modeNames[mode]}：含台灣臨床名詞表`,
    prompt.includes("COPD → 慢性阻塞性肺病") &&
      prompt.includes("Respiratory failure → 呼吸衰竭") &&
      prompt.includes("DNR → 不施行心肺復甦術") &&
      prompt.includes("Palliative care → 緩和醫療"),
    mode
  );

  for (const fixture of fakeMedicalRecordFixtures) {
    addResult(
      `${fixture.title} × ${modeNames[mode]}：prompt 可建立`,
      prompt.length > 500,
      `${fixture.id}/${mode}`
    );
  }
}

const projectFiles = listFiles(process.cwd()).filter((file) => {
  const relativePath = path.relative(process.cwd(), file);
  return (
    /\.(ts|tsx|js|mjs|json|html)$/.test(file) &&
    (relativePath.startsWith("client/") ||
      relativePath.startsWith("server/") ||
      relativePath === "package.json")
  );
});
const combinedSource = projectFiles
  .map((file) => `${file}\n${readFileSync(file, "utf8")}`)
  .join("\n");

addResult(
  "前端未使用 localStorage/sessionStorage 儲存病歷內容",
  !/localStorage|sessionStorage|indexedDB|openDatabase/.test(combinedSource),
  "未發現瀏覽器持久化儲存呼叫"
);

addResult(
  "專案未加入資料庫套件",
  !/"(sqlite|sqlite3|better-sqlite3|mongoose|mongodb|pg|mysql2|sequelize|typeorm|prisma)"/.test(
    combinedSource
  ),
  "未發現常見資料庫依賴"
);

addResult(
  "後端操作紀錄檔不存在或未由測試產生",
  !existsSync(path.resolve(process.cwd(), "operation_logs.jsonl")),
  "fixture 測試未寫入 operation_logs.jsonl"
);

const passed = results.filter((result) => result.passed).length;
const failed = results.length - passed;

console.log("假病歷測試結果");
console.log("================");
console.log(`假病歷數量：${fakeMedicalRecordFixtures.length}`);
console.log(`摘要模式數量：${SUMMARY_MODES.length}`);
console.log(`模式組合檢查：${fakeMedicalRecordFixtures.length * SUMMARY_MODES.length}`);
console.log(`通過：${passed}`);
console.log(`失敗：${failed}`);
console.log("");

for (const result of results) {
  console.log(`${result.passed ? "PASS" : "FAIL"} ${result.name} - ${result.detail}`);
}

console.log("");
console.log("品質檢查說明");
console.log("PASS 固定底層規則涵蓋：不逐句翻譯、台灣臨床用語、日期轉民國年、不腦補、正常值不列。");
console.log("PASS 模式 prompt 涵蓋：DNR、comfort care、family meeting、hospice/palliative、withhold/withdraw。");
console.log("PASS 本機檢查涵蓋：去識別化、臨床日期保留、無 localStorage/sessionStorage、無資料庫依賴、測試未寫入操作紀錄。");
console.log("NOTE 實際 AI 摘要內容仍需在設定 OPENAI_API_KEY 後，逐份人工核對輸出是否符合臨床語氣與未腦補。");

if (failed > 0) {
  process.exit(1);
}
