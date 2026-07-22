import type { SummaryMode } from "./prompts/index.js";

const clinicalEmptyTextPattern =
  /^(?:病歷未提及|未提及|未記載|未提供|無|N\/A|Ｎ\/A)(?:[^\n。]*[。.]?)?$/;

function toTaiwanYear(year: number) {
  return year - 1911;
}

function normalizeTaiwanDates(summary: string) {
  return summary
    .replace(/\b(20\d{2})[/-](\d{1,2})[/-](\d{1,2})\b/g, (_match, year, month, day) => {
      return `民國${toTaiwanYear(Number(year))}年${Number(month)}月${Number(day)}日`;
    })
    .replace(/\b(20\d{2})年(\d{1,2})月(\d{1,2})日/g, (_match, year, month, day) => {
      return `民國${toTaiwanYear(Number(year))}年${Number(month)}月${Number(day)}日`;
    });
}

function removeClinicalEmptySections(summary: string) {
  return summary
    .split(/(?=【[^】]+】)/g)
    .filter((section) => {
      const body = section.replace(/^【[^】]+】/, "").trim();
      return !clinicalEmptyTextPattern.test(body);
    })
    .map((section) =>
      section
        .split(/\r?\n/)
        .filter((line) => !clinicalEmptyTextPattern.test(line.trim()))
        .join("\n")
        .trim()
    )
    .filter(Boolean)
    .join("\n\n");
}

function removeNormalValueStatements(summary: string) {
  return summary
    .replace(/[，,]\s*腎功能正常[。.]/g, "。")
    .replace(/[，,]\s*腎功能正常[，,]/g, "，")
    .replace(/[，,]?\s*腎功能正常[。.]?/g, "")
    .replace(/[，,]\s*CBC(?:及|和)?肝功能(?:皆)?(?:無明顯異常|正常|未見異常)[。.]/g, "。")
    .replace(/[，,]?\s*CBC(?:及|和)?肝功能(?:皆)?(?:無明顯異常|正常|未見異常)[。.]?/g, "")
    .replace(/[，,]\s*肝功能(?:無明顯異常|正常|未見異常)[。.]/g, "。")
    .replace(/[，,]?\s*肝功能(?:無明顯異常|正常|未見異常)[。.]?/g, "")
    .replace(/[，,]\s*血鉀(?:正常|在正常範圍)[。.]/g, "。")
    .replace(/[，,]?\s*血鉀(?:正常|在正常範圍)[。.]?/g, "")
    .replace(/[，,]\s*鉀離子(?:正常|在正常範圍)[。.]/g, "。")
    .replace(/[，,]?\s*鉀離子(?:正常|在正常範圍)[。.]?/g, "");
}

export function postProcessMedicalSummary(summary: string, mode: SummaryMode) {
  let processed = normalizeTaiwanDates(summary);

  if (mode === "clinical" || mode === "clinicalNarrative") {
    processed = removeClinicalEmptySections(processed);
    processed = removeNormalValueStatements(processed);
  }

  return processed.replace(/\n{3,}/g, "\n\n").trim();
}
