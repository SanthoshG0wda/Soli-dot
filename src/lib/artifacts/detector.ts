import type { ArtifactKind } from "@/lib/types";

export interface DetectedDocument {
  isLegalDoc: boolean;
  title: string;
  kind: ArtifactKind;
  content: string; // The clean document body without preambles or chat trailers
  court?: string;
  summary?: string;
}

/**
 * Strips conversational preambles (e.g. "I'll draft a statutory demand notice...",
 * "Certainly! Here is the petition:") and trailing conversational commentary
 * (e.g. "**Key Legal Points Included:**", "You can fill in the bracketed placeholders...",
 * "Would you like me to help you...") from model responses, leaving strictly
 * the actual document content.
 */
export function cleanDocumentContent(rawText: string): string {
  if (!rawText || typeof rawText !== "string") return "";

  const lines = rawText.split(/\r?\n/);

  // 1. Find the start line of the document
  let startIndex = -1;
  const docStartRegex =
    /^(?:#+\s*)?(?:IN THE COURT OF|BEFORE THE HON'BLE|BEFORE THE COURT|IN THE HIGH COURT|IN THE SUPREME COURT|IN THE MATTER OF:|CRIMINAL MISCELLANEOUS|COMMERCIAL SUIT|BAIL APPLICATION|APPLICATION (?:FOR|UNDER)|PETITION (?:FOR|UNDER)|MEMORANDUM OF|STATUTORY (?:DEMAND )?NOTICE|DEMAND NOTICE|(?:LEGAL )?DEMAND NOTICE|LEGAL NOTICE UNDER|LEGAL NOTICE\b|NOTICE UNDER SECTION|AFFIDAVIT\b|AGREEMENT\b|CONTRACT\b|POWER OF ATTORNEY|DEED OF)/i;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    // Check if this line is an obvious chat preamble to skip
    if (
      /^(?:I('ll| will| have| am pleased to)|Here is|Certainly|Sure|Below is|As requested|Since the|Please find|Attached is)/i.test(
        trimmed,
      )
    ) {
      continue;
    }

    // Check if line matches document start pattern
    if (docStartRegex.test(trimmed)) {
      startIndex = i;
      break;
    }

    // Check for a primary markdown heading that looks like a title
    if (
      /^#+\s+[A-Z0-9]/.test(trimmed) &&
      !/^(?:#+\s*)?(?:Key |Notes|Summary|Overview|Introduction|Instructions|How to)/i.test(
        trimmed,
      )
    ) {
      startIndex = i;
      break;
    }
  }

  if (startIndex === -1) {
    startIndex = 0;
  }

  // 2. Find the end line of the document (strip trailing commentary / key points / chit chat)
  const docLines = lines.slice(startIndex);

  const trailingChatterRegex =
    /^(?:---+\s*)?(?:\*\*Key Legal Points|\*\*Key Points|\*\*Notes:?|\*\*Important Notes:?|\*\*Important Considerations:?|\*\*Filing Instructions:?|Key Legal Points|Key Points|You can fill in|Please ensure you fill in|Would you like me to|Let me know if|Feel free to ask|Hope this helps|Please note that this draft)/i;
  const headingChatterRegex =
    /^#{1,4}\s*(?:Key Legal Points|Key Points|Notes|Important Notes|Instructions for Filing|Next Steps|How to File)/i;

  let endIndex = docLines.length;
  for (let i = 0; i < docLines.length; i++) {
    const trimmed = docLines[i].trim();
    if (!trimmed) continue;

    if (headingChatterRegex.test(trimmed)) {
      endIndex = i;
      break;
    }

    if (trailingChatterRegex.test(trimmed)) {
      endIndex = i;
      break;
    }

    // Check for separator followed immediately by commentary
    if (/^---+$/.test(trimmed) && i + 1 < docLines.length) {
      const nextNonEmpty = docLines.slice(i + 1).find((l) => l.trim().length > 0);
      if (
        nextNonEmpty &&
        (trailingChatterRegex.test(nextNonEmpty.trim()) ||
          headingChatterRegex.test(nextNonEmpty.trim()) ||
          /^\*This is a statutory notice.*Legal advice/i.test(nextNonEmpty.trim()))
      ) {
        endIndex = i;
        break;
      }
    }
  }

  let cleaned = docLines.slice(0, endIndex).join("\n").trim();

  // Strip any synthetic headers or watermarks if present
  cleaned = cleaned
    .replace(/^(?:#+\s*|\*\*\s*)?(?:SOLI COURT DRAFT|INDIAN STATUTORY JURISDICTION)[^\n\r]*\r?\n+/gim, "")
    .replace(/(?:—+\s*)?(?:End of Petition\s*\/)?\s*Drafted with Soli[^\n\r]*/gim, "")
    .trim();

  // If cleaning resulted in something too short (< 100 chars), fall back to original trimmed text
  if (cleaned.length < 100) {
    cleaned = rawText.trim();
  }

  return cleaned;
}

/**
 * Detects if a text block contains a formal court petition, statutory notice,
 * contract, or structured document.
 * Returns title, kind, and cleaned content (without conversational chatter).
 */
export function detectLegalDocument(text: string): DetectedDocument | null {
  if (!text || text.length < 250) return null;

  const hasCourt = /IN THE COURT OF|BEFORE THE HON'BLE|BEFORE THE COURT|DISTRICT AND SESSIONS/i.test(text);
  const hasPetition = /APPLICATION (FOR|UNDER)|PETITION (FOR|UNDER)|MEMORANDUM OF|NOTICE UNDER SECTION|DEMAND NOTICE|STATUTORY NOTICE/i.test(text);
  const hasLegalClauses = /VERSUS|V\/S|VS\.|MOST RESPECTFULLY SHOWETH|GROUNDS|PRAYER|VERIFICATION|AFFIDAVIT|CHEQUE|NEGOTIABLE INSTRUMENTS|DRAWER|PAYEE/i.test(text);

  if ((hasCourt && (hasPetition || hasLegalClauses)) || (hasPetition && hasLegalClauses)) {
    const cleaned = cleanDocumentContent(text);

    // Extract title
    let title = "Court Petition";
    const statutoryNoticeMatch = cleaned.match(/STATUTORY (?:DEMAND )?NOTICE(?:\s*\n+\s*(?:UNDER )?SECTION\s*138[^\n\r]*)?/i);
    const titleMatch = cleaned.match(
      /(?:#+\s*|\*\*\s*)?(APPLICATION FOR[^\n\r]+|APPLICATION UNDER SECTION[^\n\r]+|PETITION UNDER SECTION[^\n\r]+|IN THE MATTER OF:[^\n\r]+|STATUTORY (?:DEMAND )?NOTICE[^\n\r]*|NOTICE UNDER SECTION[^\n\r]+|DEMAND NOTICE UNDER SECTION[^\n\r]+|LEGAL DEMAND NOTICE[^\n\r]+)/i,
    );
    if (statutoryNoticeMatch && /138/.test(cleaned)) {
      title = "Statutory Demand Notice under Section 138 NI Act";
    } else if (titleMatch) {
      title = titleMatch[1].replace(/[#*`_]/g, "").trim();
      // If title is just "STATUTORY DEMAND NOTICE" on a line by itself and followed by Section 138
      if (/^STATUTORY (?:DEMAND )?NOTICE$/i.test(title) && /138/.test(cleaned)) {
        title = "Statutory Demand Notice under Section 138 NI Act";
      }
    } else {
      const firstHeader = cleaned.match(/^#+\s*(.+)$/m);
      if (firstHeader && !/^\d+\./.test(firstHeader[1].trim())) {
        title = firstHeader[1].replace(/[*_`]/g, "").trim();
      } else {
        const firstLine = cleaned.split("\n").find((l) => l.trim().length > 0);
        if (firstLine) title = firstLine.replace(/[*_`#]/g, "").trim();
      }
    }

    // Clean up title
    if (title.length > 90) {
      title = title.slice(0, 87) + "...";
    }

    return {
      isLegalDoc: true,
      title,
      kind: "legal_paper",
      content: cleaned,
    };
  }

  // Detect formal agreements, contracts, deeds, or affidavits with standard operative clauses
  const hasAgreement = /AGREEMENT\b|CONTRACT\b|POWER OF ATTORNEY|DEED OF|MEMORANDUM OF UNDERSTANDING/i.test(text);
  const hasFormalClauses = /WHEREAS|NOW THEREFORE|IN WITNESS WHEREOF|COVENANTS|INDEMNITY|CONFIDENTIALITY|TERMINATION/i.test(text);

  if (hasAgreement && hasFormalClauses) {
    const cleaned = cleanDocumentContent(text);
    let title = "Legal Agreement";
    const headerMatch = cleaned.match(/^#+\s+(.+)$/m);
    if (headerMatch) {
      title = headerMatch[1].replace(/[*_`]/g, "").trim();
    }
    return {
      isLegalDoc: true,
      title: title.slice(0, 80),
      kind: "contract",
      content: cleaned,
    };
  }

  return null;
}
