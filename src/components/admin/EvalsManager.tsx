"use client";

import { useState } from "react";
import type { EvalSuiteReport, EvalTestCase } from "@/server/evals";

interface Props {
  initialTests: EvalTestCase[];
}

export default function EvalsManager({ initialTests }: Props) {
  const [tests, setTests] = useState<EvalTestCase[]>(initialTests);
  const [report, setReport] = useState<EvalSuiteReport | null>(null);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"benchmarks" | "results">("benchmarks");
  const [showAddModal, setShowAddModal] = useState(false);

  // New test case form state
  const [newTitle, setNewTitle] = useState("");
  const [newQuery, setNewQuery] = useState("");
  const [newExpected, setNewExpected] = useState("");
  const [newCategory, setNewCategory] = useState("statutes");
  const [newDocTitle, setNewDocTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);

  const handleRunAll = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/admin/evals/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data: EvalSuiteReport = await res.json();
        setReport(data);
        setActiveTab("results");
        // Refresh test case list to reflect updated scores
        const ref = await fetch("/api/admin/evals");
        if (ref.ok) {
          const refData = await ref.json();
          setTests(refData.testCases);
        }
      } else {
        alert("Evaluation run failed.");
      }
    } catch (e) {
      alert(`Error running evaluations: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunning(false);
    }
  };

  const handleAddTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/evals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          query: newQuery,
          expectedAnswer: newExpected,
          category: newCategory,
          expectedDocTitle: newDocTitle || undefined,
        }),
      });
      if (res.ok) {
        const { testCase } = await res.json();
        setTests((prev) => [testCase, ...prev]);
        setShowAddModal(false);
        setNewTitle("");
        setNewQuery("");
        setNewExpected("");
        setNewDocTitle("");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create benchmark");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTest = async (id: string) => {
    if (!confirm("Are you sure you want to delete this eval benchmark?")) return;
    const res = await fetch(`/api/admin/evals/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTests((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const avgScore = tests.length > 0
    ? Math.round(
        tests.reduce((acc, t) => acc + (t.lastScore ?? 0), 0) /
          (tests.filter((t) => t.lastScore !== null).length || 1),
      )
    : 0;

  const passedTests = tests.filter((t) => t.lastPassed === 1).length;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-xl border border-black/[0.08] bg-black/[0.02] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-h2 font-semibold">RAG Product Evals & Benchmarks</h2>
            <p className="mt-1 text-body-sm text-foreground/60">
              Run automated faithfulness, citation precision, and retrieval recall benchmarks against your legal knowledge engine.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-lg border border-black/10 bg-background px-3 py-2 text-sm font-medium transition hover:bg-black/[0.04]"
            >
              + Add Benchmark
            </button>
            <button
              onClick={handleRunAll}
              disabled={running}
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
            >
              {running ? "Running Benchmarks..." : "⚡ Run Eval Suite"}
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-black/5 bg-background p-3.5 shadow-sm">
            <div className="text-xs text-foreground/50">Total Benchmarks</div>
            <div className="mt-1 text-2xl font-semibold">{tests.length}</div>
          </div>
          <div className="rounded-lg border border-black/5 bg-background p-3.5 shadow-sm">
            <div className="text-xs text-foreground/50">Average Score</div>
            <div className={`mt-1 text-2xl font-semibold ${avgScore >= 70 ? "text-emerald-600" : "text-amber-600"}`}>
              {avgScore}%
            </div>
          </div>
          <div className="rounded-lg border border-black/5 bg-background p-3.5 shadow-sm">
            <div className="text-xs text-foreground/50">Passed Tests</div>
            <div className="mt-1 text-2xl font-semibold text-emerald-600">
              {passedTests} / {tests.length}
            </div>
          </div>
          <div className="rounded-lg border border-black/5 bg-background p-3.5 shadow-sm">
            <div className="text-xs text-foreground/50">Latest Run State</div>
            <div className="mt-1 text-sm font-medium text-foreground/75">
              {running ? "Executing..." : report ? "Complete" : "Ready to evaluate"}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-black/[0.08]">
        <button
          onClick={() => setActiveTab("benchmarks")}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
            activeTab === "benchmarks"
              ? "border-foreground text-foreground"
              : "border-transparent text-foreground/50 hover:text-foreground"
          }`}
        >
          Benchmarks ({tests.length})
        </button>
        <button
          onClick={() => setActiveTab("results")}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
            activeTab === "results"
              ? "border-foreground text-foreground"
              : "border-transparent text-foreground/50 hover:text-foreground"
          }`}
        >
          Latest Run Report {report ? `(${report.passedCount}/${report.totalTests})` : ""}
        </button>
      </div>

      {/* Benchmarks List */}
      {activeTab === "benchmarks" && (
        <div className="space-y-3">
          {tests.map((test) => (
            <div
              key={test.id}
              className="rounded-lg border border-black/[0.08] bg-background p-4 shadow-sm transition hover:border-black/20"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-black/[0.06] px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-foreground/70">
                    {test.category}
                  </span>
                  <h3 className="font-medium text-foreground">{test.title}</h3>
                </div>
                <div className="flex items-center gap-3">
                  {test.lastScore !== null && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        (test.lastScore ?? 0) >= 60
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-rose-500/10 text-rose-600"
                      }`}
                    >
                      Score: {test.lastScore}% {test.lastLatencyMs ? `· ${test.lastLatencyMs}ms` : ""}
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteTest(test.id)}
                    className="text-xs text-rose-500/70 hover:text-rose-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-2 text-sm text-foreground/80">
                <span className="font-medium text-foreground/60">Query: </span>
                {test.query}
              </div>
              <div className="mt-1 text-xs text-foreground/60">
                <span className="font-medium">Expected: </span>
                {test.expectedAnswer}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results View */}
      {activeTab === "results" && (
        <div className="space-y-4">
          {!report && (
            <div className="rounded-xl border border-dashed border-black/15 p-12 text-center text-foreground/60">
              No evaluation run completed in this session yet. Click <strong>⚡ Run Eval Suite</strong> above to benchmark your RAG pipeline.
            </div>
          )}

          {report && (
            <>
              <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 p-4 text-emerald-800">
                <div>
                  <div className="text-sm font-semibold">Evaluation Run Completed</div>
                  <div className="text-xs opacity-80">
                    {report.passedCount} of {report.totalTests} tests met groundedness threshold. Average Score: {report.averageScore}% · Avg Latency: {report.averageLatencyMs}ms
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {report.results.map((res) => {
                  const isExpanded = expandedResult === res.evalId;
                  return (
                    <div
                      key={res.evalId}
                      className="rounded-lg border border-black/[0.08] bg-background p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              res.passed
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-rose-500/10 text-rose-600"
                            }`}
                          >
                            {res.passed ? "PASSED" : "FAILED"} ({res.score}%)
                          </span>
                          <span className="font-medium">{res.title}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-foreground/60">
                          <span>{res.latencyMs}ms</span>
                          <span>{res.citationCount} citations</span>
                          <button
                            onClick={() => setExpandedResult(isExpanded ? null : res.evalId)}
                            className="font-medium text-foreground underline"
                          >
                            {isExpanded ? "Hide Details" : "View Answers"}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 space-y-3 border-t border-black/[0.06] pt-3 text-sm">
                          <div>
                            <div className="text-xs font-semibold uppercase text-foreground/50">Model Generated Answer:</div>
                            <div className="mt-1 rounded bg-black/[0.02] p-2.5 text-foreground/85">
                              {res.actualAnswer}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-semibold uppercase text-foreground/50">Ground Truth Reference:</div>
                            <div className="mt-1 rounded bg-black/[0.02] p-2.5 text-foreground/70">
                              {res.expectedAnswer}
                            </div>
                          </div>
                          {res.sources.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold uppercase text-foreground/50">Cited Sources:</div>
                              <div className="mt-1 space-y-1">
                                {res.sources.map((s, idx) => (
                                  <div key={idx} className="rounded border border-black/5 p-2 text-xs">
                                    <span className="font-medium">{s.filename}</span>
                                    {s.pageNumber ? ` · Page ${s.pageNumber}` : ""}
                                    <div className="mt-0.5 text-foreground/60 italic">{s.excerpt}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Add Benchmark Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-black/10 bg-background p-6 shadow-xl">
            <h3 className="text-h3 font-semibold">New RAG Evaluation Benchmark</h3>
            <p className="mt-1 text-xs text-foreground/60">
              Define a test prompt and its grounded reference answer to continuously verify retrieval accuracy.
            </p>
            <form onSubmit={handleAddTest} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground/70">Benchmark Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Article 21 Right to Privacy"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="mt-1 w-full rounded-md border border-black/15 bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/70">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="mt-1 w-full rounded-md border border-black/15 bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                >
                  <option value="constitutional">Constitutional</option>
                  <option value="statutes">Statutes & Codes</option>
                  <option value="case-law">Case Law Precedents</option>
                  <option value="general">General Diligence</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/70">Query / Question</label>
                <textarea
                  required
                  rows={2}
                  placeholder="The prompt to send to the RAG pipeline..."
                  value={newQuery}
                  onChange={(e) => setNewQuery(e.target.value)}
                  className="mt-1 w-full rounded-md border border-black/15 bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/70">Expected Ground Truth Answer</label>
                <textarea
                  required
                  rows={3}
                  placeholder="The factual statements the answer must contain..."
                  value={newExpected}
                  onChange={(e) => setNewExpected(e.target.value)}
                  className="mt-1 w-full rounded-md border border-black/15 bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/70">Expected Document Title (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Constitution of India"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  className="mt-1 w-full rounded-md border border-black/15 bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                />
              </div>
              <div className="mt-5 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium hover:bg-black/[0.04]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Benchmark"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
