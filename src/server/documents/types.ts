import type { ArtifactKind, DocumentArtifact } from "@/lib/types";

export interface LegalPetitionData {
  courtTitle?: string;
  caseType?: string;
  applicant?: string;
  respondent?: string;
  firDetails?: string;
  policeStation?: string;
  sections?: string;
  facts?: string[];
  grounds?: string[];
  precedents?: string[];
  prayer?: string[];
  verification?: string;
}

export interface DocumentGenerationOptions {
  dotId: string;
  conversationId?: string | null;
  userId: string;
  title: string;
  filename: string;
  kind: ArtifactKind;
  content: string;
  summary?: string;
  metadata?: Record<string, unknown>;
  generatePdf?: boolean;
  generateDocx?: boolean;
  notifyInChat?: boolean;
}

export interface DocumentGenerationResult {
  artifact: DocumentArtifact;
  textAttachmentId: string;
  pdfAttachmentId?: string;
  docxAttachmentId?: string;
}
