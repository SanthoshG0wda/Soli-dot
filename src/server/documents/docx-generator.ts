import "server-only";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  convertInchesToTwip,
  Header,
  Footer,
  PageNumber,
} from "docx";

export interface DocxOptions {
  title: string;
  courtHeader?: string;
  author?: string;
}

/**
 * Generates an editable Microsoft Word (.docx) document formatted with standard Indian court margins
 * (1.5" left margin, 1.0" top/right/bottom), Times New Roman 12pt, and 1.5 line spacing.
 */
export async function generateDocxDocument(content: string, options: DocxOptions): Promise<Buffer> {
  const paragraphs: Paragraph[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");

  for (const raw of lines) {
    const trimmed = raw.trim();

    if (!trimmed) {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 120 },
        }),
      );
      continue;
    }

    // Markdown title
    if (trimmed.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 180 },
          children: [
            new TextRun({
              text: trimmed.slice(2).trim(),
              bold: true,
              size: 28, // 14pt
              font: "Times New Roman",
            }),
          ],
        }),
      );
      continue;
    }

    // Headings
    if (trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
      const headingText = trimmed.replace(/^#+\s*/, "");
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: headingText,
              bold: true,
              size: 24, // 12pt
              font: "Times New Roman",
            }),
          ],
        }),
      );
      continue;
    }

    // Court Cause Title indicators
    if (
      /^IN THE COURT OF/i.test(trimmed) ||
      /^BEFORE THE/i.test(trimmed) ||
      /^CRIMINAL MISCELLANEOUS/i.test(trimmed) ||
      /^CIVIL SUIT/i.test(trimmed) ||
      /^APPLICATION UNDER/i.test(trimmed) ||
      /^PETITION UNDER/i.test(trimmed) ||
      /^MEMORANDUM OF/i.test(trimmed)
    ) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 180, after: 120 },
          children: [
            new TextRun({
              text: trimmed,
              bold: true,
              size: 24,
              font: "Times New Roman",
            }),
          ],
        }),
      );
      continue;
    }

    if (/^VERSUS$/i.test(trimmed) || /^V\/S$/i.test(trimmed) || /^VS\.$/i.test(trimmed)) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 120 },
          children: [
            new TextRun({
              text: trimmed,
              bold: true,
              size: 24,
              font: "Times New Roman",
            }),
          ],
        }),
      );
      continue;
    }

    if (/^\.\.\.\s*(APPLICANT|RESPONDENT|PETITIONER|ACCUSED|COMPLAINANT)/i.test(trimmed)) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 60, after: 120 },
          children: [
            new TextRun({
              text: trimmed,
              bold: true,
              size: 24,
              font: "Times New Roman",
            }),
          ],
        }),
      );
      continue;
    }

    if (
      /^(PRAYER|VERIFICATION|AFFIDAVIT|MEMO OF PARTIES|GROUNDS):?$/i.test(trimmed) ||
      /^(MOST RESPECTFULLY SHOWETH):?$/i.test(trimmed)
    ) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: trimmed,
              bold: true,
              size: 24,
              font: "Times New Roman",
            }),
          ],
        }),
      );
      continue;
    }

    // Standard numbered or regular paragraph
    const isNumbered = /^[0-9]+[.)]\s+|^[a-zA-Z][.)]\s+/.test(trimmed);
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 120, line: 360 }, // 1.5 line spacing (360 twips)
        indent: isNumbered ? { left: convertInchesToTwip(0.3) } : undefined,
        children: [
          new TextRun({
            text: trimmed,
            size: 24, // 12pt
            font: "Times New Roman",
          }),
        ],
      }),
    );
  }

  const doc = new Document({
    title: options.title,
    creator: options.author || "Soli Legal AI",
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1.0),
              bottom: convertInchesToTwip(1.0),
              left: convertInchesToTwip(1.5), // Standard court binding margin
              right: convertInchesToTwip(1.0),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: options.courtHeader || options.title.slice(0, 60),
                    size: 18,
                    italics: true,
                    color: "666666",
                    font: "Times New Roman",
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "Page ",
                    size: 18,
                    font: "Times New Roman",
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    font: "Times New Roman",
                  }),
                  new TextRun({
                    text: " of ",
                    size: 18,
                    font: "Times New Roman",
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 18,
                    font: "Times New Roman",
                  }),
                ],
              }),
            ],
          }),
        },
        children: paragraphs,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
