export type LegalTemplateCategory =
  | "bail"
  | "quashing"
  | "discharge"
  | "notices"
  | "evidence_applications";

export interface LegalTemplate {
  id: string;
  title: string;
  category: LegalTemplateCategory;
  act: string;
  sections: string[];
  applicableCourt: string;
  keyPrecedents: string[];
  description: string;
  draftingChecklist: string[];
  templateText: string;
}
