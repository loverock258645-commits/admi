export type FakeMedicalRecordFixture = {
  id: string;
  title: string;
  englishOriginal: string;
  expectedDeidentified: string;
  expectedKeyPoints: string[];
  privacyForbiddenContent: string[];
  forbiddenContent: string[];
  clinicalDatesToPreserve: string[];
};

export const fakeMedicalRecordFixtures: FakeMedicalRecordFixture[] = [
  {
    id: "copd-respiratory-failure-hospice",
    title: "COPD/呼吸衰竭轉安寧假病歷",
    englishOriginal: `Patient Name: Robert Lin
MRN: MRN-COPD-0001
ID No: A123456789
Phone: 0912-345-678
Address: No. 10, Peace Road, Taipei City
DOB: 1942-05-16

Admission Note
Admission Date: 2026-03-12
The patient is an 83-year-old man with COPD, chronic hypercapnic respiratory failure, HTN, and CKD stage 3. He had progressive dyspnea, productive cough, and poor oral intake for 5 days. He was brought to the ED on 2026-03-12 because of drowsiness and severe shortness of breath.

In the ED, SpO2 was 82% on room air, RR 32/min, and ABG showed pH 7.25, PaCO2 78 mmHg. Chest X-ray showed hyperinflation and right lower lobe pneumonia. WBC 18,600/uL and CRP 12.4 mg/dL were noted. Sodium, potassium, and liver enzymes were within normal limits.

He was treated with oxygen, BiPAP, bronchodilators, steroid, and piperacillin/tazobactam. Despite treatment, he remained tachypneic and required frequent suctioning. The physician explained poor prognosis and recurrent respiratory failure to the family on 2026-03-14. Family meeting documented DNR and no endotracheal intubation. Family agreed to hospice transfer for comfort care. Morphine was started for dyspnea relief.`,
    expectedDeidentified: `Patient Name: [病人姓名已遮蔽]
MRN: [病歷號已遮蔽]
ID No: [身分證字號已遮蔽]
Phone: [電話已遮蔽]
Address: [地址已遮蔽]
DOB: [生日已遮蔽]

Admission Note
Admission Date: 2026-03-12
The patient is an 83-year-old man with COPD, chronic hypercapnic respiratory failure, HTN, and CKD stage 3. He had progressive dyspnea, productive cough, and poor oral intake for 5 days. He was brought to the ED on 2026-03-12 because of drowsiness and severe shortness of breath.

In the ED, SpO2 was 82% on room air, RR 32/min, and ABG showed pH 7.25, PaCO2 78 mmHg. Chest X-ray showed hyperinflation and right lower lobe pneumonia. WBC 18,600/uL and CRP 12.4 mg/dL were noted. Sodium, potassium, and liver enzymes were within normal limits.

He was treated with oxygen, BiPAP, bronchodilators, steroid, and piperacillin/tazobactam. Despite treatment, he remained tachypneic and required frequent suctioning. The physician explained poor prognosis and recurrent respiratory failure to the family on 2026-03-14. Family meeting documented DNR and no endotracheal intubation. Family agreed to hospice transfer for comfort care. Morphine was started for dyspnea relief.`,
    expectedKeyPoints: [
      "COPD、慢性高碳酸血症呼吸衰竭",
      "右下肺肺炎、WBC 與 CRP 升高",
      "使用氧氣、BiPAP、支氣管擴張劑、類固醇與抗生素",
      "2026-03-14 family meeting",
      "DNR、不插管、轉安寧、comfort care",
      "Morphine 用於呼吸喘緩解"
    ],
    privacyForbiddenContent: [
      "Robert Lin",
      "MRN-COPD-0001",
      "A123456789",
      "0912-345-678",
      "No. 10, Peace Road",
      "1942-05-16"
    ],
    forbiddenContent: [
      "Robert Lin",
      "MRN-COPD-0001",
      "A123456789",
      "0912-345-678",
      "No. 10, Peace Road",
      "1942-05-16",
      "sodium normal",
      "potassium normal",
      "liver enzymes normal"
    ],
    clinicalDatesToPreserve: ["2026-03-12", "2026-03-14"]
  },
  {
    id: "terminal-cancer-infection",
    title: "癌症末期合併感染假病歷",
    englishOriginal: `Patient Name: Mei Chen
Chart No: ONC-2026-0202
ID No: B223456789
Tel: 02-2345-6789
Address: 5F, No. 88, Zhongshan North Road, New Taipei City
Date of Birth: 1961/11/03

Hospice/Palliative Note
Admission Date: 2026-04-02
The patient has metastatic colorectal cancer with liver and lung metastases. She received prior chemotherapy and target therapy but disease progressed. She presented with fever, poor appetite, abdominal distension, and general weakness for 1 week.

CT abdomen on 2026-04-03 showed multiple liver metastases, ascites, and suspected intra-abdominal infection. Blood culture later grew Klebsiella pneumoniae. WBC 22,400/uL, CRP 18.2 mg/dL, total bilirubin 5.6 mg/dL, albumin 2.4 g/dL, and lactate 3.8 mmol/L were reported. Renal function was normal.

She received ceftriaxone then escalated to meropenem due to persistent fever. Paracentesis was performed for tense ascites. Pain was controlled with fentanyl patch and breakthrough morphine. The oncology team documented terminal stage disease and discussed palliative care with family. DNR was signed on 2026-04-05. Family preferred symptom control and no ICU transfer.`,
    expectedDeidentified: `Patient Name: [病人姓名已遮蔽]
Chart No: [病歷號已遮蔽]
ID No: [身分證字號已遮蔽]
Tel: [電話已遮蔽]
Address: [地址已遮蔽]
Date of Birth: [生日已遮蔽]

Hospice/Palliative Note
Admission Date: 2026-04-02
The patient has metastatic colorectal cancer with liver and lung metastases. She received prior chemotherapy and target therapy but disease progressed. She presented with fever, poor appetite, abdominal distension, and general weakness for 1 week.

CT abdomen on 2026-04-03 showed multiple liver metastases, ascites, and suspected intra-abdominal infection. Blood culture later grew Klebsiella pneumoniae. WBC 22,400/uL, CRP 18.2 mg/dL, total bilirubin 5.6 mg/dL, albumin 2.4 g/dL, and lactate 3.8 mmol/L were reported. Renal function was normal.

She received ceftriaxone then escalated to meropenem due to persistent fever. Paracentesis was performed for tense ascites. Pain was controlled with fentanyl patch and breakthrough morphine. The oncology team documented terminal stage disease and discussed palliative care with family. DNR was signed on 2026-04-05. Family preferred symptom control and no ICU transfer.`,
    expectedKeyPoints: [
      "轉移性大腸直腸癌，肝肺轉移",
      "發燒、食慾差、腹脹、虛弱",
      "疑腹腔感染、Klebsiella pneumoniae 菌血症",
      "WBC、CRP、bilirubin、albumin、lactate 異常",
      "ceftriaxone 轉 meropenem、腹水穿刺",
      "terminal stage、palliative care、DNR、不轉 ICU"
    ],
    privacyForbiddenContent: [
      "Mei Chen",
      "ONC-2026-0202",
      "B223456789",
      "02-2345-6789",
      "Zhongshan North Road",
      "1961/11/03"
    ],
    forbiddenContent: [
      "Mei Chen",
      "ONC-2026-0202",
      "B223456789",
      "02-2345-6789",
      "Zhongshan North Road",
      "1961/11/03",
      "renal function normal"
    ],
    clinicalDatesToPreserve: ["2026-04-02", "2026-04-03", "2026-04-05"]
  },
  {
    id: "family-meeting-comfort-dnr",
    title: "家屬討論 comfort care / DNR 假紀錄",
    englishOriginal: `Name: David Huang
MRN: FM-303030
National ID: C123456789
Mobile: 0988 777 666
Address: 12F, No. 66, Minsheng East Road, Taipei City
Birthday: July 9, 1948

Family Meeting Note
Meeting Date: 2026-05-18
Participants included the attending physician, hospice nurse, wife, and two adult children. The physician explained that the patient had advanced heart failure with repeated aspiration pneumonia and poor response to antibiotics. The physician also explained that CPR and endotracheal intubation were unlikely to reverse the terminal condition and might increase suffering.

The family stated they understood the poor prognosis. The wife worried about dyspnea and choking. The children asked whether oxygen, morphine, and suctioning could still be provided. The team explained comfort care, symptom relief, oxygen for comfort, and medication for dyspnea would continue. Family agreed to DNR, no CPR, no endotracheal intubation, no ICU transfer, and no tube feeding escalation. They requested hospice ward care and family presence.`,
    expectedDeidentified: `Name: [病人姓名已遮蔽]
MRN: [病歷號已遮蔽]
National ID: [身分證字號已遮蔽]
Mobile: [電話已遮蔽]
Address: [地址已遮蔽]
Birthday: [生日已遮蔽]

Family Meeting Note
Meeting Date: 2026-05-18
Participants included the attending physician, hospice nurse, wife, and two adult children. The physician explained that the patient had advanced heart failure with repeated aspiration pneumonia and poor response to antibiotics. The physician also explained that CPR and endotracheal intubation were unlikely to reverse the terminal condition and might increase suffering.

The family stated they understood the poor prognosis. The wife worried about dyspnea and choking. The children asked whether oxygen, morphine, and suctioning could still be provided. The team explained comfort care, symptom relief, oxygen for comfort, and medication for dyspnea would continue. Family agreed to DNR, no CPR, no endotracheal intubation, no ICU transfer, and no tube feeding escalation. They requested hospice ward care and family presence.`,
    expectedKeyPoints: [
      "family meeting 參與者：醫師、安寧護理師、妻子、兩名成年子女",
      "末期心臟衰竭、反覆吸入性肺炎、抗生素反應差",
      "醫師說明 CPR 與插管難以逆轉病況且可能增加痛苦",
      "家屬理解預後不佳，擔心喘與嗆咳",
      "comfort care、氧氣舒適使用、morphine、抽痰仍可提供",
      "DNR、no CPR、不插管、不轉 ICU、不升級管灌"
    ],
    privacyForbiddenContent: [
      "David Huang",
      "FM-303030",
      "C123456789",
      "0988 777 666",
      "Minsheng East Road",
      "July 9, 1948"
    ],
    forbiddenContent: [
      "David Huang",
      "FM-303030",
      "C123456789",
      "0988 777 666",
      "Minsheng East Road",
      "July 9, 1948",
      "family refused all care"
    ],
    clinicalDatesToPreserve: ["2026-05-18"]
  },
  {
    id: "discharge-summary",
    title: "discharge summary 假病歷",
    englishOriginal: `Patient Name: Grace Wu
Medical Record No: DS-445566
ID Number: D223456789
Phone: +886 912 111 222
Address: No. 3, Renai Road, Taichung City
DOB: 1955/08/21

Discharge Summary
Admission Date: 2026-01-07
Discharge Date: 2026-01-18
Admission diagnosis: acute decompensated heart failure with pleural effusion.
Discharge diagnosis: heart failure, pneumonia improved, bilateral pleural effusion status post drainage.

Hospital course: The patient presented with dyspnea, leg edema, and orthopnea. Chest X-ray on 2026-01-07 showed pulmonary congestion and bilateral pleural effusion. BNP was 2860 pg/mL and creatinine increased from baseline to 2.1 mg/dL. CBC and liver function were unremarkable.

She received oxygen, IV furosemide, ceftriaxone for suspected pneumonia, and right pigtail drainage on 2026-01-10. Dyspnea improved after diuresis and drainage. The pigtail was removed on 2026-01-15. She was discharged on oral diuretics with cardiology follow-up. No DNR or hospice discussion was documented in this admission.`,
    expectedDeidentified: `Patient Name: [病人姓名已遮蔽]
Medical Record No: [病歷號已遮蔽]
ID Number: [身分證字號已遮蔽]
Phone: [電話已遮蔽]
Address: [地址已遮蔽]
DOB: [生日已遮蔽]

Discharge Summary
Admission Date: 2026-01-07
Discharge Date: 2026-01-18
Admission diagnosis: acute decompensated heart failure with pleural effusion.
Discharge diagnosis: heart failure, pneumonia improved, bilateral pleural effusion status post drainage.

Hospital course: The patient presented with dyspnea, leg edema, and orthopnea. Chest X-ray on 2026-01-07 showed pulmonary congestion and bilateral pleural effusion. BNP was 2860 pg/mL and creatinine increased from baseline to 2.1 mg/dL. CBC and liver function were unremarkable.

She received oxygen, IV furosemide, ceftriaxone for suspected pneumonia, and right pigtail drainage on 2026-01-10. Dyspnea improved after diuresis and drainage. The pigtail was removed on 2026-01-15. She was discharged on oral diuretics with cardiology follow-up. No DNR or hospice discussion was documented in this admission.`,
    expectedKeyPoints: [
      "急性心臟衰竭惡化、肋膜積液",
      "入院與出院診斷",
      "BNP 2860、Cr 2.1",
      "氧氣、IV furosemide、ceftriaxone、右側 pigtail 引流",
      "2026-01-18 出院，口服利尿劑與心臟科追蹤",
      "DNR 或 hospice 討論未記載"
    ],
    privacyForbiddenContent: [
      "Grace Wu",
      "DS-445566",
      "D223456789",
      "+886 912 111 222",
      "Renai Road",
      "1955/08/21"
    ],
    forbiddenContent: [
      "Grace Wu",
      "DS-445566",
      "D223456789",
      "+886 912 111 222",
      "Renai Road",
      "1955/08/21",
      "CBC unremarkable",
      "liver function unremarkable"
    ],
    clinicalDatesToPreserve: ["2026-01-07", "2026-01-18", "2026-01-10", "2026-01-15"]
  },
  {
    id: "progress-note",
    title: "progress note 假病程",
    englishOriginal: `Patient Name: Alan Tsai
Chart Number: PN-778899
ID No: E123456789
Tel: 04-2222-3333
Address: No. 21, Guangfu Road, Hsinchu City
Date of Birth: 1970-02-14

Progress Note
Date: 2026-06-09
Subjective: Patient reported less abdominal pain after morphine titration but still had intermittent nausea. Family reported increased sleepiness at night.

Objective: Afebrile. Abdomen distended with shifting dullness. Pitting edema over bilateral legs. Urine output decreased compared with yesterday. Albumin 2.2 g/dL, sodium 128 mmol/L, creatinine 2.6 mg/dL. Potassium was within normal range.

Assessment: Advanced HCC with ascites, AKI, hyponatremia, and poor oral intake. Palliative care goal remained symptom control. DNR status confirmed in chart.

Plan: Continue morphine for pain, metoclopramide for nausea, restrict free water, hold nephrotoxic agents, discuss paracentesis if abdominal distension worsens, and update family regarding comfort-focused care.`,
    expectedDeidentified: `Patient Name: [病人姓名已遮蔽]
Chart Number: [病歷號已遮蔽]
ID No: [身分證字號已遮蔽]
Tel: [電話已遮蔽]
Address: [地址已遮蔽]
Date of Birth: [生日已遮蔽]

Progress Note
Date: 2026-06-09
Subjective: Patient reported less abdominal pain after morphine titration but still had intermittent nausea. Family reported increased sleepiness at night.

Objective: Afebrile. Abdomen distended with shifting dullness. Pitting edema over bilateral legs. Urine output decreased compared with yesterday. Albumin 2.2 g/dL, sodium 128 mmol/L, creatinine 2.6 mg/dL. Potassium was within normal range.

Assessment: Advanced HCC with ascites, AKI, hyponatremia, and poor oral intake. Palliative care goal remained symptom control. DNR status confirmed in chart.

Plan: Continue morphine for pain, metoclopramide for nausea, restrict free water, hold nephrotoxic agents, discuss paracentesis if abdominal distension worsens, and update family regarding comfort-focused care.`,
    expectedKeyPoints: [
      "病程日期 2026-06-09",
      "morphine 調整後腹痛改善，仍噁心",
      "腹水、雙下肢水腫、尿量下降",
      "Albumin 2.2、Na 128、Cr 2.6",
      "末期 HCC、AKI、低血鈉、進食差",
      "palliative care 以症狀控制為目標、DNR confirmed"
    ],
    privacyForbiddenContent: [
      "Alan Tsai",
      "PN-778899",
      "E123456789",
      "04-2222-3333",
      "Guangfu Road",
      "1970-02-14"
    ],
    forbiddenContent: [
      "Alan Tsai",
      "PN-778899",
      "E123456789",
      "04-2222-3333",
      "Guangfu Road",
      "1970-02-14",
      "Potassium was within normal range"
    ],
    clinicalDatesToPreserve: ["2026-06-09"]
  }
];
