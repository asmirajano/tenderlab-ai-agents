import { createWorker, PSM, type Worker } from "tesseract.js";

export type OcrProgress = {
  status: string;
  progress?: number;
};

export type OcrResult = {
  text: string;
  rawText: string;
  confidence: number;
};

export type OcrLayoutMode = "sparse" | "auto";

export type OcrWord = {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  confidence: number;
  blockNumber?: number;
  paragraphNumber?: number;
  lineNumber?: number;
};

type SpatialRow = {
  words: OcrWord[];
  center: number;
  meanHeight: number;
};

const browserProgressListeners = new Set<(progress: OcrProgress) => void>();
let browserWorkerPromise: Promise<Worker> | undefined;

function broadcastBrowserProgress(progress: OcrProgress) {
  for (const listener of browserProgressListeners) listener(progress);
}

async function configuredWorker(onProgress?: (progress: OcrProgress) => void) {
  const options = {
    cacheMethod: typeof window === "undefined" ? "none" : "write",
    logger(message: { status: string; progress: number }) {
      onProgress?.({ status: message.status, progress: message.progress });
    },
  };
  const worker = await createWorker("eng", 1, options);
  await worker.setParameters({
    preserve_interword_spaces: "1",
    tessedit_pageseg_mode: PSM.SPARSE_TEXT,
  });
  return worker;
}

async function acquireWorker(onProgress?: (progress: OcrProgress) => void) {
  if (typeof window === "undefined") {
    return { worker: await configuredWorker(onProgress), terminateAfterUse: true };
  }
  if (onProgress) browserProgressListeners.add(onProgress);
  if (!browserWorkerPromise) {
    browserWorkerPromise = configuredWorker(broadcastBrowserProgress).catch((error) => {
      browserWorkerPromise = undefined;
      throw error;
    });
  }
  return { worker: await browserWorkerPromise, terminateAfterUse: false };
}

function parseTsv(tsv: string | null) {
  const words: OcrWord[] = [];
  let pageWidth = 0;
  for (const sourceLine of (tsv ?? "").split(/\r?\n/)) {
    const columns = sourceLine.split("\t");
    if (columns.length < 12) continue;
    const level = Number(columns[0]);
    const left = Number(columns[6]);
    const top = Number(columns[7]);
    const width = Number(columns[8]);
    const height = Number(columns[9]);
    if (level === 1) pageWidth = width;
    if (level !== 5) continue;
    const text = columns.slice(11).join("\t").trim();
    if (!text) continue;
    words.push({
      text,
      left,
      top,
      width,
      height,
      confidence: Number(columns[10]),
      blockNumber: Number(columns[2]),
      paragraphNumber: Number(columns[3]),
      lineNumber: Number(columns[4]),
    });
  }
  return { words, pageWidth };
}

