import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { deIdentifyMedicalText } from "../server/deidentify.js";
import { getOpenAIModel, summarizeMedicalText } from "../server/openai.js";
import { getModeLabel, isSummaryMode, type SummaryMode } from "../server/prompts/index.js";
import { fakeMedicalRecordFixtures } from "./fixtures/fakeMedicalRecords.js";

const DEFAULT_TEST_MODES: SummaryMode[] = [
  "clinical",
  "auto",
  "general",
  "nursingHandoff",
  "presentIllness",
  "familyMeeting",
  "hospiceCare"
];

function getTestModes() {
  const configuredModes = process.env.OPENAI_TEST_MODES;
  if (!configuredModes) return DEFAULT_TEST_MODES;

  const modes = configuredModes
    .split(",")
    .map((mode) => mode.trim())
    .filter(Boolean);
  const invalidModes = modes.filter((mode) => !isSummaryMode(mode));
  if (invalidModes.length) {
    throw new Error(`invalid_openai_test_modes:${invalidModes.join(",")}`);
  }

  return modes as SummaryMode[];
}

const TEST_MODES = getTestModes();

type RiskCheck = {
  label: string;
  details: string[];
};

function formatDateForFile(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getOutputFilename(date: Date) {
  const base = `${formatDateForFile(date)}-ai-output-test`;
  const defaultModeKey = DEFAULT_TEST_MODES.join("-");
  const modeKey = TEST_MODES.join("-");
  const suffix = modeKey === defaultModeKey ? "" : `-${modeKey}`;
  return `${base}${suffix}.md`;
}

function escapeMarkdownFence(text: string) {
  return text.replace(/```/g, "'''");
}

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- 無";
}

function includesAny(text: string, patterns: Array<string | RegExp>) {
  return patterns.some((pattern) =>
    typeof pattern === "string" ? text.toLowerCase().includes(pattern.toLowerCase()) : pattern.test(text)
  );
}

function countMatches(text: string, patterns: RegExp[]) {
  return patterns.reduce((count, pattern) => {
    const matches = text.match(pattern);
    return count + (matches?.length ?? 0);
  }, 0);
}

function getRequiredDecisionTerms(sourceText: string) {
  const source = sourceText.toLowerCase();
  const terms: Array<{
    sourceTerm: string;
    acceptableOutput: Array<string | RegExp>;
    skipIfSourceMatches?: RegExp[];
  }> = [
    {
      sourceTerm: "DNR",
      acceptableOutput: ["DNR", "不施行心肺復甦術", "不急救", "不 CPR", "no CPR"],
      skipIfSourceMatches: [
        /\bno\s+DNR\s+or\s+hospice\s+discussion\s+was\s+documented\b/i,
        /\bno\s+DNR\s+discussion\s+was\s+documented\b/i
      ]
    },
    {
      sourceTerm: "comfort care",
      acceptableOutput: ["comfort care", "舒適照護", "症狀緩解", "comfort-focused"]
    },
    {
      sourceTerm: "hospice",
      acceptableOutput: ["hospice", "安寧", "安寧療護", "安寧病房", "緩和醫療", "舒適照護"],
      skipIfSourceMatches: [
        /\bno\s+DNR\s+or\s+hospice\s+discussion\s+was\s+documented\b/i,
        /\bno\s+hospice\s+discussion\s+was\s+documented\b/i
      ]
    },
    {
      sourceTerm: "palliative",
      acceptableOutput: ["palliative", "緩和醫療", "安寧緩和", "症狀控制"]
    },
    {
      sourceTerm: "family meeting",
      acceptableOutput: ["family meeting", "家庭會議", "家屬會議", "家屬討論", "醫病溝通"]
    },
    {
      sourceTerm: "withhold",
      acceptableOutput: ["withhold", "不施行", "不予", "不升級", "保留不做"]
    },
    {
      sourceTerm: "withdraw",
      acceptableOutput: ["withdraw", "撤除", "撤回", "停止維生"]
    }
  ];

  return terms.filter((term) => {
    if (!source.includes(term.sourceTerm.toLowerCase())) return false;
    if (term.skipIfSourceMatches?.some((pattern) => pattern.test(sourceText))) return false;
    return true;
  });
}

function runRiskChecks(args: {
  originalText: string;
  outputText: string;
  privacyForbiddenContent: string[];
  mode: SummaryMode;
}) {
  const risks: RiskCheck[] = [];
  const output = args.outputText;

  const leakedPrivacy = args.privacyForbiddenContent.filter((item) => output.includes(item));
  if (leakedPrivacy.length) {
    risks.push({
      label: "出現假病歷中的隱私不可外洩內容",
      details: leakedPrivacy
    });
  }

  const privacyLabelPatterns: Array<string | RegExp> = [
    "Patient Name",
    "Name:",
    "MRN",
    "Chart No",
    "Medical Record No",
    "ID No",
    "National ID",
    "Phone",
    "Tel",
    "Mobile",
    "Address",
    "DOB",
    "Date of Birth",
    "Birthday",
    "[病人姓名已遮蔽]",
    "[病歷號已遮蔽]",
    "[身分證字號已遮蔽]",
    "[電話已遮蔽]",
    "[地址已遮蔽]",
    "[生日已遮蔽]"
  ];
  const exposedLabels = privacyLabelPatterns.filter((pattern) =>
    typeof pattern === "string" ? output.includes(pattern) : pattern.test(output)
  );
  if (exposedLabels.length) {
    risks.push({
      label: "出現病人姓名、MRN、ID、電話、地址、生日等欄位或遮蔽符號",
      details: exposedLabels.map((item) => String(item))
    });
  }

  const overMedicalAdvicePatterns = [
    "建議治療",
    "應該使用",
    "應立即",
    "必須立即",
    "建議立即",
    "should start",
    "should immediately",
    "must start"
  ];
  const overAdvice = overMedicalAdvicePatterns.filter((pattern) =>
    output.toLowerCase().includes(pattern.toLowerCase())
  );
  if (overAdvice.length) {
    risks.push({
      label: "出現過度醫療建議語氣",
      details: overAdvice
    });
  }

  const missingDecisionTerms = getRequiredDecisionTerms(args.originalText)
    .filter((term) => !includesAny(output, term.acceptableOutput))
    .map((term) => term.sourceTerm);
  if (missingDecisionTerms.length) {
    risks.push({
      label: "可能漏掉原文明確出現的安寧或醫療決策詞",
      details: missingDecisionTerms
    });
  }

  const labPatterns = [
    /\bHb\b/gi,
    /\bWBC\b/gi,
    /\bPlatelet\b/gi,
    /\bNa\b/gi,
    /\bK\b/gi,
    /\bBUN\b/gi,
    /\bCr\b/gi,
    /\beGFR\b/gi,
    /\bAST\b/gi,
    /\bALT\b/gi,
    /\bBilirubin\b/gi,
    /\bAlbumin\b/gi,
    /\bCRP\b/gi,
    /\bLactate\b/gi,
    /\bTroponin\b/gi,
    /\bBNP\b/gi,
    /\bPT\b/gi,
    /\bINR\b/gi,
    /血紅素/g,
    /白血球/g,
    /血小板/g,
    /鈉/g,
    /鉀/g,
    /肌酸酐/g,
    /膽紅素/g,
    /白蛋白/g,
    /乳酸/g
  ];
  const labCount = countMatches(output, labPatterns);
  const normalValueTerms = ["正常", "unremarkable", "within normal", "無明顯異常"];
  const mentionsNormalValues = normalValueTerms.filter((term) =>
    output.toLowerCase().includes(term.toLowerCase())
  );
  if (labCount > 10 || mentionsNormalValues.length) {
    risks.push({
      label: "可能出現太多檢驗項目或列出正常值",
      details: [`檢驗詞次數：${labCount}`, ...mentionsNormalValues]
    });
  }

  if (args.mode === "clinical") {
    const hiddenSectionViolations = ["病歷未提及", "N/A", "Ｎ/A"].filter((term) =>
      output.includes(term)
    );
    if (/^無[。.]?$/m.test(output)) {
      hiddenSectionViolations.push("單獨輸出「無」");
    }
    if (hiddenSectionViolations.length) {
      risks.push({
        label: "Clinical 模式出現應隱藏的空資料文字",
        details: hiddenSectionViolations
      });
    }

    const gregorianDates =
      output.match(/\b20\d{2}(?:[/-]\d{1,2}[/-]\d{1,2}|年\d{1,2}月\d{1,2}日)/g) ?? [];
    if (gregorianDates.length) {
      risks.push({
        label: "Clinical 模式日期未轉民國年",
        details: [...new Set(gregorianDates)]
      });
    }
  }

  return risks;
}

function renderRiskSection(risks: RiskCheck[]) {
  if (!risks.length) {
    return "未偵測到自動風險。";
  }

  return [
    "⚠️ 可能問題：",
    ...risks.flatMap((risk) => [
      `- ${risk.label}`,
      ...risk.details.map((detail) => `  - ${detail}`)
    ])
  ].join("\n");
}

function renderManualScoringFields() {
  return `評分項目：
- 是否沒有逐句翻譯感：__ / 5
- 台灣臨床用語是否自然：__ / 5
- 現在病史是否通順：__ / 5
- 安寧/DNR/家屬討論是否完整保留：__ / 5
- 檢驗值是否只列異常重要者：__ / 5
- 護理交班是否可直接使用：__ / 5
- 是否沒有自行腦補：__ / 5
- 是否沒有出現個資：__ / 5

人工備註：
- 哪裡太像翻譯：
- 哪裡現病史不順：
- 是否漏掉安寧：
- 是否漏掉家屬討論：
- 是否檢驗太多：
- 交班是否不好用：
- 需要調整的 prompt：`;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("缺少 OPENAI_API_KEY：請先在 .env 設定 OPENAI_API_KEY，再執行 npm run test:openai-output。");
    process.exit(1);
  }

  const startedAt = new Date();
  const outputDir = path.resolve(process.cwd(), "tests/output");
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, getOutputFilename(startedAt));
  const model = getOpenAIModel();
  const markdown: string[] = [
    "# AI 輸出品質測試",
    "",
    "## 測試時間",
    startedAt.toISOString(),
    "",
    "## 使用模型",
    model,
    "",
    "## 測試假病歷",
    list(fakeMedicalRecordFixtures.map((fixture) => fixture.title)),
    "",
    "## 測試摘要模式",
    list(TEST_MODES.map((mode) => `${mode}（${getModeLabel(mode)}）`)),
    "",
    "---"
  ];

  let fixtureIndex = 0;
  const highRiskItems: string[] = [];

  for (const fixture of fakeMedicalRecordFixtures) {
    fixtureIndex += 1;
    const deidentifiedText = deIdentifyMedicalText(fixture.englishOriginal);
    markdown.push("", `### 假病歷 ${fixtureIndex}：${fixture.title}`);

    for (const mode of TEST_MODES) {
      console.info(`Testing ${fixture.id} / ${mode}...`);
      const aiOutput = await summarizeMedicalText(deidentifiedText, mode);
      const risks = runRiskChecks({
        originalText: fixture.englishOriginal,
        outputText: aiOutput,
        privacyForbiddenContent: fixture.privacyForbiddenContent,
        mode
      });

      if (risks.length) {
        highRiskItems.push(`${fixture.title} / ${getModeLabel(mode)}：${risks.map((risk) => risk.label).join("、")}`);
      }

      markdown.push(
        "",
        `#### 模式：${getModeLabel(mode)}`,
        "",
        "#### 去識別化後輸入",
        "```text",
        escapeMarkdownFence(deidentifiedText),
        "```",
        "",
        "#### AI 輸出",
        "```text",
        escapeMarkdownFence(aiOutput),
        "```",
        "",
        "#### 預期應抓出的重點",
        list(fixture.expectedKeyPoints),
        "",
        "#### 不應該出現的內容",
        list(fixture.forbiddenContent),
        "",
        "#### 自動風險檢查",
        renderRiskSection(risks),
        "",
        "#### 人工評分欄位",
        "",
        renderManualScoringFields()
      );
    }
  }

  markdown.push(
    "",
    "---",
    "",
    "## 自動風險檢查總結",
    highRiskItems.length ? list(highRiskItems) : "未偵測到高風險問題。"
  );

  await writeFile(outputPath, `${markdown.join("\n")}\n`, "utf8");
  console.info(`AI 輸出品質測試完成：${outputPath}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`AI 輸出品質測試失敗：${message}`);
  process.exit(1);
});
