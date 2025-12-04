// src/utils/parseTabularFile.ts

import ExcelJS from "exceljs";
import path from "path";

export type Row = Record<string, any>;

export interface ParsedDataset {
  columns: string[];
  rows: Row[];
}

/**
 * Top-level: auto-detect CSV vs Excel by extension.
 */
export async function parseTabularFile(
  fileBuffer: Buffer,
  originalName: string
): Promise<ParsedDataset> {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === ".csv") {
    return parseCsv(fileBuffer.toString("utf8"));
  }

  // Default to Excel
  return parseExcel(fileBuffer);
}

/**
 * Very simple CSV parser.
 * First row = header, comma-delimited.
 */
function parseCsv(text: string): ParsedDataset {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (!lines.length) return { columns: [], rows: [] };

  const headerLine = lines[0];
  const columns = headerLine.split(",").map((h) => h.trim());

  const rows: Row[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    const row: Row = {};
    columns.forEach((col, idx) => {
      const raw = (parts[idx] ?? "").trim();
      const maybeNumber = Number(raw);
      row[col] =
        raw === "" || Number.isNaN(maybeNumber) ? raw : maybeNumber;
    });
    rows.push(row);
  }

  return { columns, rows };
}

/**
 * Excel parser using exceljs.
 * Uses the first worksheet, assumes first row is header.
 */
async function parseExcel(buffer: Buffer): Promise<ParsedDataset> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const ws = workbook.worksheets[0];
  if (!ws) return { columns: [], rows: [] };

  let columns: string[] = [];
  const rows: Row[] = [];

  ws.eachRow((row, rowNumber) => {
    const cells = row.values as any[];

    // Row values are 1-indexed: cells[0] is undefined
    if (rowNumber === 1) {
      columns = cells
        .slice(1)
        .map((v: any) => String(v ?? "").trim())
        .filter((v: string) => v.length > 0);
    } else {
      if (!columns.length) return;
      const obj: Row = {};
      columns.forEach((col, idx) => {
        const cellValue = cells[idx + 1];
        obj[col] = normalizeCellValue(cellValue);
      });
      rows.push(obj);
    }
  });

  return { columns, rows };
}

function normalizeCellValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    const maybeNumber = Number(trimmed);
    if (!Number.isNaN(maybeNumber) && trimmed !== "") {
      return maybeNumber;
    }
    return trimmed;
  }

  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value;

  return String(value);
}