function estimateHorizontalTextSlope(words: OcrWord[], pageWidth: number) {
  // Statutory statement tables normally print their numbered columns (1..6)
  // in one header row. That row is the most reliable page-wide baseline when
  // a landscape scan is slightly skewed: prose lines may be short, wrapped or
  // independently segmented by Tesseract. Fit candidate baselines through the
  // header digits first and retain only ordered, unique, multi-column inliers.
  const pageHeight = Math.max(0, ...words.map((word) => word.top + word.height));
  const headerDigits = words.filter((word) => /^[1-9]$/.test(word.text)
    && word.top + word.height / 2 <= pageHeight * 0.45);
  let bestHeader: { words: OcrWord[]; score: number } | undefined;
  for (let leftIndex = 0; leftIndex < headerDigits.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < headerDigits.length; rightIndex += 1) {
      const left = headerDigits[leftIndex];
      const right = headerDigits[rightIndex];
      const deltaX = right.left - left.left;
      if (Math.abs(deltaX) < pageWidth * 0.2 || left.text === right.text) continue;
      const leftCenter = left.top + left.height / 2;
      const rightCenter = right.top + right.height / 2;
      const slope = (rightCenter - leftCenter) / deltaX;
      if (Math.abs(slope) > 0.04) continue;
      const intercept = leftCenter - slope * left.left;
      const inliers = headerDigits.filter((word) => Math.abs(
        word.top + word.height / 2 - (slope * word.left + intercept),
      ) <= 7);
      const unique = [...inliers.reduce((map, word) => {
        const residual = Math.abs(word.top + word.height / 2 - (slope * word.left + intercept));
        const existing = map.get(word.text);
        if (!existing || residual < existing.residual) map.set(word.text, { word, residual });
        return map;
      }, new Map<string, { word: OcrWord; residual: number }>()).values()]
        .map((candidate) => candidate.word)
        .sort((a, b) => a.left - b.left);
      if (unique.length < 3) continue;
      if (!unique.every((word, index) => index === 0 || Number(word.text) > Number(unique[index - 1].text))) continue;
      const span = unique.at(-1)!.left - unique[0].left;
      const averageY = unique.reduce((sum, word) => sum + word.top + word.height / 2, 0) / unique.length;
      const score = unique.length * 100 + span / pageWidth * 10 - averageY / Math.max(pageHeight, 1);
      if (!bestHeader || score > bestHeader.score) bestHeader = { words: unique, score };
    }
  }
  if (bestHeader) {
    const meanX = bestHeader.words.reduce((sum, word) => sum + word.left, 0) / bestHeader.words.length;
    const meanY = bestHeader.words.reduce((sum, word) => sum + word.top + word.height / 2, 0) / bestHeader.words.length;
    const denominator = bestHeader.words.reduce((sum, word) => sum + ((word.left - meanX) ** 2), 0);
    const slope = denominator
      ? bestHeader.words.reduce((sum, word) => sum + ((word.left - meanX) * (word.top + word.height / 2 - meanY)), 0) / denominator
      : 0;
    if (Math.abs(slope) <= 0.04) return Math.abs(slope) < 0.001 ? 0 : slope;
  }

  const groups = new Map<string, OcrWord[]>();
  for (const word of words) {
    if (word.confidence < 30 || word.blockNumber === undefined || word.paragraphNumber === undefined || word.lineNumber === undefined) continue;
    const key = `${word.blockNumber}:${word.paragraphNumber}:${word.lineNumber}`;
    const group = groups.get(key) ?? [];
    group.push(word);
    groups.set(key, group);
  }

  const candidates: Array<{ slope: number; weight: number }> = [];
  for (const group of groups.values()) {
    if (group.length < 3) continue;
    const points = group.map((word) => ({ x: word.left + word.width / 2, y: word.top + word.height / 2 }));
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const span = maxX - minX;
    if (span < Math.max(120, pageWidth * 0.05)) continue;
    const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    const denominator = points.reduce((sum, point) => sum + ((point.x - meanX) ** 2), 0);
    if (!denominator) continue;
    const slope = points.reduce((sum, point) => sum + ((point.x - meanX) * (point.y - meanY)), 0) / denominator;
    if (Math.abs(slope) <= 0.04) candidates.push({ slope, weight: span * Math.min(group.length, 12) });
  }
  if (!candidates.length) return 0;
  candidates.sort((left, right) => left.slope - right.slope);
  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  let cumulative = 0;
  for (const candidate of candidates) {
    cumulative += candidate.weight;
    if (cumulative >= totalWeight / 2) return Math.abs(candidate.slope) < 0.001 ? 0 : candidate.slope;
  }
  return 0;
}

export function clusterOcrRows(words: OcrWord[], pageWidth: number) {
  const rows: SpatialRow[] = [];
  const slope = estimateHorizontalTextSlope(words, pageWidth);
  const normalizedCenter = (word: OcrWord) => word.top + word.height / 2 - slope * (word.left + word.width / 2);
  for (const word of [...words].sort((left, right) => normalizedCenter(left) - normalizedCenter(right) || left.left - right.left)) {
    const center = normalizedCenter(word);
    let closest: SpatialRow | undefined;
    let closestDistance = Number.POSITIVE_INFINITY;
    for (const row of rows) {
      const distance = Math.abs(row.center - center);
      const tolerance = Math.max(8, Math.min(row.meanHeight, word.height) * 0.7);
      if (distance <= tolerance && distance < closestDistance) {
        closest = row;
        closestDistance = distance;
      }
    }
    if (!closest) {
      rows.push({ words: [word], center, meanHeight: word.height });
      continue;
    }
    closest.words.push(word);
    closest.center = closest.words.reduce((sum, item) => sum + normalizedCenter(item), 0) / closest.words.length;
    closest.meanHeight = closest.words.reduce((sum, item) => sum + item.height, 0) / closest.words.length;
  }
  return rows
    .map((row) => ({ ...row, words: [...row.words].sort((left, right) => left.left - right.left) }))
    .sort((left, right) => left.center - right.center);
}

function rowText(row: SpatialRow, pageWidth: number) {
  const words = [...row.words].sort((left, right) => left.left - right.left);
  const largeGap = Math.max(36, pageWidth * 0.045);
  let text = words[0]?.text ?? "";
  for (let index = 1; index < words.length; index += 1) {
    const previous = words[index - 1];
    const current = words[index];
    const gap = current.left - (previous.left + previous.width);
    text += `${gap >= largeGap ? "\t" : " "}${current.text}`;
  }
  return text.trim();
}

