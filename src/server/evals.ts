import "server-only";

import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ragEvals } from "@/db/schema";
import { generateRagResponse } from "@/lib/rag";

export interface EvalTestCase {
  id: string;
  title: string;
  query: string;
  expectedAnswer: string;
  category: string;
  expectedDocTitle: string | null;
  lastScore: number | null;
  lastPassed: number | null;
  lastLatencyMs: number | null;
  lastResult: string | null;
  lastRunAt: string | null;
  createdAt: string;
}

export interface EvalRunResult {
  evalId: string;
  title: string;
  query: string;
  expectedAnswer: string;
  actualAnswer: string;
  score: number; // 0 - 100
  passed: boolean;
  retrievalHit: boolean;
  citationCount: number;
  latencyMs: number;
  sources: Array<{ filename: string; pageNumber?: number; excerpt: string }>;
}

export interface EvalSuiteReport {
  totalTests: number;
  passedCount: number;
  averageScore: number;
  averageLatencyMs: number;
  results: EvalRunResult[];
}

// Seeds must target documents actually in the library — a seed whose answer
// lives in an unindexed document can only ever produce (or fail) a refusal.
// Grounded against verified chunk text in soli_chunks (scores 0.53–0.61).
const DEFAULT_SEEDS = [
  {
    title: "Article 14 equality guarantee",
    query: "What does Article 14 of the Constitution guarantee?",
    expectedAnswer: "Article 14 guarantees equality before the law and the equal protection of the laws within India, rejecting discrimination based on religion, race, caste, sex or place of birth.",
    category: "constitutional",
    expectedDocTitle: "Article 14 in Constitution of India",
  },
  {
    title: "Article 15 discrimination prohibition",
    query: "What does Article 15 of the Constitution prohibit?",
    expectedAnswer: "Article 15 prohibits discrimination on grounds of religion, race, caste, sex or place of birth, and bars subjecting any citizen to disability, liability or restriction on those grounds.",
    category: "constitutional",
    expectedDocTitle: "Article 15 in Constitution of India",
  },
  {
    title: "IT Act electronic audit",
    query: "What does the Information Technology Act say about audit of electronic records?",
    expectedAnswer: "Section 7A of the Information Technology Act 2000 provides that audit provisions also apply to documents, records and information processed and maintained in electronic form.",
    category: "statutes",
    expectedDocTitle: "The Information Technology Act 2000",
  },
  {
    title: "Article 20 conviction protection",
    query: "What protection does Article 20 give against conviction for offences?",
    expectedAnswer: "Article 20 provides that no person shall be convicted of any offence except for violation of a law in force at the time of commission, nor subjected to a penalty greater than what applied then.",
    category: "constitutional",
    expectedDocTitle: "Article 20 in Constitution of India",
  },
];

/**
 * Ensures default evaluation benchmarks exist in PostgreSQL.
 */
export async function ensureEvalSeeds(): Promise<void> {
  const existing = await db.select({ id: ragEvals.id }).from(ragEvals).limit(1);
  if (existing.length === 0) {
    for (const seed of DEFAULT_SEEDS) {
      await db.insert(ragEvals).values({
        title: seed.title,
        query: seed.query,
        expectedAnswer: seed.expectedAnswer,
        category: seed.category,
        expectedDocTitle: seed.expectedDocTitle,
      });
    }
  }
}

/**
 * List all eval test cases.
 */
export async function listEvalTestCases(): Promise<EvalTestCase[]> {
  await ensureEvalSeeds();
  const rows = await db.select().from(ragEvals).orderBy(desc(ragEvals.createdAt));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    query: r.query,
    expectedAnswer: r.expectedAnswer,
    category: r.category,
    expectedDocTitle: r.expectedDocTitle,
    lastScore: r.lastScore,
    lastPassed: r.lastPassed,
    lastLatencyMs: r.lastLatencyMs,
    lastResult: r.lastResult,
    lastRunAt: r.lastRunAt ? r.lastRunAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));
}

