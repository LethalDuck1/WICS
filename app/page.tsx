"use client";

import { useMemo, useRef, useState } from "react";

type UploadedFileSlot = "previous" | "current";
type FileState = { file: File | null; name: string; sizeLabel: string; status: "idle" | "ready" | "processing" | "done" | "error"; error?: string; };
type ResultRow = { title: string; status: "added" | "removed" | "unchanged" | "possible_match"; matchTitle?: string; };
type CompareResponse = {
  summary: { added: number; removed: number; unchanged: number; possibleMatches: number; };
  results: ResultRow[];
};

const emptyFileState: FileState = { file: null, name: "", sizeLabel: "", status: "idle" };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function badgeClass(status: ResultRow["status"]): string {
  if (status === "added") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  if (status === "removed") return "border-red-400/20 bg-red-400/10 text-red-200";
  if (status === "unchanged") return "border-sky-400/20 bg-sky-400/10 text-sky-200";
  return "border-yellow-400/20 bg-yellow-400/10 text-yellow-100";
}

function labelFor(status: ResultRow["status"]): string {
  if (status === "possible_match") return "Possible Match";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function UploadCard({ title, subtitle, state, onFile, onClear }: { title: string; subtitle: string; state: FileState; onFile: (file: File | null) => void; onClear: () => void; }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(fileList: FileList | null) {
    const file = fileList?.[0] ?? null;
    if (!file) return;
    onFile(file);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      className={["relative rounded-[28px] border p-5 transition", dragging ? "border-yellow-400/50 bg-yellow-400/10" : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"].join(" ")}
    >
      <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-white/55">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white/55">PDF</div>
      </div>

      {!state.file ? (
        <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-[240px] w-full flex-col items-center justify-center rounded-[24px] border border-dashed border-white/15 bg-black/20 px-6 text-center transition hover:border-yellow-400/40 hover:bg-yellow-400/5">
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-3xl">{title.toLowerCase().includes("previous") ? "🗃️" : "📺"}</div>
          <div className="text-lg font-medium text-white">Drop PDF here or click to browse</div>
          <div className="mt-2 max-w-sm text-sm text-white/50">Built for two files at a time with no AI and low-cost deployment in mind.</div>
        </button>
      ) : (
        <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-base font-medium text-white">{state.name}</div>
              <div className="mt-1 text-sm text-white/50">{state.sizeLabel}</div>
            </div>
            <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-medium text-yellow-100">{state.status}</div>
          </div>
          {state.error ? <p className="mt-4 text-sm text-red-300">{state.error}</p> : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => inputRef.current?.click()} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10">Replace</button>
            <button type="button" onClick={onClear} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/5">Clear</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [files, setFiles] = useState<Record<UploadedFileSlot, FileState>>({ previous: emptyFileState, current: emptyFileState });
  const [isComparing, setIsComparing] = useState(false);
  const [compareError, setCompareError] = useState("");
  const [results, setResults] = useState<CompareResponse | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | ResultRow["status"]>("all");

  function setFile(slot: UploadedFileSlot, file: File | null) {
    if (!file) return setFiles((prev) => ({ ...prev, [slot]: emptyFileState }));
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    setFiles((prev) => ({
      ...prev,
      [slot]: { file, name: file.name, sizeLabel: formatBytes(file.size), status: isPdf ? "ready" : "error", error: isPdf ? undefined : "Only PDF files are supported." },
    }));
    setResults(null);
    setCompareError("");
  }

  const canCompare = useMemo(() => Boolean(files.previous.file && files.current.file && files.previous.status !== "error" && files.current.status !== "error" && !isComparing), [files, isComparing]);
  const filteredResults = useMemo(() => !results ? [] : activeFilter === "all" ? results.results : results.results.filter((row) => row.status === activeFilter), [results, activeFilter]);

  async function handleCompare() {
    if (!canCompare || !files.previous.file || !files.current.file) return;
    setIsComparing(true);
    setCompareError("");
    setResults(null);
    try {
      const formData = new FormData();
      formData.append("previous", files.previous.file);
      formData.append("current", files.current.file);
      const response = await fetch("/api/compare", { method: "POST", body: formData });
      if (!response.ok) throw new Error(await response.text() || "Comparison failed.");
      setResults(await response.json());
    } catch (error) {
      setCompareError(error instanceof Error ? error.message : "Something went wrong while comparing the files.");
    } finally {
      setIsComparing(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(234,179,8,0.10),_transparent_30%),linear-gradient(180deg,_#090909_0%,_#050505_100%)] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10 lg:py-10">
        <div className="mb-8 flex flex-col gap-4 rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] lg:flex-row lg:items-end lg:justify-between lg:p-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-yellow-200">Broadcast Inventory Compare</div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">Compare two weekly schedule PDFs without making the workflow complicated.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">Upload the previous and current week files, extract the show inventory, and instantly see what was added, removed, unchanged, or potentially renamed.</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] lg:p-6">
            <div className="mb-5 flex flex-col gap-2 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Upload Workspace</h2>
                <p className="mt-1 text-sm text-white/55">Two files in, one clean comparison out.</p>
              </div>
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200">Node 20 fixed</div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <UploadCard title="Previous Week" subtitle="Upload the older schedule PDF." state={files.previous} onFile={(file) => setFile("previous", file)} onClear={() => setFile("previous", null)} />
              <UploadCard title="Current Week" subtitle="Upload the newer schedule PDF." state={files.current} onFile={(file) => setFile("current", file)} onClear={() => setFile("current", null)} />
            </div>

            <div className="mt-6 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-black/20 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-sm font-medium text-white">Comparison Engine</div>
                <div className="mt-1 text-sm text-white/50">Normalizes titles, compares unique shows, and flags close matches.</div>
              </div>
              <button type="button" onClick={handleCompare} disabled={!canCompare} className="rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40">{isComparing ? "Comparing Files..." : "Compare Files"}</button>
            </div>

            {compareError ? <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{compareError}</div> : null}
          </section>

          <aside className="grid gap-6">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6">
              <h3 className="text-xl font-semibold text-white">What this version includes</h3>
              <div className="mt-4 space-y-3 text-sm text-white/65">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">Real upload handling</div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">API route comparison</div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">Possible-match review state</div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">Pinned for Netlify Node 20</div>
              </div>
            </section>
          </aside>
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5"><div className="text-xs uppercase tracking-[0.14em] text-white/45">Added</div><div className="mt-3 text-4xl font-bold">{results?.summary.added ?? 0}</div></div>
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5"><div className="text-xs uppercase tracking-[0.14em] text-white/45">Removed</div><div className="mt-3 text-4xl font-bold">{results?.summary.removed ?? 0}</div></div>
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5"><div className="text-xs uppercase tracking-[0.14em] text-white/45">Unchanged</div><div className="mt-3 text-4xl font-bold">{results?.summary.unchanged ?? 0}</div></div>
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5"><div className="text-xs uppercase tracking-[0.14em] text-white/45">Possible Match</div><div className="mt-3 text-4xl font-bold">{results?.summary.possibleMatches ?? 0}</div></div>
        </section>

        <section className="mt-6 rounded-[32px] border border-white/10 bg-white/[0.03] p-5 lg:p-6">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Comparison Results</h2>
              <p className="mt-1 text-sm text-white/55">Filter results after each compare.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "added", "removed", "unchanged", "possible_match"] as const).map((filter) => (
                <button key={filter} type="button" onClick={() => setActiveFilter(filter)} className={["rounded-2xl border px-4 py-2 text-sm font-medium transition", activeFilter === filter ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-100" : "border-white/10 bg-black/20 text-white/65 hover:bg-white/5"].join(" ")}>{filter === "all" ? "All" : filter === "possible_match" ? "Possible Match" : labelFor(filter)}</button>
              ))}
            </div>
          </div>

          {!results ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 text-center">
              <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-3xl">📊</div>
              <div className="text-lg font-medium text-white">No comparison run yet</div>
            </div>
          ) : (
            <div className="mt-5 grid gap-3">
              {filteredResults.length === 0 ? (
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-sm text-white/55">No rows match the selected filter.</div>
              ) : (
                filteredResults.map((row, index) => (
                  <div key={`${row.title}-${index}`} className="flex flex-col gap-4 rounded-[24px] border border-white/10 bg-black/20 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-white">{row.title}</div>
                      {row.matchTitle ? <div className="mt-1 truncate text-sm text-white/50">Possible match: {row.matchTitle}</div> : null}
                    </div>
                    <div className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(row.status)}`}>{labelFor(row.status)}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
