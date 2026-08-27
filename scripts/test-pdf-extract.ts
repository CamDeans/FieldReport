/**
 * PDF text extract smoke (no OpenAI required for text path).
 * Run: npx tsx scripts/test-pdf-extract.ts
 */
import assert from "node:assert/strict";
import { extractPdfText, renderPdfPageDataUrls } from "../src/lib/services/pdf-extract";

async function main() {
  const minimal = Buffer.from(
    "%PDF-1.1\n1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n4 0 obj<< /Length 44 >>stream\nBT /F1 24 Tf 50 100 Td (Hello OCR) Tj ET\nendstream\nendobj\n5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000266 00000 n \n0000000361 00000 n \ntrailer<< /Size 6 /Root 1 0 R >>\nstartxref\n441\n%%EOF\n"
  );

  const text = await extractPdfText(minimal);
  assert.match(text, /Hello OCR/i);
  console.log("PASS extractPdfText");

  const blank = Buffer.from(
    `%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer<< /Size 4 /Root 1 0 R >>
startxref
190
%%EOF`
  );
  const { ensurePdfText, meaningfulPdfText } = await import("../src/lib/services/pdf-extract");
  assert.equal(meaningfulPdfText("-- 1 of 1 --"), "");
  const blankResult = await ensurePdfText(blank);
  assert.equal(blankResult.source, "empty");
  assert.equal(blankResult.text, "");
  console.log("PASS blank PDF → empty source");

  const pages = await renderPdfPageDataUrls(minimal, 1, 1);
  assert.equal(pages.length, 1);
  assert.ok(pages[0].startsWith("data:image/png;base64,"));
  console.log("PASS renderPdfPageDataUrls");

  console.log("PDF extract OK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
