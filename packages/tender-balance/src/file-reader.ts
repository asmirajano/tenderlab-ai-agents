import { buildBalanceSheetReview, type BalanceSheetInput, type BalanceSheetReview, type SourcePageInput } from "./model.ts";
import { recognizeBalanceSheetImage } from "./ocr.ts";
import type { PDFPageProxy } from "pdfjs-dist/types/src/display/api";

export type FileReadProgress = {
  stage: "reading" | "extracting-text" | "triage" | "ocr" | "structuring";
  label: string;
  progress?: number;
  pageNumber?: number;
};

type ProgressReporter = (progress: FileReadProgress) => void;

type PositionedPdfTextItem = {
  str: string;
  hasEOL?: boolean;
  width?: number;
  transform?: ArrayLike<number>;
};

/**
 * Reconstruct readable rows from PDF.js text items without inserting spaces
 * inside a number whose glyphs were emitted as adjacent fragments. Large
 * horizontal gaps are retained as tabs so downstream table parsing can keep
 * the label and each reported column distinct.
 */
export function reconstructPdfPageText(items: PositionedPdfTextItem[]) {
  let text = "";
  let previousEndX: number | null = null;
  for (const item of items) {
    const value = item.str ?? "";
    const x = Number(item.transform?.[4]);
    const width = Number(item.width ?? 0);
    if (value) {
      if (previousEndX !== null && Number.isFinite(x)) {
        const gap = x - previousEndX;
        if (gap > 24) text += "\t";
        else if (gap > 1.25) text += " ";
      }
      text += value;
      previousEndX = Number.isFinite(x) ? x + width : null;
    }
    if (item.hasEOL) {
      text += "\n";
      previousEndX = null;
    }
  }
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function sha256Hex(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function documentId(hash: string) {
  return `uploaded:${hash.slice(0, 20)}`;
}

function pagesFromText(text: string): SourcePageInput[] {
  return text.split(/\f|\n\s*---\s*PAGE\s+BREAK\s*---\s*\n/i).map((pageText, index) => ({
    pageNumber: index + 1,
    text: pageText.trim(),
    extractionMethod: "digital-text",
    confidence: 0.98,
    imageOnly: pageText.trim().length < 24,
  }));
}

async function renderPdfPageForOcr(page: PDFPageProxy, scale = 2) {
  if (typeof document === "undefined") return undefined;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return undefined;
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  return await new Promise<Blob | undefined>((resolve) => canvas.toBlob((blob) => resolve(blob ?? undefined), "image/png"));
}

const balanceSheetTitlePattern = /\b(?:balance sheets?|statement of financial position|statement of assets and liabilities|бухгалтерский баланс|moliyaviy holat)\b/i;
const statementTotalPatterns = [/\btotal assets\b/i, /\btotal liabilities\b/i, /\b(?:stockholders.?|shareholders.?|owners.?) equity\b/i, /\bnet (?:assets|worth)\b/i];
export const OCR_DISCOVERY_BATCH_SIZE = 12;

export function balanceSheetEvidenceScore(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact) return 0;
  const titleScore = balanceSheetTitlePattern.test(compact) ? 8 : 0;
  const totalScore = statementTotalPatterns.filter((pattern) => pattern.test(compact)).length * 3;
  const tabularRows = text.split(/\r?\n/).filter((line) => (line.match(/\(?[-−]?\d[\d,.'’]*\)?/g)?.length ?? 0) >= 2).length;
  return titleScore + totalScore + Math.min(6, tabularRows);
}

export function chooseOcrCandidatePages(pages: SourcePageInput[], attempted = new Set<number>(), batchSize = OCR_DISCOVERY_BATCH_SIZE) {
  const unread = pages.filter((page) => page.imageOnly && !attempted.has(page.pageNumber));
  const textSignals = pages
    .filter((page) => !page.imageOnly && balanceSheetTitlePattern.test(page.text ?? ""))
    .map((page) => page.pageNumber);
  const adjacent = unread.filter((page) => textSignals.some((signal) => page.pageNumber > signal && page.pageNumber <= signal + 3));
  return (adjacent.length ? adjacent : unread).slice(0, batchSize).map((page) => page.pageNumber);
}

function replacePage(pages: SourcePageInput[], replacement: SourcePageInput) {
  const index = pages.findIndex((page) => page.pageNumber === replacement.pageNumber);
  if (index >= 0) pages[index] = replacement;
}

async function recognizePdfPage(page: PDFPageProxy, pageNumber: number, pageCount: number, scale: number, onProgress?: ProgressReporter) {
  const renderedPage = await renderPdfPageForOcr(page, scale);
  if (!renderedPage) return undefined;
  const recognized = await recognizeBalanceSheetImage(renderedPage, (progress) => onProgress?.({
    stage: "ocr",
    label: progress.status === "recognizing text" ? `Recognizing candidate page ${pageNumber} of ${pageCount}` : `Preparing OCR for candidate page ${pageNumber} of ${pageCount}`,
    progress: progress.progress,
    pageNumber,
  }));
  return {
    pageNumber,
    text: recognized.text,
    extractionMethod: "ocr" as const,
    confidence: recognized.text.length >= 24 ? recognized.confidence : undefined,
    imageOnly: recognized.text.length < 24,
  };
}

export async function readPdfPages(buffer: ArrayBuffer, onProgress?: ProgressReporter): Promise<SourcePageInput[]> {
  const pdfjs = typeof window === "undefined"
    ? await import("pdfjs-dist/legacy/build/pdf.mjs")
    : await import("pdfjs-dist");
  if (typeof window !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  }
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
  const pages: SourcePageInput[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    onProgress?.({ stage: "extracting-text", label: `Reading text on page ${pageNumber} of ${pdf.numPages}`, progress: (pageNumber - 1) / pdf.numPages, pageNumber });
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = reconstructPdfPageText(content.items.filter((item): item is PositionedPdfTextItem => "str" in item));
    pages.push({
      pageNumber,
      text,
      extractionMethod: "digital-text",
      confidence: text.length >= 24 ? 0.98 : undefined,
      imageOnly: text.length < 24,
    });
  }

  if (typeof document !== "undefined" && pages.some((page) => page.imageOnly)) {
    const attempted = new Set<number>();
    let statementFound = pages.some((page) => balanceSheetEvidenceScore(page.text ?? "") >= 11);
    while (!statementFound) {
      const candidates = chooseOcrCandidatePages(pages, attempted);
      if (!candidates.length) break;
      onProgress?.({ stage: "triage", label: `Locating the balance sheet before detailed OCR · ${attempted.size}/${pdf.numPages} pages checked`, progress: attempted.size / pdf.numPages });
      for (const pageNumber of candidates) {
        attempted.add(pageNumber);
        const recognized = await recognizePdfPage(await pdf.getPage(pageNumber), pageNumber, pdf.numPages, 1.25, onProgress);
        if (!recognized) continue;
        replacePage(pages, recognized);
        if (balanceSheetEvidenceScore(recognized.text) >= 11) {
          statementFound = true;
          const detailed = await recognizePdfPage(await pdf.getPage(pageNumber), pageNumber, pdf.numPages, 2, onProgress);
          if (detailed) replacePage(pages, detailed);
          break;
        }
      }
    }
  }
  return pages;
}

function isBalanceSheetInput(value: unknown): value is BalanceSheetInput {
  if (!value || typeof value !== "object") return false;
  const input = value as Partial<BalanceSheetInput>;
  return Boolean(input.source?.documentId && input.source?.fileName && Array.isArray(input.pages));
}

export async function readBalanceSheetFile(file: File, onProgress?: ProgressReporter): Promise<BalanceSheetReview> {
  onProgress?.({ stage: "reading", label: `Reading ${file.name}`, progress: 0 });
  const buffer = await file.arrayBuffer();
  const hash = await sha256Hex(buffer);
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".json") || file.type === "application/json") {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(buffer));
    if (!isBalanceSheetInput(parsed)) throw new Error("JSON must follow the BalanceSheetInput extraction-envelope contract.");
    return buildBalanceSheetReview({
      ...parsed,
      source: {
        ...parsed.source,
        sha256: parsed.source.sha256 || hash,
        synthetic: parsed.source.synthetic === true,
      },
    });
  }

  let pages: SourcePageInput[];
  if (lowerName.endsWith(".pdf") || file.type === "application/pdf") {
    pages = await readPdfPages(buffer, onProgress);
  } else if (file.type.startsWith("image/") || /\.(?:png|jpe?g|tiff?|webp)$/i.test(lowerName)) {
    const recognized = await recognizeBalanceSheetImage(typeof window === "undefined" ? buffer : file, (progress) => onProgress?.({
      stage: "ocr",
      label: progress.status === "recognizing text" ? `Recognizing figures in ${file.name}` : `Preparing local OCR for ${file.name}`,
      progress: progress.progress,
      pageNumber: 1,
    }));
    pages = [{
      pageNumber: 1,
      extractionMethod: "ocr",
      imageOnly: recognized.text.length < 24,
      text: recognized.text,
      confidence: recognized.text.length >= 24 ? recognized.confidence : undefined,
    }];
  } else {
    pages = pagesFromText(new TextDecoder().decode(buffer));
  }

  onProgress?.({ stage: "structuring", label: `Structuring ${file.name}`, progress: 1 });
  return buildBalanceSheetReview({
    source: {
      documentId: documentId(hash),
      fileName: file.name,
      mimeType: file.type || "text/plain",
      sha256: hash,
      pageCount: pages.length,
      expectedPageCount: pages.length,
      synthetic: false,
      processedAt: new Date().toISOString(),
      processingVersion: "tender-balance/1.1.0",
    },
    pages,
  });
}
