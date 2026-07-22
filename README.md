# 醫院病歷摘要工具

這是一個個人登入版的醫院病歷摘要工具。登入後可貼上英文病歷內容，先進行個資遮蔽預覽，再將去識別化後文字送到 OpenAI API，依選定模式產生繁體中文臨床摘要。

本工具設計原則：

- 不提供註冊功能。
- 只有 `.env` 設定的一組帳號可登入。
- 前端不直接呼叫 OpenAI API。
- OpenAI API Key 只放在後端環境變數。
- 不儲存原始病歷全文。
- 不儲存未去識別化內容。
- 預設不儲存摘要內容。
- 只記錄操作紀錄，不記錄任何病歷文字。
- 產生摘要前需通過後端短效確認憑證與疑似個資風險檢查。

## 專案結構

```text
.
├── client/                 # React、TypeScript、Tailwind 前端
├── server/                 # Express、TypeScript 後端
├── scripts/                # 密碼雜湊與本機去識別化輔助工具
├── .env.example            # 環境變數範例
├── package.json            # 安裝、開發、建置、啟動指令
├── SECURITY.md             # 資安限制與注意事項
└── README.md               # 使用與部署說明
```

## 安裝

```bash
npm install
```

## 建議安全流程

若處理真實病歷，建議採用「本機先去識別化，再貼到雲端摘要」：

1. 在本機或院內允許的環境執行本機去識別化指令。
2. 人工檢查輸出檔，確認沒有姓名、病歷號、身分證字號、電話、地址、生日、床號或家屬聯絡資訊。
3. 將確認後的去識別化文字貼到網站。
4. 在網站再次執行「個資遮蔽預覽」與人工確認。
5. 再產生摘要。

此流程會比直接把原始 PDF 上傳到雲端更保守。若院內規範不允許資料離院或送外部 AI，即使已去識別化，也不要用真實病歷測試或摘要。

## 本機去識別化前處理

支援 `.pdf`、`.txt`、`.text`、`.md`。此指令不呼叫 OpenAI、不連線網路、不把病歷內容印到終端。

```bash
npm run deidentify:local -- /path/to/record.pdf
```

預設輸出到 `local-output/`，此資料夾已加入 `.gitignore`。終端只會顯示抽取字數、遮蔽項目數、PDF 抽取品質與輸出檔路徑。

可自訂輸出檔：

```bash
npm run deidentify:local -- /path/to/record.pdf --output /path/to/deidentified.txt
```

注意：

- 文字型 PDF 可抽取文字；掃描影像 PDF 仍需要院內允許的 OCR 或人工處理。
- `local-output/` 內雖然是去識別化文字，仍應視為敏感資料，使用後請依院內規範處理。
- 本機去識別化是前處理，不取代網站上的二次去識別化預覽與人工確認。

## 建立密碼雜湊

請不要把明碼密碼放進 `.env`。先用以下指令產生 bcrypt hash：

```bash
npm run hash-password -- 你的登入密碼
```

把輸出的 hash 填到 `.env` 的 `APP_PASSWORD_HASH`。

## 設定環境變數

專案不會把 `.env` 放進版本控制，所以剛下載或剛建立專案時通常只會看到 `.env.example`。請先複製 `.env.example` 成 `.env`：

```bash
cp .env.example .env
```

再產生一組登入密碼的 bcrypt hash：

```bash
npm run hash-password -- 你的登入密碼
```

指令會輸出一段像 `$2a$12$...` 開頭的字串，請把整段填到 `.env` 的 `APP_PASSWORD_HASH`。不要把明碼密碼填進 `.env`。

`.env` 需要填入：

```env
OPENAI_API_KEY=你的 OpenAI API Key
OPENAI_MODEL=gpt-4.1-mini
JWT_SECRET=至少 32 字元的隨機字串
APP_USERNAME=你的登入帳號
APP_PASSWORD_HASH=用 npm run hash-password 產生的 bcrypt hash
NODE_ENV=development
PORT=3000
```

欄位說明：

