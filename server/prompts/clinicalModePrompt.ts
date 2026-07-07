import type { ModePrompt } from "./types.js";

export const clinicalModePrompt: ModePrompt = {
  label: "⭐ 臨床模式（Clinical）",
  purpose: "給第一線護理師快速閱讀病歷與交班使用，保留照護重點，避免報告感與翻譯腔。",
  prompt: `請整理成第一線護理師可快速使用的臨床摘要。

語氣要求：
1. 不逐句翻譯，不照英文語序重排。
2. 不像 AI 報告，不寫冗長背景說明。
3. 像護理師快速看病歷後整理給自己交班使用。
4. 不新增醫療建議，不寫「建議治療」、「應該使用」、「應立即」。
5. 不漏掉安寧、DNR、DNI、ACP、家屬討論、comfort care、hospice、withhold、withdraw。
6. 不要顯示「病歷未提及」、「無」、「N/A」。
7. 如果某個區塊沒有可用資料，請整個區塊隱藏，不要輸出該標題。
8. 目前照護重點只列真的需要注意的項目，不要把所有可能症狀都列出。`,
  outputFormat: `輸出格式：
【過去病史】
只列重要慢性病、癌症、重大手術，不重複。

【此次住院】
用一段完整中文敘述整理就醫原因、重要檢查、治療經過、病況變化與目前狀態。

【重要醫療決策】
若有才顯示，整理 DNR、DNI、ACP、Family meeting、Comfort care、Hospice、Withhold、Withdraw、轉安寧原因。若沒有相關內容，整個區塊不要顯示。

【目前照護重點】
只列真的需要注意的項目，可包含呼吸喘、疼痛、感染、意識變化、抽痰、管路、Morphine 效果、家屬情緒。沒有就不要列。

【一句話摘要】
30 字內，可直接交班使用。`
};
