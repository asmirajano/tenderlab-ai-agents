import { buildBalanceSheetReview, type BalanceSheetInput, type BalanceSheetReview, type SourcePageInput } from "./model.ts";

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

export async function readPdfPages(buffer: ArrayBuffer): Promise<SourcePageInput[]> {
  const pdfjs = typeof window === "undefined"
    ? await import("pdfjs-dist/legacy/build/pdf.mjs")
    : await import("pdfjs-dist");
  if (typeof window !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  }
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
  const pages: SourcePageInput[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    let text = "";
    for (const item of content.items) {
      if (!("str" in item)) continue;
      text += `${item.str}${item.hasEOL ? "\n" : " "}`;
    }
    text = text.replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, "  ").trim();
    pages.push({
      pageNumber,
      text,
      extractionMethod: "digital-text",
      confidence: text.length >= 24 ? 0.98 : undefined,
      imageOnly: text.length < 24,
    });
  }
  return pages;
}

function isBalanceSheetInput(value: unknown): value is BalanceSheetInput {
  if (!value || typeof value !== "object") return false;
  const input = value as Partial<BalanceSheetInput>;
  return Boolean(input.source?.documentId && input.source?.fileName && Array.isArray(input.pages));
}

export async function readBalanceSheetFile(file: File): Promise<BalanceSheetReview> {
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
    pages = await readPdfPages(buffer);
  } else if (file.type.startsWith("image/") || /\.(?:png|jpe?g|tiff?|webp)$/i.test(lowerName)) {
    pages = [{ pageNumber: 1, extractionMethod: "ocr", imageOnly: true, text: "" }];
  } else {
    pages = pagesFromText(new TextDecoder().decode(buffer));
  }

  return buildBalanceSheetReview({
    source: {
      documentId: documentId(hash),
      fileName: file.name,
      mimeType: file.type || "text/plain",
      sha256: hash,
      pageCount: pages.length,
      expectedPageCount: pages.length,
      synthetic: false,
    },
    pages,
  });
}
