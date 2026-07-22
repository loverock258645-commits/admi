import { postProcessMedicalSummary } from "../server/summaryPostProcess.js";

type TestResult = {
  name: string;
  passed: boolean;
  detail: string;
};

const results: TestResult[] = [];

function addResult(name: string, passed: boolean, detail: string) {
  results.push({ name, passed, detail });
}

const clinicalInput = `【過去病史】
病歷未提及重要慢性病史。

【此次住院】
2026年1月10日行右側肋膜積液引流，2026-01-15 拔除引流管，腎功能正常。BNP 2860 pg/mL，肌酸酐2.1 mg/dL。

【一句話摘要】
急性心衰合併肋膜積液。`;

const clinicalOutput = postProcessMedicalSummary(clinicalInput, "clinical");
const clinicalNarrativeOutput = postProcessMedicalSummary(
  clinicalInput,
  "clinicalNarrative"
);

addResult(
  "Clinical 後處理會移除空資料區塊",
  !clinicalOutput.includes("【過去病史】") && !clinicalOutput.includes("病歷未提及"),
  clinicalOutput
);

addResult(
  "Clinical 後處理會轉換完整西元日期",
  clinicalOutput.includes("民國115年1月10日") &&
    clinicalOutput.includes("民國115年1月15日") &&
    !/20\d{2}(?:[/-]\d{1,2}[/-]\d{1,2}|年\d{1,2}月\d{1,2}日)/.test(clinicalOutput),
  clinicalOutput
);

addResult(
  "Clinical 後處理會移除正常值敘述",
  !clinicalOutput.includes("腎功能正常") &&
    clinicalOutput.includes("BNP 2860") &&
    !clinicalOutput.includes("引流管BNP"),
  clinicalOutput
);

addResult(
  "臨床脈絡模式後處理會移除空資料、正常值並轉民國年",
  !clinicalNarrativeOutput.includes("【過去病史】") &&
    !clinicalNarrativeOutput.includes("病歷未提及") &&
    !clinicalNarrativeOutput.includes("腎功能正常") &&
    clinicalNarrativeOutput.includes("民國115年1月10日") &&
    clinicalNarrativeOutput.includes("BNP 2860"),
  clinicalNarrativeOutput
);

const generalInput = `【重要過去病史】
病歷未提及。

【現在病史】
2026-01-07 入院。`;
const generalOutput = postProcessMedicalSummary(generalInput, "general");

addResult(
  "非 Clinical 模式保留病歷未提及寫法",
  generalOutput.includes("病歷未提及"),
  generalOutput
);

addResult(
  "非 Clinical 模式也會轉換完整西元日期",
  generalOutput.includes("民國115年1月7日"),
  generalOutput
);

const passed = results.filter((result) => result.passed).length;
const failed = results.length - passed;

console.log("摘要後處理測試結果");
console.log("==================");
console.log(`通過：${passed}`);
console.log(`失敗：${failed}`);
console.log("");

for (const result of results) {
  console.log(`${result.passed ? "PASS" : "FAIL"} ${result.name} - ${result.detail}`);
}

if (failed > 0) {
  process.exit(1);
}
