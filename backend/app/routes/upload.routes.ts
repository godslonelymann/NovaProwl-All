// src/routes/upload.ts

import { Router, Request, Response } from "express";
import multer from "multer";
import { parseTabularFile } from "../utils/parseTabularFile";

const router = Router();

// In-memory storage; nothing is written to disk
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/upload
 * field name: "file"
 */
router.post(
  "/upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ error: "No file uploaded. Use field name 'file'." });
      }

      const buffer = req.file.buffer;
      const originalName = req.file.originalname || "uploaded";

      const dataset = await parseTabularFile(buffer, originalName);

      return res.json({
        columns: dataset.columns,
        rows: dataset.rows,
      });
    } catch (err) {
      console.error("Error parsing uploaded file:", err);
      return res
        .status(500)
        .json({ error: "Failed to parse uploaded file." });
    }
  }
);

export default router;