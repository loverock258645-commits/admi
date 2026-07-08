import { inflateSync } from "node:zlib";

function decodePdfLiteralString(value: string) {
  let output = "";
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char !== "\\") {
      output += char;
      continue;
    }

    const next = value[index + 1];
    if (!next) continue;
    index += 1;

    if (next === "n") output += "\n";
    else if (next === "r") output += "\r";
    else if (next === "t") output += "\t";
    else if (next === "b") output += "\b";
    else if (next === "f") output += "\f";
    else if (next === "\\" || next === "(" || next === ")") output += next;
    else if (/[0-7]/.test(next)) {
      const octal = [next, value[index + 1], value[index + 2]]
        .filter((digit) => digit && /[0-7]/.test(digit))
        .join("");
      index += octal.length - 1;
      output += String.fromCharCode(Number.parseInt(octal, 8));
    } else {
      output += next;
    }
  }
  return output;
}

function decodePdfHexString(value: string) {
  const normalized = value.replace(/\s+/g, "");
  const bytes: number[] = [];
  for (let index = 0; index < normalized.length; index += 2) {
    const hex = normalized.slice(index, index + 2).padEnd(2, "0");
    const byte = Number.parseInt(hex, 16);
    if (!Number.isNaN(byte)) bytes.push(byte);
  }

  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    let output = "";
    for (let index = 2; index < bytes.length; index += 2) {
      output += String.fromCharCode((bytes[index] << 8) | (bytes[index + 1] ?? 0));
    }
    return output;
  }

  if (bytes.every((byte, index) => index % 2 === 0 || byte < 128)) {
    const withoutNulls = bytes.filter((byte) => byte !== 0);
    return Buffer.from(withoutNulls).toString("utf8");
  }

  return Buffer.from(bytes).toString("latin1");
}

function extractStringsFromContent(content: string) {
  const textChunks: string[] = [];
  const textBlocks = content.match(/BT[\s\S]*?ET/g) ?? [];

  for (const block of textBlocks) {
    const literals = block.matchAll(/\((?:\\.|[^\\)])*\)\s*(?:Tj|'|")/g);
    for (const match of literals) {
      const raw = match[0].replace(/\s*(?:Tj|'|")\s*$/, "");
      textChunks.push(decodePdfLiteralString(raw.slice(1, -1)));
    }

    const arrays = block.matchAll(/\[(.*?)\]\s*TJ/gs);
    for (const match of arrays) {
      const arrayText = match[1];
      const literalParts = [...arrayText.matchAll(/\((?:\\.|[^\\)])*\)/g)].map((item) =>
        decodePdfLiteralString(item[0].slice(1, -1))
      );
      const hexParts = [...arrayText.matchAll(/<([0-9a-fA-F\s]+)>/g)].map((item) =>
        decodePdfHexString(item[1])
      );
      textChunks.push([...literalParts, ...hexParts].join(""));
    }

    const hexStrings = block.matchAll(/<([0-9a-fA-F\s]+)>\s*Tj/g);
    for (const match of hexStrings) {
      textChunks.push(decodePdfHexString(match[1]));
    }
  }

  return textChunks
    .map((chunk) => chunk.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function decodeStream(stream: Buffer, dictionary: string) {
  if (/\/FlateDecode\b/.test(dictionary)) {
    return inflateSync(stream).toString("latin1");
  }
  return stream.toString("latin1");
}

export function extractTextFromPdfBuffer(pdfBuffer: Buffer) {
  const binary = pdfBuffer.toString("latin1");
  if (!binary.startsWith("%PDF-")) {
    throw new Error("not_pdf");
  }

  const extracted: string[] = [];
  const streamPattern = /stream\r?\n/g;
  let match: RegExpExecArray | null;

  while ((match = streamPattern.exec(binary))) {
    const streamStart = streamPattern.lastIndex;
    const endIndex = binary.indexOf("endstream", streamStart);
    if (endIndex === -1) break;

    const dictionaryStart = Math.max(0, match.index - 1000);
    const dictionary = binary.slice(dictionaryStart, match.index);
    const rawStream = Buffer.from(binary.slice(streamStart, endIndex).replace(/\r?\n$/, ""), "latin1");

    try {
      const decoded = decodeStream(rawStream, dictionary);
      const text = extractStringsFromContent(decoded);
      if (text) extracted.push(text);
    } catch {
      // Some PDF streams are images, fonts, or unsupported encodings. Ignore them.
    }

    streamPattern.lastIndex = endIndex + "endstream".length;
  }

  return extracted
    .join("\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