- `OPENAI_API_KEY`：OpenAI API Key，只能放在後端環境變數。
- `OPENAI_MODEL`：OpenAI 模型名稱，可保留 `gpt-4.1-mini`。
- `JWT_SECRET`：登入狀態簽章用密鑰，請用至少 32 字元以上的隨機字串。
- `APP_USERNAME`：唯一允許登入的帳號。
- `APP_PASSWORD_HASH`：bcrypt 密碼雜湊，不可填明碼密碼。
- `NODE_ENV`：本機開發用 `development`，正式部署用 `production`。
- `PORT`：本機預設 `3000`；雲端平台通常會自動指定。

可用以下方式產生一組隨機 `JWT_SECRET`：

```bash
node -e "console.log(crypto.randomUUID() + crypto.randomUUID())"
```

## 本機開發

```bash
npm run dev
```

前端開發伺服器會代理 `/api` 到後端。這只是開發用途；正式使用請部署到 HTTPS 雲端環境。

## 建置與正式啟動

```bash
npm run build
npm start
```

正式環境中，Express 會提供 API 與打包後的前端頁面。

## API

- `POST /api/login`：檢查帳號密碼，成功後以 HttpOnly Cookie 建立登入狀態。
- `POST /api/logout`：清除登入狀態。
- `GET /api/me`：檢查目前是否登入。
- `POST /api/deidentify`：執行個資遮蔽，不儲存原始文字。
- `POST /api/pdf/deidentify`：接收文字型 PDF，於記憶體抽取文字、檢查抽取品質並執行個資遮蔽，不儲存 PDF 或病歷文字。
- `POST /api/summarize`：僅登入後可用，接收文字、`mode` 與短效確認憑證。後端會再次去識別化、驗證確認憑證、執行疑似個資風險檢查後才呼叫 OpenAI API。

## PDF 病摘上傳

最保守的做法是先用 `npm run deidentify:local` 在本機完成前處理，再把確認後的去識別化文字貼到網站。

摘要頁支援上傳文字型 PDF：

1. 選擇 PDF 檔案。
2. 按「解析 PDF 並遮蔽個資」。
3. 系統在後端記憶體中抽取文字。
4. 自動執行 `deIdentifyMedicalText()`。
5. 系統檢查抽取字數、行數、估計頁數與常見臨床段落。
6. 回傳原始抽取文字、去識別化預覽與 PDF 抽取品質報告。
7. 若抽取品質足夠，後端才發出短效確認憑證。
8. 使用者勾選確認去識別化後，再按「產生摘要」。
9. 後端驗證該段文字的短效確認憑證，避免跳過預覽流程直接呼叫摘要。

安全限制：

- 僅支援可選取文字的 PDF。
- 暫不支援掃描影像 PDF 或 OCR。
- 若抽取文字少於 300 字、行數過少或未偵測到常見臨床段落，系統會阻擋直接產生摘要。
- 若抽取品質可疑但未達阻擋條件，前端會顯示警示，要求先人工確認內容完整性。
- PDF 檔案不寫入硬碟。
- 不建立 `uploads/` 資料夾。
- 不把 PDF 內容、抽取文字或去識別化後文字寫入操作紀錄。
- 上傳大小限制為 10 MB。
- 產生摘要前必須人工確認去識別化預覽。
- 確認憑證不儲存病歷文字，僅用文字雜湊與到期時間驗證流程。

## 摘要模式

`mode` 可使用：

- `clinical`：臨床模式，預設模式，偏向第一線護理師快速閱讀與交班。
- `auto`：自動判斷文件類型，再套用最適合格式。
- `general`：一般病歷摘要。
- `nursingHandoff`：護理交班。
- `pastHistory`：過去病史整理。
- `presentIllness`：現在病史整理。
- `familyMeeting`：家屬討論摘要。
- `hospiceCare`：安寧照護重點。
- `dischargeSummary`：出院摘要。
- `emergencyNote`：急診紀錄摘要。
- `dailyProgress`：每日病程摘要。

後端 prompt 已拆成：

