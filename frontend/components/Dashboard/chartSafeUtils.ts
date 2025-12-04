// ----------------------------------------------------
// Universal safe aggregation helpers for all charts
// Handles ANY dataset shape safely
// ----------------------------------------------------

import { Row } from "./chartTypes";

/**
 * Safe detection of numeric column
 */
export function isNumericColumn(data: Row[], field?: string): boolean {
  if (!field) return false;
  return data.some(
    (row) =>
      typeof row[field] === "number" &&
      !Number.isNaN(row[field])
  );
}

/**
 * Universal category aggregation:
 *
 * If numeric yField exists → sum it
 * If no numeric yField → count rows grouped by xField
 */
export function safeAggregate(
  data: Row[],
  xField: string,
  yField?: string,
  agg: "sum" | "avg" | "count" | "min" | "max" = "sum"
) {
  if (!data || !data.length) return { labels: [], values: [] };

  const map = new Map<string, number>();

  const numeric = isNumericColumn(data, yField);

  for (const row of data) {
    const keyRaw = row[xField];
    if (keyRaw === null || keyRaw === undefined || keyRaw === "") continue;

    const key = String(keyRaw);

    let value = 1; // default = count

    if (numeric && yField) {
      const v = row[yField];
      value =
        typeof v === "number" && !Number.isNaN(v) ? v : 0;
    }

    map.set(key, (map.get(key) ?? 0) + value);
  }

  let labels = Array.from(map.keys());
  let values = Array.from(map.values());

  // Apply aggregation if numeric field exists
  if (numeric && yField) {
    switch (agg) {
      case "avg":
        // For avg we need count per group — compute separately
        const countMap = new Map<string, number>();
        for (const row of data) {
          const keyRaw = row[xField];
          if (keyRaw === null || keyRaw === undefined || keyRaw === "") continue;

          const key = String(keyRaw);
          countMap.set(key, (countMap.get(key) ?? 0) + 1);
        }
        values = labels.map(
          (l) => (map.get(l) ?? 0) / (countMap.get(l) ?? 1)
        );
        break;
      case "min":
        // Recompute using min logic
        const minMap = new Map<string, number>();
        for (const row of data) {
          const keyRaw = row[xField];
          if (keyRaw === null || keyRaw === undefined || keyRaw === "") continue;
          const v = row[yField];
          if (typeof v !== "number") continue;

          const key = String(keyRaw);
          if (!minMap.has(key)) minMap.set(key, v);
          else minMap.set(key, Math.min(minMap.get(key)!, v));
        }
        values = labels.map((k) => minMap.get(k) ?? 0);
        break;

      case "max":
        const maxMap = new Map<string, number>();
        for (const row of data) {
          const keyRaw = row[xField];
          if (keyRaw === null || keyRaw === undefined || keyRaw === "") continue;
          const v = row[yField];
          if (typeof v !== "number") continue;

          const key = String(keyRaw);
          if (!maxMap.has(key)) maxMap.set(key, v);
          else maxMap.set(key, Math.max(maxMap.get(key)!, v));
        }
        values = labels.map((k) => maxMap.get(k) ?? 0);
        break;

      case "count":
        values = labels.map((l) =>
          data.filter((r) => String(r[xField]) === l).length
        );
        break;

      default:
        break; // sum already default
    }
  }

  return { labels, values };
}

/**
 * Hierarchical aggregator for Sunburst / Treemap
 * Works with ANY dataset – auto-detects parent→child relationships.
 */
export function safeHierarchy(
  data: Row[],
  fields: string[]
) {
  const cleanFields = fields.filter(
    (f) => f && typeof f === "string"
  );

  if (!cleanFields.length || !data.length)
    return { labels: [], parents: [], values: [] };

  const labels: string[] = [];
  const parents: string[] = [];
  const values: number[] = [];

  const seen = new Set<string>();

  data.forEach((row) => {
    let parent = "";
    cleanFields.forEach((f, i) => {
      const value = row[f];
      if (!value) return;

      const label = String(value);
      const key = parent + ">" + label;

      if (!seen.has(key)) {
        labels.push(label);
        parents.push(parent || "");
        values.push(1);
        seen.add(key);
      }

      parent = label;
    });
  });

  return { labels, parents, values };
}