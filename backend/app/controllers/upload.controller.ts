// backend/app/controllers/upload.controller.ts

import { Request, Response, NextFunction } from "express";
import { parseUploadedFile } from "../services/upload.service";

export async function handleUpload(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;

    if (!file) {
      return res
        .status(400)
        .json({ message: "No file uploaded. Please use field name 'file'." });
    }

    const { rows, columns } = await parseUploadedFile(file);

    return res.json({
      columns,
      rows,
      meta: {
        rowCount: rows.length,
        fileName: file.originalname,
      },
    });
  } catch (err) {
    next(err);
  }
}