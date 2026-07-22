export const SUMMARY_MODES = [
  "clinical",
  "clinicalNarrative",
  "auto",
  "general",
  "nursingHandoff",
  "pastHistory",
  "presentIllness",
  "familyMeeting",
  "hospiceCare",
  "dischargeSummary",
  "emergencyNote",
  "dailyProgress"
] as const;

export type SummaryMode = (typeof SUMMARY_MODES)[number];

export type ModePrompt = {
  label: string;
  purpose: string;
  prompt: string;
  outputFormat: string;
};

export function isSummaryMode(value: unknown): value is SummaryMode {
  return typeof value === "string" && SUMMARY_MODES.includes(value as SummaryMode);
}
