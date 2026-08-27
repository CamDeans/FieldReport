import { PDFParse } from "pdf-parse";
import { extractText, getDocumentProxy, renderPageAsImage } from "unpdf";
import OpenAI from "openai";
import { isOpenAiConfigured } from "../config";

/** Strip data-URL prefix and decode base64 PDF bytes. */
export function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  return Buffer.from(base64, "base64");
}

function truncate(text: string, maxChars: number) {
  const trimmed = text.replace(/\s+\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (!trimmed) return "";
  return trimmed.length > maxChars ? `${trimmed.slice(0, maxChars)}\n…[truncated]` : trimmed;
}

/** Drop pdf-parse page markers like "-- 1 of 1 --" so blank PDFs count as empty. */
export function meaningfulPdfText(text: string): string {
  return text
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract plain text from a PDF (data URL or raw buffer) via pdf-parse, with unpdf fallback.
 */
export async function extractPdfText(input: string | Buffer, maxChars = 24_000): Promise<string> {
  let parser: PDFParse | null = null;
  try {
    const buffer = typeof input === "string" ? dataUrlToBuffer(input) : input;
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = truncate(result.text || "", maxChars);
    if (text) return text;
  } catch {
    /* try unpdf below */
  } finally {
    if (parser) {
      try {
        await parser.destroy();
      } catch {
        /* ignore */
      }
    }
  }

  try {
    const buffer = typeof input === "string" ? dataUrlToBuffer(input) : input;
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const result = await extractText(pdf, { mergePages: true });
    const textValue = result.text as unknown;
    const raw =
      typeof textValue === "string"
        ? textValue
        : Array.isArray(textValue)
          ? (textValue as string[]).join("\n")
          : "";
    return truncate(raw, maxChars);
  } catch {
    return "";
  }
}

/** Load native canvas without bundlers statically resolving the package. */
async function loadCanvasModule() {
  const dynamicImport = new Function("m", "return import(m)") as (m: string) => Promise<unknown>;
  return dynamicImport("@napi-rs/canvas");
}

/** Render the first N PDF pages to PNG data URLs for vision OCR. */
export async function renderPdfPageDataUrls(
  input: string | Buffer,
  maxPages = 3,
  scale = 1.5
): Promise<string[]> {
  try {
    const buffer = typeof input === "string" ? dataUrlToBuffer(input) : input;
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const pageCount = Math.min(pdf.numPages || 1, maxPages);
    const urls: string[] = [];
    for (let page = 1; page <= pageCount; page += 1) {
      const image = await renderPageAsImage(pdf, page, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        canvasImport: () => loadCanvasModule() as any,
        scale,
      });
      const png = Buffer.from(image);
      urls.push(`data:image/png;base64,${png.toString("base64")}`);
    }
    return urls;
  } catch {
    return [];
  }
}

/**
 * OCR scanned / image-only PDF pages with OpenAI vision when plain-text extract is empty.
 */
export async function ocrPdfWithOpenAi(input: string | Buffer, maxChars = 24_000): Promise<string | null> {
  if (!isOpenAiConfigured()) return null;
  const pages = await renderPdfPageDataUrls(input, 3);
  if (!pages.length) return null;
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You are a careful OCR engine for contractor reference PDFs. Extract all readable text from the page images in reading order. Preserve headings and list structure when visible. Return plain text only — no commentary.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the full text from these PDF page image(s)." },
            ...pages.map((url) => ({
              type: "image_url" as const,
              image_url: { url, detail: "high" as const },
            })),
          ],
        },
      ],
    });
    const raw = response.choices[0]?.message?.content?.trim() || "";
    return truncate(raw, maxChars) || null;
  } catch {
    return null;
  }
}

export type PdfExtractionSource = "text" | "ocr" | "empty";

export async function ensurePdfText(
  input: string | Buffer,
  maxChars = 24_000
): Promise<{ text: string; source: PdfExtractionSource }> {
  const text = meaningfulPdfText(await extractPdfText(input, maxChars));
  if (text) return { text, source: "text" };
  const ocr = await ocrPdfWithOpenAi(input, maxChars);
  if (ocr) return { text: ocr, source: "ocr" };
  return { text: "", source: "empty" };
}
