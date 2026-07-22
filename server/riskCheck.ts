export type RiskCheckResult = {
  blockingIssues: string[];
  warnings: string[];
};

type KeywordRule = {
  source: RegExp;
  summary: RegExp;
  message: string;
};

const unmaskedIdentifierRules: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /\b[A-Z][12]\d{8}\b/g,
    message: "疑似身分證字號仍未遮蔽"
  },
  {
    pattern: /\b(?:\+?886[-\s]?)?9\d{2}[-\s]?\d{3}[-\s]?\d{3}\b/g,
    message: "疑似手機號碼仍未遮蔽"
  },
  {
    pattern: /\b0\d{1,2}[-\s]?\d{6,8}(?:\s*(?:ext|#|分機)\s*\d{1,6})?\b/gi,
    message: "疑似市話號碼仍未遮蔽"
  },
  {
    pattern:
      /\b(?:Patient Name|Name|姓名)\s*[:：#-]?\s*(?!\[病人姓名已遮蔽\])[\p{L}][^\n\r;|,]{1,60}/giu,
    message: "疑似病人姓名欄位仍未遮蔽"
  },
  {
    pattern:
      /\b(?:Contact Person|Emergency Contact|Family Contact|Relative Name|Caregiver Name|家屬姓名|聯絡人|緊急聯絡人|主要照顧者)\s*[:：#-]?\s*(?!\[聯絡人姓名已遮蔽\])[\p{L}][^\n\r;|,]{1,60}/giu,
    message: "疑似聯絡人或家屬姓名仍未遮蔽"
  },
  {
    pattern:
      /\b(?:MRN|Chart\s*No\.?|Chart\s*Number|Medical Record No|病歷號)\s*[:：#-]?\s*(?!\[病歷號已遮蔽\])[A-Z0-9-]{4,30}\b/gi,
    message: "疑似病歷號仍未遮蔽"
  },
  {
    pattern:
      /\b(?:DOB|Date of Birth|Birth Date|Birthday|出生日期|生日)\s*[:：#-]?\s*(?!\[生日已遮蔽\])(?:\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/gi,
    message: "疑似生日仍未遮蔽"
  },
  {
    pattern: /\b(?:Address|地址)\s*[:：#-]?\s*(?!\[地址已遮蔽\]).{6,120}/gi,
    message: "疑似地址仍未遮蔽"
  }
];

const keywordRules: KeywordRule[] = [
  {
    source: /\bDNR\b|do not resuscitate|不施行心肺復甦/gi,
    summary: /\bDNR\b|不施行心肺復甦/gi,
    message: "原文提到 DNR，但摘要可能未保留"
  },
  {
    source: /comfort care|舒適照護/gi,
    summary: /comfort care|舒適照護/gi,
    message: "原文提到 comfort care，但摘要可能未保留"
  },
  {
    source: /hospice|安寧/gi,
    summary: /hospice|安寧/gi,
    message: "原文提到 hospice，但摘要可能未保留"
  },
  {
    source: /palliative|緩和/gi,
    summary: /palliative|緩和/gi,
    message: "原文提到 palliative care，但摘要可能未保留"
  },
  {
    source: /family meeting|家屬討論|家庭會議/gi,
    summary: /family meeting|家屬討論|家庭會議/gi,
    message: "原文提到 family meeting，但摘要可能未保留"
  },
  {
    source: /\bwithhold\b|withholding|不予|暫不/gi,
    summary: /withhold|不予|暫不/gi,
    message: "原文提到 withhold，但摘要可能未保留"
  },
  {
    source: /\bwithdraw\b|withdrawal|撤除|撤回/gi,
    summary: /withdraw|撤除|撤回/gi,
    message: "原文提到 withdraw，但摘要可能未保留"
  }
];

const medicalAdviceToneRules = [
  /建議治療/g,
  /應該使用/g,
  /應立即/g,
  /必須立即/g,
  /需立即給予/g
];

function unique(messages: string[]) {
  return [...new Set(messages)];
}

export function checkDeidentifiedTextRisk(text: string): RiskCheckResult {
  return {
    blockingIssues: unique(
      unmaskedIdentifierRules
        .filter((rule) => {
          rule.pattern.lastIndex = 0;
          return rule.pattern.test(text);
        })
        .map((rule) => rule.message)
    ),
    warnings: []
  };
}

export function checkSummaryOutputRisk(sourceText: string, summary: string): RiskCheckResult {
  const warnings = [
    ...keywordRules
      .filter((rule) => {
        rule.source.lastIndex = 0;
        rule.summary.lastIndex = 0;
        return rule.source.test(sourceText) && !rule.summary.test(summary);
      })
      .map((rule) => rule.message),
    ...medicalAdviceToneRules
      .filter((pattern) => {
        pattern.lastIndex = 0;
        return pattern.test(summary);
      })
      .map(() => "摘要可能出現過度醫療建議語氣")
  ];

  const outputPrivacyIssues = checkDeidentifiedTextRisk(summary).blockingIssues.map(
    (issue) => `摘要結果${issue.replace("疑似", "疑似含")}`
  );

  return {
    blockingIssues: [],
    warnings: unique([...warnings, ...outputPrivacyIssues])
  };
}