/**
 * Computes semantic lexical overlap and keyword recall between generated answer and ground truth.
 */
function evaluateGroundedness(
  actual: string,
  expected: string,
  sourcesCount: number,
): { score: number; passed: boolean } {
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3);

  const actualWords = new Set(normalize(actual));
  const expectedWords = normalize(expected);

  if (expectedWords.length === 0) return { score: 100, passed: true };

  let matched = 0;
  for (const w of expectedWords) {
    if (actualWords.has(w)) matched++;
  }

  const recall = matched / expectedWords.length;
  // Score incorporates citation presence (weight 20%) and keyword grounding (weight 80%)
  const citationBonus = sourcesCount > 0 ? 20 : 0;
  const keywordScore = Math.min(80, Math.round(recall * 100 * 0.8));
  const totalScore = Math.min(100, keywordScore + citationBonus);
  const passed = totalScore >= 60;

  return { score: totalScore, passed };
}

/**
 * Executes evaluation test cases against the current RAG pipeline.
 */
export async function runEvalSuite(evalIds?: string[]): Promise<EvalSuiteReport> {
  const allTests = await db.select().from(ragEvals);
  const testsToRun = evalIds && evalIds.length > 0
    ? allTests.filter((t) => evalIds.includes(t.id))
    : allTests;

  const results: EvalRunResult[] = [];
  let totalScore = 0;
  let passedCount = 0;
  let totalLatency = 0;

  for (const test of testsToRun) {
    const start = Date.now();
    try {
      const response = await generateRagResponse({
        question: test.query,
        limit: 5,
      });
      const latencyMs = Date.now() - start;
      totalLatency += latencyMs;

      const retrievalHit = response.sources.length > 0;
      const { score, passed } = evaluateGroundedness(
        response.answer,
        test.expectedAnswer,
        response.sources.length,
      );

      if (passed) passedCount++;
      totalScore += score;

      const evalResult: EvalRunResult = {
        evalId: test.id,
        title: test.title,
        query: test.query,
        expectedAnswer: test.expectedAnswer,
        actualAnswer: response.answer,
        score,
        passed,
        retrievalHit,
        citationCount: response.sources.length,
        latencyMs,
        sources: response.sources.map((s) => ({
          filename: s.filename,
          pageNumber: s.pageNumber,
          excerpt: s.excerpt.slice(0, 160) + "...",
        })),
      };

      results.push(evalResult);

      // Persist latest score to the database
      await db
        .update(ragEvals)
        .set({
          lastScore: score,
          lastPassed: passed ? 1 : 0,
          lastLatencyMs: latencyMs,
          lastResult: response.answer.slice(0, 500),
          lastRunAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(ragEvals.id, test.id));
    } catch (err) {
      const latencyMs = Date.now() - start;
      const evalResult: EvalRunResult = {
        evalId: test.id,
        title: test.title,
        query: test.query,
        expectedAnswer: test.expectedAnswer,
        actualAnswer: `Evaluation error: ${err instanceof Error ? err.message : String(err)}`,
        score: 0,
        passed: false,
        retrievalHit: false,
        citationCount: 0,
        latencyMs,
        sources: [],
      };
      results.push(evalResult);

      await db
        .update(ragEvals)
        .set({
          lastScore: 0,
          lastPassed: 0,
          lastLatencyMs: latencyMs,
          lastResult: "Failed execution",
          lastRunAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(ragEvals.id, test.id));
    }
  }

  const averageScore = testsToRun.length > 0 ? Math.round(totalScore / testsToRun.length) : 0;
  const averageLatencyMs = testsToRun.length > 0 ? Math.round(totalLatency / testsToRun.length) : 0;

  return {
    totalTests: testsToRun.length,
    passedCount,
    averageScore,
    averageLatencyMs,
    results,
  };
}
