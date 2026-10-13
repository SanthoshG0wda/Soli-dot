import "server-only";
import * as files from "../files";
import * as repo from "../repo";
import { generatePdfDocument } from "./pdf-generator";
import { generateDocxDocument } from "./docx-generator";
import { cleanDocumentContent } from "@/lib/artifacts/detector";
import type { DocumentGenerationOptions, DocumentGenerationResult } from "./types";
import type { Attachment } from "@/lib/types";

/**
 * Creates or updates a structured document artifact.
 * Automatically generates:
 * 1. Plain text / Markdown file
 * 2. Court-formatted PDF file
 * 3. Court-formatted Word (.docx) file
 * 4. Database artifact record
 * 5. Attached chat notification message linking to the artifact board
 */
export async function createDocumentArtifact(
  options: DocumentGenerationOptions,
): Promise<DocumentGenerationResult> {
  const {
    dotId,
    conversationId,
    userId,
    title,
    filename,
    kind,
    content,
    summary,
    metadata,
    generatePdf = true,
    generateDocx = true,
  } = options;

  // Ensure content contains ONLY the actual document text (stripping chat preambles and trailers)
  const cleanedContent = cleanDocumentContent(content);

  const baseName = filename.replace(/\.(md|txt|pdf|docx)$/i, "");
  const textFilename = `${baseName}.md`;
  const pdfFilename = `${baseName}.pdf`;
  const docxFilename = `${baseName}.docx`;

  const attachments: Attachment[] = [];

  // 1. Text / Markdown file
  const textBuffer = Buffer.from(cleanedContent, "utf8");
  const textAtt = files.saveFileDirectly(
    dotId,
    textFilename,
    "text/markdown",
    textBuffer,
    userId,
  );
  attachments.push(textAtt);

  let pdfAtt: Attachment | undefined;
  if (generatePdf) {
    try {
      const pdfBuffer = await generatePdfDocument(cleanedContent, {
        title,
        courtHeader: (metadata?.court as string) || (metadata?.act as string) || undefined,
        author: "Soli Legal AI",
        subject: summary || title,
      });
      pdfAtt = files.saveFileDirectly(
        dotId,
        pdfFilename,
        "application/pdf",
        pdfBuffer,
        userId,
      );
      attachments.push(pdfAtt);
    } catch (err) {
      console.error("Failed to generate PDF for artifact:", err);
    }
  }

  let docxAtt: Attachment | undefined;
  if (generateDocx) {
    try {
      const docxBuffer = await generateDocxDocument(cleanedContent, {
        title,
        courtHeader: (metadata?.court as string) || (metadata?.act as string) || undefined,
        author: "Soli Legal AI",
      });
      docxAtt = files.saveFileDirectly(
        dotId,
        docxFilename,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        docxBuffer,
        userId,
      );
      attachments.push(docxAtt);
    } catch (err) {
      console.error("Failed to generate DOCX for artifact:", err);
    }
  }

  // 4. Save Artifact record
  const artifact = repo.saveArtifact({
    dotId,
    conversationId,
    userId,
    title,
    filename: textFilename,
    kind,
    content: cleanedContent,
    summary,
    metadata,
    fileId: textAtt.id,
    pdfFileId: pdfAtt?.id,
    docxFileId: docxAtt?.id,
  });

  // 5. Post notification message in chat linking to the artifact

  const kindBadge =
    kind === "legal_paper"
      ? "Legal Petition / Court Paper"
      : kind === "contract"
        ? "Legal Agreement"
        : "Document";

  if (options.notifyInChat !== false && conversationId) {
    repo.addMessage({
      conversationId,
      dotId,
      role: "dot",
      from: `dot:${dotId}`,
      text: `Drafted **${title}** (${kindBadge}). The document has been compiled with court margins and is ready for inspection in the Artifact Board.`,
      attachments,
      artifactId: artifact.id,
    });
  }

  return {
    artifact,
    textAttachmentId: textAtt.id,
    pdfAttachmentId: pdfAtt?.id,
    docxAttachmentId: docxAtt?.id,
  };
}