export function mergeWrappedOcrRows(lines: string[]) {
  const merged: string[] = [];
  const statutoryTotalRowCodes = new Set(["130", "390", "400", "480", "490", "600", "770", "780"]);
  for (const line of lines) {
    const previous = merged.at(-1);
    const previousIsWrappedTotal = Boolean(previous && !previous.includes("\t") && /^total\b/i.test(previous));
    const currentCompletesTotal = line.includes("\t") && (/^(?:assets|liabilities|equity)\b/i.test(line) || /^[($€£₾\d−-]/.test(line));
    const currentIsTotal = /^total\b/i.test(line);
    const previousRowCodes = previous?.match(/(?:^|\t)\d{3}(?=\t|$)/g) ?? [];
    const lastRowCode = previous ? Array.from(previous.matchAll(/(?:^|\t)(\d{3})\t/g)).at(-1) : undefined;
    const previousLabel = previous?.split("\t")[0]?.trim() ?? "";
    const lastCodeIsDisplacedTotal = Boolean(lastRowCode
      && statutoryTotalRowCodes.has(lastRowCode[1])
      && !/^total\b/i.test(previousLabel));
    const misplacedCells = currentIsTotal && previous && lastRowCode && (previousRowCodes.length >= 2 || /^\d{3}\t/.test(previous) || lastCodeIsDisplacedTotal)
      ? {
          index: (lastRowCode.index ?? 0) + (lastRowCode[0].startsWith("\t") ? 1 : 0),
          rowCode: lastRowCode[1],
          values: previous.slice((lastRowCode.index ?? 0) + lastRowCode[0].length),
        }
      : null;
    if (misplacedCells && previous) {
      const prefix = previous.slice(0, misplacedCells.index).trim();
      if (prefix) merged[merged.length - 1] = prefix;
      else merged.pop();
      const [currentLabel, ...currentCells] = line.split("\t");
      merged.push([currentLabel, misplacedCells.rowCode, misplacedCells.values, ...currentCells].filter(Boolean).join("\t"));
    } else if (previousIsWrappedTotal && currentCompletesTotal) {
      merged[merged.length - 1] = `${previous}${/^[($€£₾\d−-]/.test(line) ? "\t" : " "}${line}`;
    } else if (previous && /^total\b/i.test(previous) && /(?:&|and).*shareholder/i.test(previous.split("\t")[0]) && previous.includes("\t") && /^equity$/i.test(line)) {
      merged[merged.length - 1] = previous.replace("\t", ` ${line}\t`);
    } else {
      merged.push(line);
    }
  }
  return merged;
}

export function structureOcrTsv(tsv: string | null, fallbackText = "") {
  const { words, pageWidth } = parseTsv(tsv);
  if (!words.length || !pageWidth) return fallbackText.trim();
  const lines = clusterOcrRows(words, pageWidth).map((row) => rowText(row, pageWidth)).filter(Boolean);
  const structured = mergeWrappedOcrRows(lines).join("\n").trim();
  return structured.length >= 24 ? structured : fallbackText.trim();
}

export async function recognizeBalanceSheetImage(
  image: File | Blob | string | ArrayBuffer | Uint8Array,
  onProgress?: (progress: OcrProgress) => void,
  layoutMode: OcrLayoutMode = "sparse",
): Promise<OcrResult> {
  const { worker, terminateAfterUse } = await acquireWorker(onProgress);
  try {
    // Sparse discovery is resilient to covers and mixed layouts. Once a page is
    // known to contain a dense statutory table, AUTO preserves row-code/value
    // geometry far more reliably than SPARSE_TEXT (which may detach cells from
    // their labels even when every glyph is visually clear).
    await worker.setParameters({
      preserve_interword_spaces: "1",
      tessedit_pageseg_mode: layoutMode === "auto" ? PSM.AUTO : PSM.SPARSE_TEXT,
    });
    const result = await worker.recognize(image as Parameters<Worker["recognize"]>[0], {}, { text: true, tsv: true, blocks: true });
    return {
      text: structureOcrTsv(result.data.tsv, result.data.text),
      rawText: result.data.text.trim(),
      confidence: Math.max(0, Math.min(1, result.data.confidence / 100)),
    };
  } finally {
    if (typeof window !== "undefined" && onProgress) browserProgressListeners.delete(onProgress);
    if (terminateAfterUse) await worker.terminate();
  }
}
