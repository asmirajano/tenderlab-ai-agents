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

type OcrWord = {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  confidence: number;
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
  if (!browserWorkerPromise) browserWorkerPromise = configuredWorker(broadcastBrowserProgress);
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
    words.push({ text, left, top, width, height, confidence: Number(columns[10]) });
  }
  return { words, pageWidth };
}

function clusterRows(words: OcrWord[]) {
  const rows: SpatialRow[] = [];
  for (const word of [...words].sort((left, right) => (left.top + left.height / 2) - (right.top + right.height / 2) || left.left - right.left)) {
    const center = word.top + word.height / 2;
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
    closest.center = closest.words.reduce((sum, item) => sum + item.top + item.height / 2, 0) / closest.words.length;
    closest.meanHeight = closest.words.reduce((sum, item) => sum + item.height, 0) / closest.words.length;
  }
  return rows.sort((left, right) => left.center - right.center);
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

function mergeWrappedTotals(lines: string[]) {
  const merged: string[] = [];
  for (const line of lines) {
    const previous = merged.at(-1);
    const previousIsWrappedTotal = Boolean(previous && !previous.includes("\t") && /^total\b/i.test(previous));
    const currentCompletesTotal = line.includes("\t") && (/^(?:assets|liabilities|equity)\b/i.test(line) || /^[($€£₾\d−-]/.test(line));
    if (previousIsWrappedTotal && currentCompletesTotal) {
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
  const lines = clusterRows(words).map((row) => rowText(row, pageWidth)).filter(Boolean);
  const structured = mergeWrappedTotals(lines).join("\n").trim();
  return structured.length >= 24 ? structured : fallbackText.trim();
}

export async function recognizeBalanceSheetImage(image: File | Blob | string | ArrayBuffer | Uint8Array, onProgress?: (progress: OcrProgress) => void): Promise<OcrResult> {
  const { worker, terminateAfterUse } = await acquireWorker(onProgress);
  try {
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
