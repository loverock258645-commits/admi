import { baseRulesPrompt } from "./baseRulesPrompt.js";
import { glossaryPrompt } from "./glossaryPrompt.js";
import { modePrompts } from "./modes.js";
import type { SummaryMode } from "./types.js";

export { SUMMARY_MODES, isSummaryMode } from "./types.js";
export type { SummaryMode } from "./types.js";

export function getModeLabel(mode: SummaryMode) {
  return modePrompts[mode].label;
}

export function buildSummaryPrompt(mode: SummaryMode) {
  const modePrompt = modePrompts[mode];
  const outputFormatPrompt = modePrompt.outputFormat;

  return [
    "你是一位熟悉台灣臨床醫療用語與安寧病房照護的醫療文件整理助手。",
    "",
    baseRulesPrompt,
    "",
    glossaryPrompt,
    "",
    `摘要模式：${modePrompt.label}`,
    `模式用途：${modePrompt.purpose}`,
    modePrompt.prompt,
    "",
    outputFormatPrompt
  ].join("\n");
}
