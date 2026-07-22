import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deIdentifyMedicalText } from "../server/deidentify.js";
import { analyzePdfExtraction, type PdfQualityReport } from "../server/pdfQuality.js";
import { extractTextFromPdfBuffer } from "../server/pdfText.js";
import { checkDeidentifiedTextRisk } from "../server/riskCheck.js";

const MASK_PATTERN =
  /(\[(?:病人姓名|聯絡人姓名|病歷號|身分證字號|電話|地址|生日|床號)已遮蔽\])/g;

type ProcessedRecord = {
  inputPath: string;
  inputType: "pdf" | "text";
  extractedCharCount: number;
  deidentifiedCharCount: number;
  maskCount: number;
  outputPath: string;
  pdfQuality?: PdfQualityReport;
  riskWarnings: string[];
};

function usage() {
  return [
    "Usage:",
    "  npm run deidentify:local -- <path-to-record.pdf|txt>",
    "",
    "Options:",
    "  --output <path>  自訂去識別化輸出檔路徑",
    "",
    "Safety:",
    "  這個指令不呼叫 OpenAI、不連線網路、不輸出病歷內容到終端。"
  ].join("\n");
}

function getArgumentValue(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function getInputPath() {
  const positional = process.argv.slice(2).filter((argument, index, allArguments) => {
    const previous = allArguments[index - 1];
    return !argument.startsWith("--") && previous !== "--output";
  });

  return positional[0];
}

function safeOutputFilename(inputPath: string) {
  const parsed = path.parse(inputPath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${timestamp}-${parsed.name}.deidentified.txt`;
}

function defaultOutputPath(inputPath: string) {
  return path.resolve(process.cwd(), "local-output", safeOutputFilename(inputPath));
}

function extractInputText(inputPath: string) {
  const extension = path.extname(inputPath).toLowerCase();
  const buffer = readFileSync(inputPath);

  if (extension === ".pdf") {
    const extractedText = extractTextFromPdfBuffer(buffer);
    if (!extractedText.trim()) {
      throw new Error("pdf_text_not_found");
    }

    return {
      inputType: "pdf" as const,
      extractedText,
      pdfQuality: analyzePdfExtraction(buffer, extractedText)
    };
  }

  if ([".txt", ".text", ".md"].includes(extension)) {
    return {
      inputType: "text" as const,
      extractedText: buffer.toString("utf8")
    };
  }

  throw new Error("unsupported_file_type");
}

export function processRecordFile(inputPath: string, outputPath = defaultOutputPath(inputPath)): ProcessedRecord {
  const resolvedInputPath = path.resolve(inputPath);
  const { inputType, extractedText, pdfQuality } = extractInputText(resolvedInputPath);
  const deidentifiedText = deIdentifyMedicalText(extractedText);
  const risk = checkDeidentifiedTextRisk(deidentifiedText);
  const resolvedOutputPath = path.resolve(outputPath);

  mkdirSync(path.dirname(resolvedOutputPath), { recursive: true });
  writeFileSync(resolvedOutputPath, deidentifiedText, { encoding: "utf8", flag: "w" });

  return {
    inputPath: resolvedInputPath,
    inputType,
    extractedCharCount: extractedText.length,
    deidentifiedCharCount: deidentifiedText.length,
    maskCount: deidentifiedText.match(MASK_PATTERN)?.length ?? 0,
    outputPath: resolvedOutputPath,
    pdfQuality,
    riskWarnings: risk.blockingIssues
  };
}

function printResult(result: ProcessedRecord) {
  console.log("本機去識別化完成");
  console.log("================");
  console.log(`輸入類型：${result.inputType === "pdf" ? "PDF" : "文字檔"}`);
  console.log(`抽取字數：${result.extractedCharCount.toLocaleString("zh-TW")}`);
  console.log(`去識別化後字數：${result.deidentifiedCharCount.toLocaleString("zh-TW")}`);
  console.log(`遮蔽項目數：${result.maskCount.toLocaleString("zh-TW")}`);

  if (result.pdfQuality) {
    console.log(`PDF 抽取品質：${result.pdfQuality.status}`);
    console.log(
      `PDF 統計：估計 ${result.pdfQuality.estimatedPageCount.toLocaleString("zh-TW")} 頁，${result.pdfQuality.lineCount.toLocaleString("zh-TW")} 行`
    );
    console.log(
      `偵測段落：${result.pdfQuality.detectedSections.join("、") || "未偵測到常見臨床段落"}`
    );

    for (const issue of result.pdfQuality.blockingIssues) {
      console.log(`阻擋原因：${issue}`);
    }

    for (const warning of result.pdfQuality.warnings) {
      console.log(`警示：${warning}`);
    }
  }

  for (const warning of result.riskWarnings) {
    console.log(`疑似個資風險：${warning}`);
  }

  console.log(`輸出檔案：${result.outputPath}`);
  console.log("請人工檢查輸出檔，確認沒有個資後，再貼到網站摘要。");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const inputPath = getInputPath();
  const outputPath = getArgumentValue("--output");

  if (!inputPath) {
    console.error(usage());
    process.exit(1);
  }

  try {
    printResult(processRecordFile(inputPath, outputPath));
  } catch (error) {
    const message = error instanceof Error ? error.message : "local_deidentify_failed";
    if (message === "pdf_text_not_found") {
      console.error("PDF 未抽取到可用文字；這通常是掃描影像 PDF。請改用院內允許的 OCR 或手動貼上已去識別化文字。");
    } else if (message === "unsupported_file_type") {
      console.error("不支援的檔案格式；目前只支援 .pdf、.txt、.text、.md。");
    } else {
      console.error("本機去識別化失敗，請確認檔案可讀取。");
    }
    process.exit(1);
  }
}
