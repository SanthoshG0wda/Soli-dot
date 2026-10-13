/**
 * Extracts cite markers from a model answer. Primary form is "[n]" / "[2, 3]".
 * Reasoning models (e.g. Nemotron) also emit OpenAI-harmony-style markers like
 * "【2†L1-L3】" despite instructions — the leading number is treated as the
 * cited chunk index so those answers still ground to retrieved sources.
 */
const CITATION_PATTERN = /\[(\d+(?:\s*,\s*\d+)*)\]|【(\d+)\s*[†‡]/g;

/**
 * Parses cite markers from the answer and returns the cited 1-based chunk
 * indices in first-appearance order. Indices outside the valid range
 * (>= 1 and <= validCount) are ignored, so the model can never cite a chunk
 * that was not part of the retrieved context.
 */
export function parseCitedIndices(answer: string, validCount: number): number[] {
  const seen = new Set<number>();
  const indices: number[] = [];
  const push = (index: number) => {
    if (!Number.isInteger(index) || index < 1 || index > validCount) return;
    if (seen.has(index)) return;
    seen.add(index);
    indices.push(index);
  };

  for (const match of answer.matchAll(CITATION_PATTERN)) {
    if (match[1] !== undefined) {
      for (const token of (match[1] ?? "").split(",")) push(Number(token.trim()));
    } else if (match[2] !== undefined) {
      push(Number(match[2]));
    }
  }

  return indices;
}