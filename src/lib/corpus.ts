/**
 * The legal corpus is organized into collections so admins can build and
 * curate the knowledge base deliberately. Client-safe (no server-only
 * imports) so both UI components and route handlers can share it.
 */

export const CORPUS_COLLECTIONS = [
  {
    id: "constitutional",
    label: "Constitutional Law",
    shortLabel: "Constitutional",
    description:
      "The Constitution, schedules, amendments, and constitutional commentary.",
  },
  {
    id: "statutes",
    label: "Statutes — BNS, BNSS & More",
    shortLabel: "Statutes",
    description:
      "Bharatiya Nyaya Sanhita, Bharatiya Nagarik Suraksha Sanhita, Bharatiya Sakshya Adhiniyam, and other enactments.",
  },
  {
    id: "case-law",
    label: "Case Law — Criminal",
    shortLabel: "Case law",
    description:
      "Prior case results, judgments, and orders. Current focus: criminal matters.",
  },
] as const;

export type CorpusCollectionId =
  (typeof CORPUS_COLLECTIONS)[number]["id"];

export function isCorpusCollectionId(
  value: unknown,
): value is CorpusCollectionId {
  return (
    typeof value === "string" &&
    CORPUS_COLLECTIONS.some((collection) => collection.id === value)
  );
}

export function collectionLabel(
  collection: string | null | undefined,
): string {
  const found = CORPUS_COLLECTIONS.find((c) => c.id === collection);
  return found ? found.shortLabel : "Uncategorized";
}
