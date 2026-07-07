import { useState } from "react";
import { apiRequest } from "../api";

const SUMMARY_MODES = [
  { value: "auto", label: "自動判斷" },
  { value: "general", label: "一般病歷摘要" },
  { value: "nursingHandoff", label: "護理交班" },
  { value: "pastHistory", label: "過去病史整理" },
  { value: "presentIllness", label: "現在病史整理" },
  { value: "familyMeeting", label: "家屬討論摘要" },
  { value: "hospiceCare", label: "安寧照護重點" },
  { value: "dischargeSummary", label: "出院摘要" },
  { value: "emergencyNote", label: "急診紀錄摘要" },
  { value: "dailyProgress", label: "每日病程摘要" }
] as const;

type SummaryMode = (typeof SUMMARY_MODES)[number]["value"];

type SummaryPageProps = {
  username: string;
  onLogout: () => void;
};

export function SummaryPage({ username, onLogout }: SummaryPageProps) {
  const [sourceText, setSourceText] = useState("");
  const [deidentifiedText, setDeidentifiedText] = useState("");
  const [summary, setSummary] = useState("");
  const [mode, setMode] = useState<SummaryMode>("auto");
  const [usedModeLabel, setUsedModeLabel] = useState("自動判斷");
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [deidentifying, setDeidentifying] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  function clearSensitiveState() {
    setSourceText("");
    setDeidentifiedText("");
    setSummary("");
    setUsedModeLabel(SUMMARY_MODES.find((item) => item.value === mode)?.label ?? "自動判斷");
    setError("");
    setCopyStatus("");
  }

  async function handleDeidentify() {
    setError("");
    setCopyStatus("");
    setDeidentifying(true);

    try {
      const result = await apiRequest<{ text: string }>("/api/deidentify", {
        method: "POST",
        body: JSON.stringify({ text: sourceText })
      });
      setDeidentifiedText(result.text);
      setSummary("");
    } catch {
      setError("個資遮蔽失敗，請稍後再試。");
    } finally {
      setDeidentifying(false);
    }
  }

  async function handleSummarize() {
    setError("");
    setCopyStatus("");
    setSummarizing(true);

    try {
      const result = await apiRequest<{
        summary: string;
        mode: SummaryMode;
        modeLabel: string;
      }>("/api/summarize", {
        method: "POST",
        body: JSON.stringify({ text: deidentifiedText, mode })
      });
      setSummary(result.summary);
      setUsedModeLabel(result.modeLabel);
    } catch {
      setError("摘要產生失敗，請稍後再試。");
    } finally {
      setSummarizing(false);
    }
  }

  async function handleCopy() {
    if (!summary) return;
    await navigator.clipboard.writeText(summary);
    setCopyStatus("已複製全文。");
  }

  async function handleLogout() {
    clearSensitiveState();
    try {
      await apiRequest("/api/logout", { method: "POST", body: "{}" });
    } finally {
      onLogout();
      window.history.replaceState(null, "", "/");
    }
  }

  return (
    <main className="min-h-screen bg-[#eef4f7]">
      <header className="border-b border-clinical-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-semibold text-clinical-ink">
              病歷摘要
            </h1>
            <p className="mt-1 text-sm text-clinical-muted">
              已登入：{username}
            </p>
          </div>
          <button
            className="rounded-md border border-clinical-line bg-white px-4 py-2 text-sm font-medium text-clinical-ink transition hover:bg-clinical-panel"
            onClick={handleLogout}
            type="button"
          >
            登出
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-clinical-warn">
          請確認輸入內容符合院內資訊安全與個資保護規範。建議先去識別化後再進行摘要。
        </section>

        <section className="mb-5 rounded-lg border border-clinical-line bg-white p-4 shadow-sm">
          <label className="block max-w-sm">
            <span className="mb-2 block text-sm font-semibold text-clinical-ink">
              摘要模式
            </span>
            <select
              className="w-full rounded-md border border-clinical-line bg-white px-3 py-2 text-sm text-clinical-ink outline-none transition focus:border-clinical-teal focus:ring-2 focus:ring-clinical-teal/15"
              value={mode}
              onChange={(event) => {
                const nextMode = event.target.value as SummaryMode;
                setMode(nextMode);
                setSummary("");
                setCopyStatus("");
                setUsedModeLabel(
                  SUMMARY_MODES.find((item) => item.value === nextMode)?.label ??
                    "自動判斷"
                );
              }}
            >
              {SUMMARY_MODES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        {error ? (
          <section className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </section>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rounded-lg border border-clinical-line bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-clinical-ink">
                英文病歷內容
              </h2>
              <button
                className="rounded-md border border-clinical-line px-3 py-2 text-sm font-medium text-clinical-ink transition hover:bg-clinical-panel disabled:cursor-not-allowed disabled:opacity-60"
                onClick={clearSensitiveState}
                type="button"
              >
                清空內容
              </button>
            </div>
            <textarea
              className="h-[28rem] w-full resize-y rounded-md border border-clinical-line p-3 font-mono text-sm leading-6 outline-none transition focus:border-clinical-teal focus:ring-2 focus:ring-clinical-teal/15"
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              placeholder="請貼上英文病歷內容。頁面重新整理或登出後不會保留。"
              spellCheck={false}
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                className="rounded-md bg-clinical-teal px-4 py-2 text-sm font-semibold text-white transition hover:bg-clinical-tealDark disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleDeidentify}
                disabled={!sourceText.trim() || deidentifying}
                type="button"
              >
                {deidentifying ? "遮蔽中..." : "個資遮蔽預覽"}
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-clinical-line bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-clinical-ink">
                去識別化後文字預覽
              </h2>
              <button
                className="rounded-md bg-clinical-teal px-4 py-2 text-sm font-semibold text-white transition hover:bg-clinical-tealDark disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleSummarize}
                disabled={!deidentifiedText.trim() || summarizing}
                type="button"
              >
                {summarizing ? "產生中..." : "產生摘要"}
              </button>
            </div>
            <pre className="h-[28rem] overflow-auto whitespace-pre-wrap rounded-md border border-clinical-line bg-clinical-panel p-3 font-mono text-sm leading-6 text-clinical-ink">
              {deidentifiedText || "遮蔽後內容會顯示在這裡，請確認後再產生摘要。"}
            </pre>
          </section>
        </div>

        <section className="mt-5 rounded-lg border border-clinical-line bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-clinical-ink">
              摘要結果
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-clinical-muted">
                目前模式：{usedModeLabel}
              </span>
              {copyStatus ? (
                <span className="text-sm text-clinical-teal">{copyStatus}</span>
              ) : null}
              <button
                className="rounded-md border border-clinical-line px-3 py-2 text-sm font-medium text-clinical-ink transition hover:bg-clinical-panel disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleCopy}
                disabled={!summary}
                type="button"
              >
                複製全文
              </button>
            </div>
          </div>
          <pre className="min-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-clinical-line bg-clinical-panel p-4 text-sm leading-7 text-clinical-ink">
            {summary || "中文臨床摘要會顯示在這裡。"}
          </pre>
        </section>
      </div>
    </main>
  );
}
