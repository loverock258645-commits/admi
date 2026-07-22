import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { processRecordFile } from "../scripts/deidentify-local.js";
import { fakeMedicalRecordFixtures } from "./fixtures/fakeMedicalRecords.js";

type TestResult = {
  name: string;
  passed: boolean;
  detail: string;
};

const results: TestResult[] = [];

function addResult(name: string, passed: boolean, detail: string) {
  results.push({ name, passed, detail });
}

function escapePdfString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildTextPdf(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const contentLines = [
    "BT",
    "/F1 10 Tf",
    "72 760 Td",
    ...lines.map((line, index) => {
      const prefix = index === 0 ? "" : "0 -14 Td ";
      return `${prefix}(${escapePdfString(line)}) Tj`;
    }),
    "ET"
  ];
  const stream = contentLines.join("\n");
  const pdf = `%PDF-1.4
1 0 obj
<< /Length ${Buffer.byteLength(stream, "latin1")} >>
stream
${stream}
endstream
endobj
%%EOF`;
  return Buffer.from(pdf, "latin1");
}

function buildImageOnlyPdf() {
  const stream = "q\n10 0 0 10 72 720 cm\n/Im1 Do\nQ";
  const pdf = `%PDF-1.4
1 0 obj
<< /Length ${Buffer.byteLength(stream, "latin1")} >>
stream
${stream}
endstream
endobj
%%EOF`;
  return Buffer.from(pdf, "latin1");
}

const tempRoot = mkdtempSync(path.join(tmpdir(), "admi-local-deidentify-"));
const textFixture = fakeMedicalRecordFixtures[0];
const textInputPath = path.join(tempRoot, "fake-record.txt");
const textOutputPath = path.join(tempRoot, "fake-record.deidentified.txt");
writeFileSync(textInputPath, textFixture.englishOriginal, "utf8");

const textResult = processRecordFile(textInputPath, textOutputPath);
const textOutput = readFileSync(textOutputPath, "utf8");
const textLeaks = textFixture.privacyForbiddenContent.filter((item) =>
  textOutput.includes(item)
);

addResult(
  "本機文字檔去識別化會建立輸出檔",
  textOutput.length > 300 && textResult.outputPath === textOutputPath,
  textOutputPath
);
addResult(
  "本機文字檔去識別化未保留假個資",
  textLeaks.length === 0,
  textLeaks.length ? textLeaks.join(", ") : "未發現個資外洩"
);
addResult(
  "本機文字檔去識別化會統計遮蔽項目",
  textResult.maskCount > 0,
  `遮蔽 ${textResult.maskCount} 項`
);

const pdfFixture = fakeMedicalRecordFixtures[1];
const pdfInputPath = path.join(tempRoot, "fake-record.pdf");
const pdfOutputPath = path.join(tempRoot, "fake-record-pdf.deidentified.txt");
writeFileSync(pdfInputPath, buildTextPdf(pdfFixture.englishOriginal));

const pdfResult = processRecordFile(pdfInputPath, pdfOutputPath);
const pdfOutput = readFileSync(pdfOutputPath, "utf8");
const pdfLeaks = pdfFixture.privacyForbiddenContent.filter((item) =>
  pdfOutput.includes(item)
);

addResult(
  "本機 PDF 去識別化可抽取文字型 PDF",
  pdfResult.inputType === "pdf" && pdfResult.extractedCharCount > 300,
  `抽取 ${pdfResult.extractedCharCount} 字`
);
addResult(
  "本機 PDF 去識別化未保留假個資",
  pdfLeaks.length === 0,
  pdfLeaks.length ? pdfLeaks.join(", ") : "未發現個資外洩"
);
addResult(
  "本機 PDF 去識別化會回報抽取品質",
  pdfResult.pdfQuality?.canSummarize === true,
  pdfResult.pdfQuality?.status ?? "no quality"
);

const imagePdfPath = path.join(tempRoot, "image-only.pdf");
writeFileSync(imagePdfPath, buildImageOnlyPdf());

let imageOnlyError = "";
try {
  processRecordFile(imagePdfPath, path.join(tempRoot, "image-only.deidentified.txt"));
} catch (error) {
  imageOnlyError = error instanceof Error ? error.message : "unknown";
}

addResult(
  "本機掃描型 PDF 不會誤產生可摘要內容",
  imageOnlyError === "pdf_text_not_found",
  imageOnlyError || "未丟出錯誤"
);

const passed = results.filter((result) => result.passed).length;
const failed = results.length - passed;

console.log("本機去識別化測試結果");
console.log("====================");
console.log(`通過：${passed}`);
console.log(`失敗：${failed}`);
console.log("");

for (const result of results) {
  console.log(`${result.passed ? "PASS" : "FAIL"} ${result.name} - ${result.detail}`);
}

if (failed > 0) {
  process.exit(1);
}
