// backend/app/services/upload.service.ts

import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";
import { NormalizedDataset, DatasetRow, DatasetKind } from "../types/query";

type ParsedDataset = {
  rows: DatasetRow[];
  columns: string[];
  textContent?: string;
  kind: DatasetKind;
  extension: string;
};

const codeExtensions = new Set([
  "js",
  "ts",
  "jsx",
  "tsx",
  "py",
  "java",
  "rb",
  "go",
  "rs",
  "cs",
  "php",
  "c",
  "cpp",
  "m",
  "swift",
  "kt",
  "kts",
  "scala",
  "sh",
  "bash",
  "ps1",
]);

const textExtensions = new Set(["txt", "md", "markdown", "mdx", "rtf"]);

const collectColumns = (rows: DatasetRow[]): string[] => {
  if (!rows.length) return [];
  const allKeys = new Set<string>();
  rows.forEach((row) => Object.keys(row || {}).forEach((k) => allKeys.add(k)));
  return Array.from(allKeys);
};

const inferKind = (
  extension: string,
  rows: DatasetRow[],
  textContent?: string
): DatasetKind => {
  const ext = extension.toLowerCase();
  if (rows.length) return "table";
  if (codeExtensions.has(ext)) return "code";
  if (textExtensions.has(ext) || textContent) return "text";
  return "other";
};

export async function parseUploadedFile(
  file: Express.Multer.File
): Promise<NormalizedDataset> {
  const buffer = file.buffer;
  const originalName = file.originalname;
  const extension = (originalName.split(".").pop() || "").toLowerCase();

  const parsed = await parseByExtension(buffer, extension);
  const columns = collectColumns(parsed.rows);
  const kind = inferKind(extension, parsed.rows, parsed.textContent);

  const normalized: NormalizedDataset = {
    id: `${originalName}-${Date.now()}`,
    fileName: originalName,
    extension,
    kind,
    columns: parsed.columns.length ? parsed.columns : columns,
    rows: parsed.rows,
    textContent: parsed.textContent,
  };

  return normalized;
}

async function parseByExtension(
  buffer: Buffer,
  extension: string
): Promise<ParsedDataset> {
  if (extension === "csv") {
    return parseCsv(buffer);
  }

  if (extension === "xlsx" || extension === "xls") {
    return parseExcel(buffer);
  }

  if (extension === "json") {
    return parseJson(buffer);
  }

  return parseText(buffer, extension);
}

function parseCsv(buffer: Buffer): ParsedDataset {
  const text = buffer.toString("utf8");

  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as DatasetRow[];

  const columns = collectColumns(records);

  return { rows: records, columns, kind: "table", extension: "csv" };
}

async function parseExcel(buffer: Buffer): Promise<ParsedDataset> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { rows: [], columns: [], kind: "table", extension: "xlsx" };
  }

  const headerRow = worksheet.getRow(1);
  const headerValues = (headerRow.values || []) as Array<string | number | null | undefined>;
  const headers = headerValues
    .slice(1)
    .map((v, idx) => (v !== null && v !== undefined ? String(v) : `Column ${idx + 1}`));

  const rows: DatasetRow[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = (row.values || []) as Array<unknown>;
    const record: DatasetRow = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx + 1] ?? null;
    });
    rows.push(record);
  });

  return { rows, columns: headers, kind: "table", extension: "xlsx" };
}

function parseJson(buffer: Buffer): ParsedDataset {
  const text = buffer.toString("utf8");
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "object" && item !== null)) {
      const rows = parsed as DatasetRow[];
      return {
        rows,
        columns: collectColumns(rows),
        kind: "table",
        extension: "json",
      };
    }
    return {
      rows: [],
      columns: [],
      textContent: text,
      kind: "text",
      extension: "json",
    };
  } catch {
    return {
      rows: [],
      columns: [],
      textContent: text,
      kind: "text",
      extension: "json",
    };
  }
}

function parseText(buffer: Buffer, extension: string): ParsedDataset {
  const text = buffer.toString("utf8");
  return {
    rows: [],
    columns: [],
    textContent: text,
    kind: inferKind(extension, [], text),
    extension,
  };
}