- `server/prompts/baseRulesPrompt.ts`：所有模式共用底層規則。
- `server/prompts/glossaryPrompt.ts`：台灣臨床常用名詞對照。
- `server/prompts/modes.ts`：各摘要模式的用途、模式指令與輸出格式。
- `server/prompts/index.ts`：組合完整 prompt。
- `server/summaryPostProcess.ts`：摘要後處理，轉換完整西元日期為民國年；Clinical 模式會移除空資料區塊、缺資料文字與正常值敘述。

## 假病歷測試資料

測試資料位於 `tests/fixtures/fakeMedicalRecords.ts`，全部為虛構資料，包含：

- COPD/呼吸衰竭轉安寧假病歷。
- 癌症末期合併感染假病歷。
- 家屬討論 comfort care / DNR 假紀錄。
- discharge summary 假病歷。
- progress note 假病程。

每份資料包含英文原文、預期去識別化版本、預期應抓出的重點與不應出現內容。

完整上線前驗收流程請看 `docs/RELEASE_CHECKLIST.md`。

執行本機 fixture 測試：

```bash
npm run test:fixtures
```

此測試會檢查去識別化、臨床日期保留、所有摘要模式 prompt 規則、未使用瀏覽器持久化儲存、未加入資料庫依賴，以及測試過程未寫入操作紀錄。實際 AI 摘要品質仍需在設定 `OPENAI_API_KEY` 後，用假病歷逐份人工核對。

執行假 PDF 測試：

```bash
npm run test:pdf-fixtures
```

此測試會用 5 份虛構假病歷建立文字型 PDF buffer，檢查 PDF 抽取、個資遮蔽、臨床日期保留、抽取品質閘門，並確認影像型 PDF 與過短 PDF 不會被誤判為可直接摘要文字。

執行安全流程測試：

```bash
npm run test:security-workflow
```

此測試會檢查短效確認憑證、摘要前疑似個資阻擋、摘要後安寧決策保留提示與過度醫療建議語氣提示。

執行本機去識別化測試：

```bash
npm run test:local-deidentify
```

此測試會使用虛構假病歷檢查本機 `.txt` 與文字型 PDF 去識別化流程，並確認掃描型 PDF 不會被誤產生可摘要內容。

執行摘要後處理測試：

```bash
npm run test:summary-postprocess
```

此測試會檢查完整西元日期轉民國年、Clinical 模式移除「病歷未提及」等空資料文字，以及移除正常值敘述。

執行 OpenAI 實際輸出測試：

```bash
npm run test:openai-output
```

若只測 Clinical 模式：

```bash
OPENAI_TEST_MODES=clinical npm run test:openai-output
```

輸出會寫到 `tests/output/`，該資料夾已加入 `.gitignore`，不可使用真實病歷測試。

## 操作紀錄

系統只會寫入 `operation_logs.jsonl`，欄位包含：

- 使用者帳號
- 登入時間
- 使用時間
- 功能名稱
- 是否成功
- 錯誤類型

不會寫入病歷全文、去識別化前文字、去識別化後文字或摘要內容。

## 部署建議：Render

1. 將專案推到私人 GitHub repository。
2. 在 Render 建立 Web Service。
3. 可選擇使用專案內的 `render.yaml` 建立 Blueprint，或手動建立 Web Service。
4. Runtime 選 Node。
5. Build Command 設定：

```bash
npm ci --include=dev && npm run build
```

6. Start Command 設定：

```bash
npm start
```

7. 在 Render Environment Variables 設定：

```env
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
JWT_SECRET=...
APP_USERNAME=...
APP_PASSWORD_HASH=...
NODE_ENV=production
```

8. Render 預設提供 HTTPS 網址，請只使用 HTTPS 網址登入。

也可部署到 Railway 或 Fly.io，原則相同：後端必須持有 OpenAI API Key，前端不得直接接觸金鑰。

## 醫院使用提醒

若要在醫院電腦使用真實病歷，仍需先確認院內資訊安全規範、個資法要求、醫院是否允許將去識別化資料送至外部 AI 服務，以及 OpenAI API 使用條款與資料處理設定是否符合院內規範。
