import levenshtein from "fast-levenshtein";

export type CompareStatus = "added" | "removed" | "unchanged" | "possible_match";
export type ResultRow = { title: string; status: CompareStatus; matchTitle?: string; };
export type CompareOutput = {
  summary: { added: number; removed: number; unchanged: number; possibleMatches: number; };
  results: ResultRow[];
  debug: { previousTitles: string[]; currentTitles: string[]; };
};

const STOP_PHRASES = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday","am","pm","abc","fox","cw","schedule","week","programming","closed captioning"];

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeShowTitle(value: string): string {
  return normalizeWhitespace(
    value.toLowerCase()
      .replace(/[|•·]/g, " ")
      .replace(/[()[\]{}]/g, " ")
      .replace(/\bhd\b/g, " ")
      .replace(/\bnew\b/g, " ")
      .replace(/\bencore\b/g, " ")
      .replace(/\bepisode\b/g, " ")
      .replace(/\bep\.?\b/g, " ")
      .replace(/[^a-z0-9:&'\- ]/g, " ")
  );
}

function looksLikeTimeOrNoise(line: string): boolean {
  const trimmed = line.trim().toLowerCase();
  if (!trimmed || trimmed.length < 3) return true;
  if (/^\d{1,2}:\d{2}\s?(am|pm)?$/.test(trimmed)) return true;
  if (/^\d{1,2}\s?(am|pm)$/.test(trimmed)) return true;
  if (/^page\s+\d+/i.test(trimmed)) return true;
  if (/^\d+$/.test(trimmed)) return true;
  if (STOP_PHRASES.includes(trimmed)) return true;
  if (/^(tv-pg|tv-g|tv-14|cc|stereo)$/i.test(trimmed)) return true;
  return false;
}

function titleCase(value: string): string {
  return value.split(" ").filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

export function extractShowTitles(text: string): string[] {
  const lines = text.split(/\r?\n/).map((line) => normalizeWhitespace(line)).filter(Boolean);
  const candidates = new Map<string, string>();

  for (const line of lines) {
    if (looksLikeTimeOrNoise(line)) continue;
    if (line.length > 90) continue;
    const normalized = normalizeShowTitle(line);
    if (!normalized || normalized.length < 3) continue;
    if (normalized.split(" ").length > 9) continue;
    if (!candidates.has(normalized)) candidates.set(normalized, titleCase(line.trim()));
  }

  return Array.from(candidates.entries()).sort((a, b) => a[1].localeCompare(b[1])).map((entry) => entry[1]);
}

function findPossibleMatch(title: string, others: string[], used: Set<string>): string | undefined {
  const normalizedTitle = normalizeShowTitle(title);
  let best: { value: string; score: number } | null = null;

  for (const other of others) {
    if (used.has(other)) continue;
    const normalizedOther = normalizeShowTitle(other);
    if (normalizedTitle === normalizedOther) return other;

    const distance = levenshtein.get(normalizedTitle, normalizedOther);
    const maxLen = Math.max(normalizedTitle.length, normalizedOther.length) || 1;
    const score = 1 - distance / maxLen;
    const tokenOverlap = normalizedTitle.split(" ").filter((token) => token && normalizedOther.includes(token)).length;

    if (!(score >= 0.72 || (score >= 0.6 && tokenOverlap >= 2))) continue;
    if (!best || score > best.score) best = { value: other, score };

  return best?.value;
}

export function compareInventories(previousTitles: string[], currentTitles: string[]): CompareOutput {
  const prevNormalized = new Map(previousTitles.map((title) => [normalizeShowTitle(title), title]));
  const currNormalized = new Map(currentTitles.map((title) => [normalizeShowTitle(title), title]));

  const results: ResultRow[] = [];
  const matchedCurrent = new Set<string>();

  for (const previous of previousTitles) {
    const exact = currNormalized.get(normalizeShowTitle(previous));
    if (exact) {
      results.push({ title: previous, status: "unchanged" });
      matchedCurrent.add(exact);
      continue;
    }

    const possible = findPossibleMatch(previous, currentTitles, matchedCurrent);
    if (possible) {
      results.push({ title: previous, status: "possible_match", matchTitle: possible });
      matchedCurrent.add(possible);
    } else {
      results.push({ title: previous, status: "removed" });
    }
  }

  for (const current of currentTitles) {
    if (matchedCurrent.has(current)) continue;
    const existsInPrevious = prevNormalized.has(normalizeShowTitle(current));
    if (!existsInPrevious) results.push({ title: current, status: "added" });
  }

  results.sort((a, b) => {
    const order = { added: 0, removed: 1, possible_match: 2, unchanged: 3 };
    return order[a.status] - order[b.status] || a.title.localeCompare(b.title);
  });

  return {
    summary: {
      added: results.filter((r) => r.status === "added").length,
      removed: results.filter((r) => r.status === "removed").length,
      unchanged: results.filter((r) => r.status === "unchanged").length,
      possibleMatches: results.filter((r) => r.status === "possible_match").length,
    },
    results,
    debug: { previousTitles, currentTitles },
  };
}
