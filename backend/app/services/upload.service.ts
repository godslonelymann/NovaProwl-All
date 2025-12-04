// backend/app/services/upload.service.ts

import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";

export type ParsedDataset = {
  rows: Record<string, any>[];
  columns: string[];
};

export async function parseUploadedFile(
  file: Express.Multer.File
): Promise<ParsedDataset> {
  const buffer = file.buffer;
  const originalName = file.originalname.toLowerCase();

  if (originalName.endsWith(".csv")) {
    return parseCsv(buffer);
  }

  if (originalName.endsWith(".xlsx") || originalName.endsWith(".xls")) {
    return parseExcel(buffer);
  }

  throw new Error(
    "Unsupported file type. Please upload a CSV or Excel (.xls/.xlsx) file."
  );
}

function parseCsv(buffer: Buffer): ParsedDataset {
  const text = buffer.toString("utf8");

  const records = parse(text, {
    columns: true, // use first row as header
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, any>[];

  const columns = records.length ? Object.keys(records[0]) : [];

  return { rows: records, columns };
}

function parseExcel(buffer: Buffer): ParsedDataset {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return { rows: [], columns: [] };
  }

  const sheet = workbook.Sheets[sheetName];

  const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
    defval: null, // keep empty cells as null
  });

  const columns = json.length ? Object.keys(json[0]) : [];

  return { rows: json, columns };
}