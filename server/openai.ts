import { buildSummaryPrompt, getModeLabel, type SummaryMode } from "./prompts/index.js";
import { postProcessMedicalSummary } from "./summaryPostProcess.js";

const MODEL = "gpt-4.1-mini";

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL || MODEL;
}

export async function summarizeMedicalText(text: string, mode: SummaryMode) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("missing_openai_api_key");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: getOpenAIModel(),
      input: [
        {
          role: "system",
          content: buildSummaryPrompt(mode)
        },
        {
          role: "user",
          content: `以下是已去識別化的英文病歷內容。請依「${getModeLabel(mode)}」模式整理，且不要輸出任何病歷原文全文：\n\n${text}`
        }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    throw new Error(`openai_${response.status}`);
  }

  const data = (await response.json()) as {
    output_text?: string;
    output?: Array<{
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  const outputText =
    data.output_text ??
    data.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? "")
      .join("")
      .trim();

  if (!outputText) {
    throw new Error("empty_openai_response");
  }

  return postProcessMedicalSummary(outputText, mode);
}
