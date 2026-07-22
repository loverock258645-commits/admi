# Prompt 調整紀錄

本文件用來記錄每次調整 prompt 的原因、修改內容與驗收結果。若 AI 輸出未通過 `docs/AI_OUTPUT_QA_CHECKLIST.md`，請先在該表記錄不通過原因，再於本文件新增調整紀錄。

## 記錄原則

1. 每次只針對明確問題調整 prompt。
2. 不要因單次偶發輸出就大幅改寫全部 prompt。
3. 調整後需用 5 份假病歷重新測試受影響模式。
4. 不使用真實病歷做 prompt 調整。
5. 若調整造成其他模式變差，需回滾或再拆分模式 prompt。

## 調整紀錄模板

```text
日期：
調整者：

問題來源：
- 假病歷：
- 摘要模式：
- 不通過項目：
- 原本輸出問題：

調整原因：

修改檔案：

調整前 prompt 摘要：

調整後 prompt 摘要：

預期改善：

重新測試結果：
- 測試假病歷：
- 測試模式：
- 是否通過：
- 最低分項目：
- 是否出現新問題：

後續處理：
```

## 調整紀錄

### 2026-07-08

初始建立 prompt 調整紀錄文件，尚未針對 AI 輸出進行 prompt 調整。

### 2026-07-22

問題來源：
- 假病歷：癌症末期合併感染假病歷、discharge summary 假病歷、家屬討論 comfort care / DNR 假紀錄。
- 摘要模式：Clinical。
- 不通過項目：Clinical 模式出現「病歷未提及」、日期未轉民國年、正常值敘述被列入。

調整原因：
Clinical 模式是預設模式，需比一般摘要更像第一線護理師快速閱讀內容。實測發現僅靠 prompt 仍可能受共用規則影響，偶發輸出缺資料文字或西元日期，因此補強 Clinical prompt，並加入 deterministic 摘要後處理。

修改檔案：
- `server/prompts/clinicalModePrompt.ts`
- `server/summaryPostProcess.ts`
- `server/openai.ts`
- `tests/run-openai-output-tests.ts`
- `tests/run-summary-postprocess-tests.ts`

調整前 prompt 摘要：
- Clinical 模式要求不顯示「病歷未提及」、「無」、「N/A」。
- 要求日期轉民國年。
- 要求正常值不列。

調整後 prompt 摘要：
- 明確指定 Clinical 模式優先於共用規則中的「病歷未提及」寫法。
- 明確禁止輸出 20xx 年、20xx-xx-xx、20xx/xx/xx。
- 明確禁止正常或無異常資訊。
- 指定無資料區塊必須整段省略。

重新測試結果：
- `OPENAI_TEST_MODES=clinical npm run test:openai-output`
- 5 份假病歷 Clinical 模式均完成實際 OpenAI 輸出。
- `tests/output/2026-07-22-ai-output-test-clinical.md` 自動風險總結：未偵測到高風險問題。
- `npm run test:summary-postprocess` 通過 5 / 5。

後續處理：
- 若之後人工評分仍覺得 Clinical 太像報告或交班不好用，下一輪只調整 Clinical mode，不影響其他模式。
