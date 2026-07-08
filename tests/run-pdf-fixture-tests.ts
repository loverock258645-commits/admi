import { deIdentifyMedicalText } from "../server/deidentify.js";
import { extractTextFromPdfBuffer } from "../server/pdfText.js";
import { fakeMedicalRecordFixtures } from "./fixtures/fakeMedicalRecords.js";

type TestResult = {
  name: string;
  passed: boolean;
  detail: string;
};

const results: TestResult[] = [];

function addResult(name: string, passed: boolean, detail: string) {
  results.push({ name, passed, detail });
}

function escapePdfString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildTextPdf(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const contentLines = [
    "BT",
    "/F1 10 Tf",
    "72 760 Td",
    ...lines.map((line, index) => {
      const prefix = index === 0 ? "" : "0 -14 Td ";
      return `${prefix}(${escapePdfString(line)}) Tj`;
    }),
    "ET"
  ];
  const stream = contentLines.join("\n");
  const pdf = `%PDF-1.4
1 0 obj
<< /Length ${Buffer.byteLength(stream, "latin1")} >>
stream
${stream}
endstream
endobj
%%EOF`;
  return Buffer.from(pdf, "latin1");
}

function buildImageOnlyPdf() {
  const stream = "q\n10 0 0 10 72 720 cm\n/Im1 Do\nQ";
  const pdf = `%PDF-1.4
1 0 obj
<< /Length ${Buffer.byteLength(stream, "latin1")} >>
stream
${stream}
endstream
endobj
%%EOF`;
  return Buffer.from(pdf, "latin1");
}

for (const fixture of fakeMedicalRecordFixtures) {
  const pdfBuffer = buildTextPdf(fixture.englishOriginal);
  const extractedText = extractTextFromPdfBuffer(pdfBuffer);
  const deidentifiedText = deIdentifyMedicalText(extractedText);

  addResult(
    `${fixture.title}：文字型 PDF 可抽取內容`,
    extractedText.length > 300,
    `${fixture.id}，抽取字數 ${extractedText.length}`
  );

  const leakedPrivacy = fixture.privacyForbiddenContent.filter((item) =>
    deidentifiedText.includes(item)
  );
  addResult(
    `${fixture.title}：PDF 抽取後可遮蔽個資`,
    leakedPrivacy.length === 0,
    leakedPrivacy.length ? leakedPrivacy.join(", ") : "未發現個資外洩"
  );

  const missingDates = fixture.clinicalDatesToPreserve.filter(
    (date) => !deidentifiedText.includes(date)
  );
  addResult(
    `${fixture.title}：PDF 抽取後保留臨床日期`,
    missingDates.length === 0,
    missingDates.length ? missingDates.join(", ") : "皆保留"
  );
}

const imageOnlyText = extractTextFromPdfBuffer(buildImageOnlyPdf());
addResult(
  "掃描型或影像型 PDF 會被視為未抽取到文字",
  imageOnlyText.trim().length === 0,
  imageOnlyText.trim().length === 0 ? "未抽取到文字" : imageOnlyText.slice(0, 80)
);

const contactFixture = `Patient Name: Test Patient
Family Contact: Family Member One
Emergency Contact: Family Member Two
Bed No: 10C-21
Admission Date: 2026-07-08
`;
const contactMasked = deIdentifyMedicalText(contactFixture);
addResult(
  "聯絡人姓名與床號欄位會遮蔽",
  contactMasked.includes("[聯絡人姓名已遮蔽]") &&
    contactMasked.includes("[床號已遮蔽]") &&
    contactMasked.includes("Admission Date: 2026-07-08"),
  contactMasked
);

const passed = results.filter((result) => result.passed).length;
const failed = results.length - passed;

console.log("假 PDF 測試結果");
console.log("================");
console.log(`假病歷 PDF 數量：${fakeMedicalRecordFixtures.length}`);
console.log(`通過：${passed}`);
console.log(`失敗：${failed}`);
console.log("");

for (const result of results) {
  console.log(`${result.passed ? "PASS" : "FAIL"} ${result.name} - ${result.detail}`);
}

if (failed > 0) {
  process.exit(1);
}
