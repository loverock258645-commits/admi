import { useEffect, useState } from "react";
import { ApiError, apiRequest } from "../api";

const SUMMARY_MODES = [
  { value: "clinical", label: "⭐ 臨床模式（Clinical）" },
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

const MASK_PATTERN =
  /(\[(?:病人姓名|聯絡人姓名|病歷號|身分證字號|電話|地址|生日|床號)已遮蔽\])/g;
const MASK_TOKEN_PATTERN =
  /^\[(?:病人姓名|聯絡人姓名|病歷號|身分證字號|電話|地址|生日|床號)已遮蔽\]$/;
const MAX_PDF_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const IDLE_LOGOUT_MS = 15 * 60 * 1000;

function formatCount(value: number) {
  return value.toLocaleString("zh-TW");
}

export function SummaryPage({ username, onLogout }: SummaryPageProps) {
  const [sourceText, setSourceText] = useState("");
  const [deidentifiedText, setDeidentifiedText] = useState("");
  const [deidentifiedConfirmed, setDeidentifiedConfirmed] = useState(false);
  const [confirmationToken, setConfirmationToken] = useState("");
  const [confirmationExpiresAt, setConfirmationExpiresAt] = useState("");
  const [summary, setSummary] = useState("");
  const [mode, setMode] = useState<SummaryMode>("clinical");
  const [usedModeLabel, setUsedModeLabel] = useState("⭐ 臨床模式（Clinical）");
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [pdfInputKey, setPdfInputKey] = useState(0);
  const [pdfStatus, setPdfStatus] = useState("");
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [deidentifiedCopyStatus, setDeidentifiedCopyStatus] = useState("");
  const [riskWarnings, setRiskWarnings] = useState<string[]>([]);
  const [idleNotice, setIdleNotice] = useState("");
  const [pdfUploading, setPdfUploading] = useState(false);
  const [deidentifying, setDeidentifying] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const maskedItemCount = deidentifiedText.match(MASK_PATTERN)?.length ?? 0;
  const canSummarize =
    deidentifiedText.trim().length > 0 && deidentifiedConfirmed && !summarizing;
  const summarizeHint = !deidentifiedText.trim()
    ? "請先完成個資遮蔽預覽。"
    : !deidentifiedConfirmed
      ? "請先勾選確認去識別化預覽。"
      : "可產生摘要。";

  function clearSensitiveState() {
    setSourceText("");
    setDeidentifiedText("");
    setDeidentifiedConfirmed(false);
    setConfirmationToken("");
    setConfirmationExpiresAt("");
    setSummary("");
    setSelectedPdf(null);
    setPdfInputKey((value) => value + 1);
    setPdfStatus("");
    setUsedModeLabel(
      SUMMARY_MODES.find((item) => item.value === mode)?.label ??
        "⭐ 臨床模式（Clinical）"
    );
    setError("");
    setCopyStatus("");
    setDeidentifiedCopyStatus("");
    setRiskWarnings([]);
  }

  function handleSourceTextChange(value: string) {
    setSourceText(value);
    setDeidentifiedText("");
    setDeidentifiedConfirmed(false);
    setConfirmationToken("");
    setConfirmationExpiresAt("");
    setSummary("");
    setPdfStatus("");
    setCopyStatus("");
    setDeidentifiedCopyStatus("");
    setRiskWarnings([]);
  }

  function renderDeidentifiedPreview() {
    if (!deidentifiedText) {
      return "遮蔽後內容會顯示在這裡，請確認後再產生摘要。";
    }

    return deidentifiedText.split(MASK_PATTERN).map((part, index) => {
      if (MASK_TOKEN_PATTERN.test(part)) {
        return (
          <mark
            className="rounded bg-amber-200 px-1 text-clinical-ink"
            key={`${part}-${index}`}
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  }

  async function handleDeidentify() {
    setError("");
    setCopyStatus("");
    setDeidentifiedCopyStatus("");
    setPdfStatus("");
    setRiskWarnings([]);
    setDeidentifying(true);

    try {
      const result = await apiRequest<{
        text: string;
        confirmationToken: string;
        confirmationExpiresAt: string;
      }>("/api/deidentify", {
        method: "POST",
        body: JSON.stringify({ text: sourceText })
      });
      setDeidentifiedText(result.text);
      setConfirmationToken(result.confirmationToken);
      setConfirmationExpiresAt(result.confirmationExpiresAt);
      setDeidentifiedConfirmed(false);
      setSummary("");
    } catch {
      setError("個資遮蔽失敗，請稍後再試。");
    } finally {
      setDeidentifying(false);
    }
  }

  async function handlePdfDeidentify() {
    if (!selectedPdf) return;
    setError("");
    setCopyStatus("");
    setDeidentifiedCopyStatus("");
    setRiskWarnings([]);
    setPdfUploading(true);

    try {
      const response = await fetch("/api/pdf/deidentify", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/pdf"
        },
        body: await selectedPdf.arrayBuffer()
      });

      const result = (await response.json().catch(() => ({}))) as {
        extractedText?: string;
        text?: string;
        extractedCharCount?: number;
        deidentifiedCharCount?: number;
        confirmationToken?: string;
        confirmationExpiresAt?: string;
        message?: string;
      };

      if (
        !response.ok ||
        !result.text ||
        !result.extractedText ||
        !result.confirmationToken ||
        !result.confirmationExpiresAt
      ) {
        throw new Error(result.message || "pdf_deidentify_failed");
      }

      setSourceText(result.extractedText);
      setDeidentifiedText(result.text);
      setConfirmationToken(result.confirmationToken);
      setConfirmationExpiresAt(result.confirmationExpiresAt);
      setDeidentifiedConfirmed(false);
      setSummary("");
      const extractedCount = result.extractedCharCount ?? result.extractedText.length;
      const warning =
        extractedCount < 300
          ? "解析字數偏少，這份 PDF 可能不是完整文字型 PDF，請先檢查內容。"
          : "請檢查遮蔽預覽，確認後再產生摘要。";
      setPdfStatus(`PDF 已解析 ${extractedCount.toLocaleString()} 字。${warning}`);
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error ? caughtError.message : "pdf_deidentify_failed";
      if (errorMessage === "pdf_text_not_found") {
        setError("PDF 未抽取到可用文字，這份檔案可能是掃描影像 PDF。");
      } else if (errorMessage === "invalid_pdf") {
        setError("PDF 檔案格式無法辨識，請重新選擇檔案。");
      } else {
        setError("PDF 解析或個資遮蔽失敗，請確認檔案為可選取文字的 PDF。");
      }
      setPdfStatus("");
    } finally {
      setPdfUploading(false);
    }
  }

  async function handleSummarize() {
    setError("");
    setCopyStatus("");
    setDeidentifiedCopyStatus("");
    setRiskWarnings([]);

    if (!deidentifiedConfirmed) {
      setError("請先確認去識別化後文字預覽，再產生摘要。");
      return;
    }

    setSummarizing(true);

    try {
      const result = await apiRequest<{
        summary: string;
        mode: SummaryMode;
        modeLabel: string;
        riskWarnings?: string[];
      }>("/api/summarize", {
        method: "POST",
        body: JSON.stringify({ text: deidentifiedText, mode, confirmationToken })
      });
      setSummary(result.summary);
      setUsedModeLabel(result.modeLabel);
      setRiskWarnings(result.riskWarnings ?? []);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        if (caughtError.message === "confirmation_required") {
          setError("確認憑證已失效，請重新執行個資遮蔽預覽後再產生摘要。");
        } else if (caughtError.message === "privacy_risk_detected") {
          const warnings = Array.isArray(caughtError.payload.riskWarnings)
            ? caughtError.payload.riskWarnings.filter(
                (item): item is string => typeof item === "string"
              )
            : [];
          setRiskWarnings(warnings);
          setError("系統偵測到疑似未遮蔽個資，請重新檢查去識別化預覽。");
        } else {
          setError("摘要產生失敗，請稍後再試。");
        }
      } else {
        setError("摘要產生失敗，請稍後再試。");
      }
    } finally {
      setSummarizing(false);
    }
  }

  async function handleCopy() {
    if (!summary) return;
    await navigator.clipboard.writeText(summary);
    setCopyStatus("已複製全文。");
  }

  async function handleCopyDeidentifiedText() {
    if (!deidentifiedText) return;
    await navigator.clipboard.writeText(deidentifiedText);
    setDeidentifiedCopyStatus("已複製去識別化文字。");
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

  useEffect(() => {
    let timeoutId = window.setTimeout(() => {
      setIdleNotice("已因閒置超過 15 分鐘自動登出。");
      void handleLogout();
    }, IDLE_LOGOUT_MS);

    function resetIdleTimer() {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setIdleNotice("已因閒置超過 15 分鐘自動登出。");
        void handleLogout();
      }, IDLE_LOGOUT_MS);
    }

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((eventName) => window.addEventListener(eventName, resetIdleTimer));
    return () => {
      window.clearTimeout(timeoutId);
      events.forEach((eventName) =>
        window.removeEventListener(eventName, resetIdleTimer)
      );
    };
  }, []);

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
          <div className="grid gap-4 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
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
                      "⭐ 臨床模式（Clinical）"
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

            <div>
              <span className="mb-2 block text-sm font-semibold text-clinical-ink">
                PDF 病摘
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  key={pdfInputKey}
                  accept="application/pdf,.pdf"
                  className="block max-w-full text-sm text-clinical-muted file:mr-3 file:rounded-md file:border file:border-clinical-line file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-clinical-ink hover:file:bg-clinical-panel"
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setError("");
                    setCopyStatus("");
                    setDeidentifiedCopyStatus("");
                    setSelectedPdf(null);
                    if (!file) {
                      setPdfStatus("");
                      return;
                    }
                    if (file.size > MAX_PDF_FILE_SIZE_BYTES) {
                      setPdfStatus("");
                      setError("PDF 檔案超過 10 MB，請改用較小的文字型 PDF。");
                      setPdfInputKey((value) => value + 1);
                      return;
                    }
                    setSelectedPdf(file);
                    setPdfStatus(
                      `已選擇：${file.name}，大小 ${formatCount(file.size)} bytes。`
                    );
                  }}
                />
                <button
                  className="rounded-md bg-clinical-teal px-4 py-2 text-sm font-semibold text-white transition hover:bg-clinical-tealDark disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handlePdfDeidentify}
                  disabled={!selectedPdf || pdfUploading}
                  type="button"
                >
                  {pdfUploading ? "解析中..." : "解析 PDF 並遮蔽個資"}
                </button>
              </div>
              <p className="mt-2 text-xs leading-5 text-clinical-muted">
                目前僅支援可選取文字的 PDF，不支援掃描影像 OCR。PDF 不會儲存，解析後請先確認遮蔽預覽再產生摘要。
              </p>
              {pdfStatus ? (
                <p className="mt-2 rounded-md border border-clinical-line bg-clinical-panel px-3 py-2 text-xs leading-5 text-clinical-ink">
                  {pdfStatus}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {error ? (
          <section className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </section>
        ) : null}

        {idleNotice ? (
          <section className="mb-5 rounded-lg border border-clinical-line bg-white px-4 py-3 text-sm text-clinical-muted">
            {idleNotice}
          </section>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rounded-lg border border-clinical-line bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-clinical-ink">
                  英文病歷內容
                </h2>
                <p className="mt-1 text-xs text-clinical-muted">
                  {formatCount(sourceText.length)} / 120,000 字
                </p>
              </div>
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
              onChange={(event) => handleSourceTextChange(event.target.value)}
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
              <div>
                <h2 className="text-base font-semibold text-clinical-ink">
                  去識別化後文字預覽
                </h2>
                <p className="mt-1 text-xs text-clinical-muted">
                  {formatCount(deidentifiedText.length)} 字，已標記{" "}
                  {formatCount(maskedItemCount)} 個遮蔽項目
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {deidentifiedCopyStatus ? (
                  <span className="text-sm text-clinical-teal">
                    {deidentifiedCopyStatus}
                  </span>
                ) : null}
                <button
                  className="rounded-md border border-clinical-line px-3 py-2 text-sm font-medium text-clinical-ink transition hover:bg-clinical-panel disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleCopyDeidentifiedText}
                  disabled={!deidentifiedText}
                  type="button"
                >
                  複製去識別化文字
                </button>
                <button
                  className="rounded-md bg-clinical-teal px-4 py-2 text-sm font-semibold text-white transition hover:bg-clinical-tealDark disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleSummarize}
                  disabled={!canSummarize}
                  type="button"
                >
                  {summarizing ? "產生中..." : "產生摘要"}
                </button>
              </div>
            </div>
            <p className="mb-2 rounded-md border border-clinical-line bg-white px-3 py-2 text-xs leading-5 text-clinical-muted">
              {summarizeHint}
              {confirmationExpiresAt
                ? ` 確認憑證有效至 ${new Date(confirmationExpiresAt).toLocaleTimeString("zh-TW", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}。`
                : ""}
            </p>
            <pre className="h-[28rem] overflow-auto whitespace-pre-wrap rounded-md border border-clinical-line bg-clinical-panel p-3 font-mono text-sm leading-6 text-clinical-ink">
              {renderDeidentifiedPreview()}
            </pre>
            <label className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-clinical-warn">
              <input
                checked={deidentifiedConfirmed}
                className="mt-1 h-4 w-4 accent-clinical-teal"
                disabled={!deidentifiedText.trim()}
                onChange={(event) => setDeidentifiedConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span>
                我已確認去識別化預覽，未看到姓名、病歷號、身分證字號、電話、地址、生日、床號或家屬聯絡資訊。
              </span>
            </label>
          </section>
        </div>

        <section className="mt-5 rounded-lg border border-clinical-line bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-clinical-ink">
                摘要結果
              </h2>
              <p className="mt-1 text-xs text-clinical-muted">
                {summary ? `${formatCount(summary.length)} 字` : "尚未產生摘要"}
              </p>
            </div>
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
          {riskWarnings.length > 0 ? (
            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-clinical-warn">
              <p className="font-semibold">自動 QA 警示</p>
              <ul className="mt-1 list-disc pl-5">
                {riskWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <pre className="min-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-clinical-line bg-clinical-panel p-4 text-sm leading-7 text-clinical-ink">
            {summary || "中文臨床摘要會顯示在這裡。"}
          </pre>
        </section>
      </div>
    </main>
  );
}
