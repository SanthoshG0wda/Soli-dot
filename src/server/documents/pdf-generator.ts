import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface PdfOptions {
  title: string;
  courtHeader?: string;
  author?: string;
  subject?: string;
}

/**
 * Generates a clean, professional court-ready PDF document from structured text or legal draft.
 * Conforms to standard Indian Court conventions:
 * - 1.5-inch / 65pt left margin (binding margin)
 * - 45pt right margin, 50pt top and bottom margins
 * - Running header & footer with "Page X of Y" pagination
 * - Proper text wrapping and legal heading recognition
 */
export async function generatePdfDocument(content: string, options: PdfOptions): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(options.title);
  if (options.author) pdfDoc.setAuthor(options.author);
  if (options.subject) pdfDoc.setSubject(options.subject);

  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesRomanItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  // A4 Page dimensions: 595.28 x 841.89 pt
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  // Margins
  const marginLeft = 65; // Extra space for court file binding
  const marginRight = 45;
  const marginTop = 55;
  const marginBottom = 50;

  const contentWidth = pageWidth - marginLeft - marginRight;

  const bodyFontSize = 11;
  const bodyLineHeight = 16;
  const headingFontSize = 13;
  const headingLineHeight = 18;
  const titleFontSize = 15;
  const titleLineHeight = 22;

  // Helper to wrap text into lines fitting within max width
  function wrapText(text: string, font: typeof timesRoman, size: number, maxWidth: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      if (!word) continue;
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, size);
      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        // If single word is wider than maxWidth (rare), break it
        if (font.widthOfTextAtSize(word, size) > maxWidth) {
          let chunk = "";
          for (const char of word) {
            if (font.widthOfTextAtSize(chunk + char, size) <= maxWidth) {
              chunk += char;
            } else {
              lines.push(chunk);
              chunk = char;
            }
          }
          currentLine = chunk;
        } else {
          currentLine = word;
        }
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length > 0 ? lines : [""];
  }

  // Pre-process paragraphs
  const rawParagraphs = content.replace(/\r\n/g, "\n").split("\n");

  type FormattedBlock = {
    type: "title" | "heading" | "body" | "quote" | "separator";
    text: string;
    align: "left" | "center" | "right";
    bold?: boolean;
    italic?: boolean;
  };

  const blocks: FormattedBlock[] = [];

  for (const raw of rawParagraphs) {
    const trimmed = raw.trim();
    if (!trimmed) {
      blocks.push({ type: "separator", text: "", align: "left" });
      continue;
    }

    // Markdown headers
    if (trimmed.startsWith("# ")) {
      blocks.push({ type: "title", text: trimmed.slice(2).trim(), align: "center", bold: true });
    } else if (trimmed.startsWith("## ")) {
      blocks.push({ type: "heading", text: trimmed.slice(3).trim(), align: "left", bold: true });
    } else if (trimmed.startsWith("### ")) {
      blocks.push({ type: "heading", text: trimmed.slice(4).trim(), align: "left", bold: true });
    } else if (
      /^IN THE COURT OF/i.test(trimmed) ||
      /^BEFORE THE/i.test(trimmed) ||
      /^CRIMINAL MISCELLANEOUS/i.test(trimmed) ||
      /^CIVIL SUIT/i.test(trimmed) ||
      /^APPLICATION UNDER/i.test(trimmed) ||
      /^PETITION UNDER/i.test(trimmed) ||
      /^MEMORANDUM OF/i.test(trimmed)
    ) {
      blocks.push({ type: "heading", text: trimmed, align: "center", bold: true });
    } else if (/^VERSUS$/i.test(trimmed) || /^V\/S$/i.test(trimmed) || /^VS\.$/i.test(trimmed)) {
      blocks.push({ type: "heading", text: trimmed, align: "center", bold: true });
    } else if (/^\.\.\.\s*(APPLICANT|RESPONDENT|PETITIONER|ACCUSED|COMPLAINANT)/i.test(trimmed)) {
      blocks.push({ type: "body", text: trimmed, align: "right", bold: true });
    } else if (
      /^(PRAYER|VERIFICATION|AFFIDAVIT|MEMO OF PARTIES|GROUNDS):?$/i.test(trimmed) ||
      /^(MOST RESPECTFULLY SHOWETH):?$/i.test(trimmed)
    ) {
      blocks.push({ type: "heading", text: trimmed, align: "left", bold: true });
    } else if (trimmed.startsWith("> ")) {
      blocks.push({ type: "quote", text: trimmed.slice(2).trim(), align: "left", italic: true });
    } else {
      // Normal text
      blocks.push({ type: "body", text: trimmed, align: "left" });
    }
  }

  // Layout pages
  const pages: { lines: { text: string; x: number; y: number; font: typeof timesRoman; size: number }[] }[] = [];
  let currentLines: { text: string; x: number; y: number; font: typeof timesRoman; size: number }[] = [];
  let currentY = pageHeight - marginTop;

  function newPage() {
    if (currentLines.length > 0) {
      pages.push({ lines: currentLines });
      currentLines = [];
    }
    currentY = pageHeight - marginTop;
  }

  for (const block of blocks) {
    if (block.type === "separator") {
      currentY -= bodyLineHeight * 0.6;
      if (currentY < marginBottom) newPage();
      continue;
    }

    const font = block.bold ? timesRomanBold : block.italic ? timesRomanItalic : timesRoman;
    const size = block.type === "title" ? titleFontSize : block.type === "heading" ? headingFontSize : bodyFontSize;
    const lineHeight = block.type === "title" ? titleLineHeight : block.type === "heading" ? headingLineHeight : bodyLineHeight;

    const wrapped = wrapText(block.text, font, size, contentWidth);

    // If starting a new heading close to bottom, move to next page
    if (block.type === "heading" && currentY - (wrapped.length * lineHeight + 20) < marginBottom) {
      newPage();
    }

    for (const line of wrapped) {
      if (currentY - lineHeight < marginBottom) {
        newPage();
      }

      let x = marginLeft;
      const textWidth = font.widthOfTextAtSize(line, size);
      if (block.align === "center") {
        x = marginLeft + Math.max(0, (contentWidth - textWidth) / 2);
      } else if (block.align === "right") {
        x = marginLeft + Math.max(0, contentWidth - textWidth);
      }

      currentLines.push({ text: line, x, y: currentY, font, size });
      currentY -= lineHeight;
    }

    // Space after headings or paragraphs
    if (block.type === "title" || block.type === "heading") {
      currentY -= 6;
    } else {
      currentY -= 3;
    }
  }

  if (currentLines.length > 0) {
    pages.push({ lines: currentLines });
  }

  if (pages.length === 0) {
    pages.push({ lines: [] });
  }

  const totalPages = pages.length;

  // Render to PDF document
  for (let i = 0; i < pages.length; i++) {
    const pageData = pages[i];
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const pageNum = i + 1;

    // Running Header (from page 2 onwards)
    if (pageNum > 1) {
      const headerText = options.courtHeader || options.title.slice(0, 70);
      page.drawText(headerText, {
        x: marginLeft,
        y: pageHeight - 32,
        size: 8.5,
        font: timesRomanItalic,
        color: rgb(0.4, 0.4, 0.4),
      });

      page.drawLine({
        start: { x: marginLeft, y: pageHeight - 37 },
        end: { x: pageWidth - marginRight, y: pageHeight - 37 },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });
    }

    // Draw content lines
    for (const item of pageData.lines) {
      page.drawText(item.text, {
        x: item.x,
        y: item.y,
        size: item.size,
        font: item.font,
        color: rgb(0.08, 0.08, 0.08),
      });
    }

    // Footer: Running page number
    const footerText = `Page ${pageNum} of ${totalPages}`;
    const footerWidth = timesRoman.widthOfTextAtSize(footerText, 9);
    page.drawText(footerText, {
      x: marginLeft + (contentWidth - footerWidth) / 2,
      y: 28,
      size: 9,
      font: timesRoman,
      color: rgb(0.35, 0.35, 0.35),
    });

    // Subtle bottom rule
    page.drawLine({
      start: { x: marginLeft, y: 38 },
      end: { x: pageWidth - marginRight, y: 38 },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.85),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
