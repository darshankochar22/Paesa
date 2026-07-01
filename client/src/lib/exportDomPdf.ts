// Export a live DOM element to PDF exactly as the frontend renders it (WYSIWYG).
// Snapshots the element's outerHTML plus the app's actual stylesheets, then hands the
// self-contained document to the main process (printToPDF). No hand-built template.

import type { PdfExportResult } from "@/types/api/Pdf";

// Concatenate the cssText of every accessible stylesheet so the snapshot keeps the
// real app styling (Tailwind utilities, theme variables, etc.).
function collectCss(): string {
  let css = "";
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) css += rule.cssText + "\n";
    } catch {
      // Inaccessible (cross-origin) sheet — skip it.
    }
  }
  return css;
}

// Build a self-contained HTML document (element outerHTML + the app's live CSS)
// so the main-process PDF printer renders it exactly as it appears on screen.
function buildPrintHtml(el: HTMLElement): string {
  const css = collectCss();
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${css}
/* Base context (the captured node inherits color/size from app root on screen). */
html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; font-size: 14px; }
/* Let the captured area flow across pages instead of being clipped by on-screen scroll boxes. */
#__print_root__ { height: auto !important; max-height: none !important; overflow: visible !important; display: block !important; }
#__print_root__ * { overflow: visible !important; max-height: none !important; }
</style></head><body><div id="__print_root__">${el.outerHTML}</div></body></html>`;
}

export async function exportElementToPdf(el: HTMLElement, fileName: string): Promise<PdfExportResult> {
  if (!el) return { success: false, error: "Nothing to export." };
  const html = buildPrintHtml(el);
  const safe = (fileName || "export").replace(/[\\/:*?"<>|]+/g, "_");
  return window.api.pdf.fromHtml(html, safe.endsWith(".pdf") ? safe : `${safe}.pdf`);
}

// Render the element to a PDF and return it as base64 (no save dialog) — used to
// attach the voucher PDF to a WhatsApp message.
export async function renderElementToPdfBase64(
  el: HTMLElement
): Promise<{ success: boolean; base64?: string; error?: string }> {
  if (!el) return { success: false, error: "Nothing to export." };
  const html = buildPrintHtml(el);
  return (window.api.pdf as any).toBase64(html);
}
