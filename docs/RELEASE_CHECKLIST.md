# 上線前驗收清單

本清單用於每次修改後、部署到 Render 前後檢查。不可使用真實病歷資料做驗收。

## 1. 本機自動檢查

執行：

```bash
npm run test:release
```

此指令會依序執行：

- `npm run typecheck`
- `npm run build`
- `npm run test:fixtures`
- `npm run test:pdf-fixtures`
- `npm run test:local-deidentify`
- `npm run test:summary-postprocess`
- `npm run test:security-workflow`

通過標準：

- 所有指令都必須通過。
- 測試不可寫入病歷內容到 `operation_logs.jsonl`。
- `.env`、`dist/`、`dist-test/`、`node_modules/`、`tests/output/`、`local-output/` 不可進入 Git。

## 2. OpenAI 假資料輸出實測

Clinical 模式為預設使用模式，修改 prompt、OpenAI 串接或後處理後，至少執行：

```bash
OPENAI_TEST_MODES=clinical npm run test:openai-output
```

若修改多模式 prompt，執行完整模式：

```bash
npm run test:openai-output
```

通過標準：

- 只能使用 `tests/fixtures/fakeMedicalRecords.ts` 的假病歷。
- 輸出只可寫入 `tests/output/`。
- 自動風險總結不可出現個資外洩、過度醫療建議、Clinical 模式空資料文字或西元日期未轉換。
- 若有警示，需人工判斷是否為 false positive；若不是，先調整 prompt 或後處理再部署。

## 3. 正式站 smoke test

部署完成後，使用正式站：

```text
https://hospital-record-summary.onrender.com/
```

僅使用假病歷測試：

1. 登入。
2. 貼上假病歷文字。
3. 按「個資遮蔽預覽」。
4. 確認遮蔽項目有標示。
5. 勾選去識別化確認。
6. 使用 Clinical 模式產生摘要。
7. 確認摘要沒有個資、沒有「病歷未提及」、日期為民國年。
8. 按「清空內容」，確認輸入與摘要清空。
9. 登出，確認回到登入頁。
10. 使用瀏覽器上一頁，確認不能看到原病歷內容。

PDF smoke test：

1. 上傳文字型假 PDF。
2. 確認顯示 PDF 抽取品質。
3. 確認去識別化預覽後才可產生摘要。
4. 使用掃描型或過短假 PDF 時，應被品質閘門阻擋。

## 4. 資安檢查

部署後確認：

- Render 使用 HTTPS。
- GitHub repository 保持 private。
- Render Environment Variables 設定完整，且沒有把 API Key 寫入程式碼。
- 前端 bundle 不含 OpenAI API Key。
- 後端沒有 `console.log` 病歷內容。
- 沒有使用 `localStorage`、`sessionStorage`、IndexedDB 或資料庫儲存病歷內容。
- `operation_logs.jsonl` 只記錄帳號、時間、功能、成功狀態與錯誤類型。

## 5. 停止上線條件

遇到以下任一情況，停止部署或回滾：

- `npm run test:release` 失敗。
- Clinical 模式假資料實測出現個資。
- Clinical 模式漏掉 DNR、comfort care、hospice、family meeting 等明確決策。
- 摘要出現「應立即」、「應該使用」、「建議治療」等過度醫療建議語氣。
- PDF 抽取品質不足仍可產生摘要。
- 登出或上一頁仍可看到病歷內容。
- Render 部署後 asset 路徑回傳 HTML 而不是 JS/CSS。

## 6. 院內真實使用前確認

真實病歷使用前必須確認：

- 院內是否允許把去識別化資料送外部 AI。
- 是否需要主管、資訊室或資安單位核准。
- 是否允許在院內電腦使用外部雲端網站。
- 是否需要改成院內網路或本機部署。

未確認前，本工具只能用於假資料或已核准的去識別化資料。
