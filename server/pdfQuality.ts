export type PdfQualityStatus = "good" | "caution" | "blocked";

export type PdfQualityReport = {
  status: PdfQualityStatus;
  canSummarize: boolean;
  characterCount: number;
  lineCount: number;
  estimatedPageCount: number;
  detectedSections: string[];
  warnings: string[];
  blockingIssues: string[];
};

const sectionRules = [
  { label: "Admission", pattern: /admission|admitted|入院/gi },
  { label: "Discharge", pattern: /discharge|出院/gi },
  { label: "Progress Note", pattern: /progress note|subjective|objective|assessment|plan|病程/gi },
  { label: "Emergency", pattern: /\bED\b|emergency|急診/gi },
  { label: "Consult", pattern: /consult|consultation|會診/gi },
  { label: "Family Meeting", pattern: /family meeting|family conference|家屬討論|家庭會議/gi },
  { label: "Hospice/Palliative", pattern: /hospice|palliative|comfort care|DNR|安寧|緩和|舒適照護/gi },
  { label: "Diagnosis", pattern: /diagnosis|impression|diagnoses|診斷/gi },
  { label: "Treatment", pattern: /treatment|treated|antibiotic|oxygen|morphine|procedure|治療|處置/gi },
  { label: "Laboratory/Imaging", pattern: /\bWBC\b|\bCRP\b|\bHb\b|\bCr\b|\bCT\b|x-ray|culture|檢驗|影像/gi }
];

function countMatches(text: string, pattern: RegExp) {
  pattern.lastIndex = 0;
  return [...text.matchAll(pattern)].length;
}

function estimatePdfPageCount(pdfBuffer: Buffer) {
  const binary = pdfBuffer.toString("latin1");
  const pageCount = countMatches(binary, /\/Type\s*\/Page\b/g);
  return Math.max(1, pageCount);
}

export function analyzePdfExtraction(pdfBuffer: Buffer, extractedText: string): PdfQualityReport {
  const trimmed = extractedText.trim();
  const characterCount = trimmed.length;
  const lineCount = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;
  const estimatedPageCount = estimatePdfPageCount(pdfBuffer);
  const detectedSections = sectionRules
    .filter((rule) => countMatches(trimmed, rule.pattern) > 0)
    .map((rule) => rule.label);

  const warnings: string[] = [];
  const blockingIssues: string[] = [];

  if (characterCount < 300) {
    blockingIssues.push("抽取文字少於 300 字，可能是掃描影像 PDF 或內容抽取不完整");
  } else if (characterCount < 800) {
    warnings.push("抽取文字偏少，請確認不是只抽到封面、頁首或頁尾");
  }

  if (lineCount < 5) {
    blockingIssues.push("抽取行數過少，無法確認病摘內容完整");
  }

  if (estimatedPageCount >= 2 && characterCount < estimatedPageCount * 350) {
    warnings.push("抽取字數與估計頁數不相稱，可能有部分頁面未抽到文字");
  }

  if (detectedSections.length === 0) {
    blockingIssues.push("未偵測到常見臨床段落或關鍵詞");
  } else if (detectedSections.length < 2) {
    warnings.push("偵測到的臨床段落偏少，請人工確認 PDF 是否完整");
  }

  const replacementCharacterCount = countMatches(trimmed, /\uFFFD/g);
  if (replacementCharacterCount > 10) {
    warnings.push("抽取文字含多個無法辨識字元，可能有編碼問題");
  }

  const status: PdfQualityStatus =
    blockingIssues.length > 0 ? "blocked" : warnings.length > 0 ? "caution" : "good";

  return {
    status,
    canSummarize: status !== "blocked",
    characterCount,
    lineCount,
    estimatedPageCount,
    detectedSections,
    warnings,
    blockingIssues
  };
}
