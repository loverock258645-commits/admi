const MASKS = {
  name: "[病人姓名已遮蔽]",
  mrn: "[病歷號已遮蔽]",
  id: "[身分證字號已遮蔽]",
  phone: "[電話已遮蔽]",
  address: "[地址已遮蔽]",
  birthDate: "[生日已遮蔽]"
} as const;

function maskField(
  text: string,
  labels: string[],
  replacement: string,
  options: { consumeLine?: boolean } = {}
) {
  const labelPattern = labels
    .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const valuePattern = options.consumeLine ? "[^\\n\\r;|]+" : "[^\\n\\r;|,]{1,80}";
  const pattern = new RegExp(`\\b(${labelPattern})\\s*[:：#-]?\\s*(${valuePattern})`, "gi");
  return text.replace(pattern, (_match, label) => `${label}: ${replacement}`);
}

export function deIdentifyMedicalText(input: string): string {
  let text = input;

  text = maskField(text, ["Patient Name", "Name", "姓名"], MASKS.name);
  text = maskField(text, ["Chart No", "Chart Number", "MRN", "Medical Record No", "病歷號"], MASKS.mrn);
  text = maskField(text, ["ID No", "ID Number", "National ID", "身分證字號"], MASKS.id);
  text = maskField(text, ["Tel", "Telephone", "Phone", "Mobile", "Cell Phone", "手機", "電話"], MASKS.phone);
  text = maskField(text, ["Address", "地址"], MASKS.address, { consumeLine: true });
  text = maskField(text, ["DOB", "Date of Birth", "Birth Date", "Birthday", "出生日期", "生日"], MASKS.birthDate, { consumeLine: true });

  text = text.replace(/\b[A-Z][12]\d{8}\b/g, MASKS.id);
  text = text.replace(/\b(?:MRN|Chart\s*No\.?|Chart\s*Number)\s*[:：#-]?\s*[A-Z0-9-]{4,20}\b/gi, (match) => {
    const label = match.split(/[:：#-]/)[0]?.trim() || "MRN";
    return `${label}: ${MASKS.mrn}`;
  });

  text = text.replace(/\b09\d{2}[-\s]?\d{3}[-\s]?\d{3}\b/g, MASKS.phone);
  text = text.replace(/\b0\d{1,2}[-\s]?\d{6,8}(?:\s*(?:ext|#|分機)\s*\d{1,6})?\b/gi, MASKS.phone);
  text = text.replace(/\b(?:\+?886[-\s]?)?9\d{2}[-\s]?\d{3}[-\s]?\d{3}\b/g, MASKS.phone);

  text = text.replace(
    /\b(?:DOB|Date of Birth|Birth Date|Birthday)\s*[:：-]?\s*(?:\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/gi,
    (match) => `${match.split(/[:：-]/)[0].trim()}: ${MASKS.birthDate}`
  );

  return text;
}
