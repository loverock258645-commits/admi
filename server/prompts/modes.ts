import type { ModePrompt, SummaryMode } from "./types.js";
import { clinicalModePrompt } from "./clinicalModePrompt.js";
import { clinicalNarrativeModePrompt } from "./clinicalNarrativeModePrompt.js";

export const modePrompts: Record<SummaryMode, ModePrompt> = {
  clinical: clinicalModePrompt,
  clinicalNarrative: clinicalNarrativeModePrompt,
  auto: {
    label: "自動判斷",
    purpose: "由 AI 先判斷文件類型，再選擇最適合的臨床摘要格式。",
    prompt: `請先判斷輸入內容屬於下列哪種文件類型：
- Admission Note
- Discharge Summary
- Progress Note
- Emergency Note
- Consult Note
- Family Meeting
- Hospice/Palliative Note
- Mixed Medical Record

判斷後，請套用最適合護理師快速使用的摘要格式。若內容混合多種文件，請以臨床照護重要性整合，不要重複列同一件事。`,
    outputFormat: `輸出格式：
【自動判斷文件類型】
- 文件類型：
- 採用摘要方向：

【臨床重點摘要】
依文件類型使用最合適的小標題整理，需保留安寧與醫療決策內容。

【護理需注意事項】
- 

【一句話摘要】
請用 30-60 字完成。`
  },
  general: {
    label: "一般病歷摘要",
    purpose: "完整整理住院原因、病程、治療、醫療決策與護理交班重點。",
    prompt: "請整理成一般病歷摘要，保留臨床照護與安寧決策需要的資訊。",
    outputFormat: `輸出格式：
==============================
中文病歷摘要
==============================

【入院原因】
請用 2-4 句整理此次入院主要原因。

【重要過去病史】
- 

【現在病史】
請依時間順序整理此次病程。

【重要檢查】
- 影像檢查：
- 心電圖：
- 內視鏡或其他檢查：

【重要異常檢驗】
只列異常且有臨床意義者。若未提及，寫「病歷未提及」。

【住院治療經過】
- 

【醫療決策與家屬討論】
- 

【安寧照護重點】
- 

【護理交班重點】
- 

【一句話摘要】
請用 30-60 字完成。`
  },
  nursingHandoff: {
    label: "護理交班",
    purpose: "轉成可直接交班的短摘要，聚焦目前狀況、風險、治療與照護重點。",
    prompt: "請使用臨床護理交班語氣，簡潔但完整，不列無關行政內容。",
    outputFormat: `輸出格式：
【主要診斷】
- 

【目前狀況】
- 

【今日需觀察症狀】
- 

【目前治療與管路】
- 

【家屬決策方向】
- 

【本班照護重點】
- 

【一句話交班】
請用 30-60 字完成。`
  },
  pastHistory: {
    label: "過去病史整理",
    purpose: "整理慢性病、癌症、手術、住院與長期治療，去除重複診斷。",
    prompt: "請只聚焦過去病史與長期治療，去除重複診斷，不要整理此次病程細節。",
    outputFormat: `輸出格式：
【慢性疾病】
- 

【癌症病史】
- 

【手術史】
- 

【重要住院史】
- 

【長期用藥或治療】
- 

【去除重複診斷後重點】
- `
  },
  presentIllness: {
    label: "現在病史整理",
    purpose: "依時間順序整理此次症狀、就醫、入院、住院變化與轉安寧原因。",
    prompt: "請用一段完整敘述整理現在病史，保留時間軸，不要條列成太碎的片段。",
    outputFormat: `輸出格式：
【現在病史】
請用一段完整敘述，依時間順序整理此次症狀、就醫原因、急診或門診重要發現、入院原因、住院後病況變化與轉安寧原因。若某項未提及，於段落中清楚寫「病歷未提及」。`
  },
  familyMeeting: {
    label: "家屬討論摘要",
    purpose: "整理醫病溝通、家屬理解、擔憂、決策與可放入護理紀錄的敘述。",
    prompt: "請只整理病歷中有明確記載的家屬討論、醫療決策與照護共識，不可推測家屬態度。",
    outputFormat: `輸出格式：
【討論對象】
- 

【醫師說明內容】
- 

【家屬理解程度】
- 

【家屬擔憂】
- 

【醫療決策】
- 

【後續照護共識】
- 

【可用於護理紀錄的敘述】
請以護理紀錄語氣寫 2-4 句。`
  },
  hospiceCare: {
    label: "安寧照護重點",
    purpose: "整理症狀控制、舒適照護、家屬需求與末期照護方向。",
    prompt: "請以安寧病房護理師角度整理照護重點，保留 DNR、ACP、舒適照護與撤除或不施行治療相關決策。",
    outputFormat: `輸出格式：
【疼痛】
- 

【呼吸喘】
- 

【噁心嘔吐】
- 

【譫妄/躁動】
- 

【分泌物】
- 

【發燒感染】
- 

【腹水/水腫】
- 

【營養進食】
- 

【排泄】
- 

【家屬焦慮/哀傷】
- 

【舒適照護方向】
- `
  },
  dischargeSummary: {
    label: "出院摘要",
    purpose: "整理出院摘要重點，包含診斷、住院經過、治療、出院狀態與追蹤。",
    prompt: "請整理成出院摘要重點，適合護理師快速掌握住院歷程與出院安排。",
    outputFormat: `輸出格式：
【入院診斷】
- 

【出院診斷】
- 

【住院經過】
- 

【重要檢查】
- 

【重要治療】
- 

【出院狀態】
- 

【出院安排】
- 

【後續追蹤】
- `
  },
  emergencyNote: {
    label: "急診紀錄摘要",
    purpose: "整理急診到院原因、生命徵象、檢查、處置、入院原因與目前風險。",
    prompt: "請整理急診紀錄，聚焦到院原因、急性風險、急診處置與入院或轉安寧原因。",
    outputFormat: `輸出格式：
【到院原因】
- 

【到院時生命徵象與意識】
- 

【急診重要檢查】
- 

【急診處置】
- 

【入院/轉安寧原因】
- 

【目前風險】
- `
  },
  dailyProgress: {
    label: "每日病程摘要",
    purpose: "整理單日病程、檢查變化、今日處置、醫師計畫與護理注意事項。",
    prompt: "請整理每日病程摘要，聚焦今天或該病程紀錄中的變化，不重述完整住院史。",
    outputFormat: `輸出格式：
【今日主觀症狀】
- 

【今日客觀發現】
- 

【重要檢驗/檢查變化】
- 

【今日處置】
- 

【醫師計畫】
- 

【護理需注意事項】
- `
  }
};
