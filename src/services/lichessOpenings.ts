export interface LichessOpening {
  e: string;
  n: string;
  m: string[];
}

let cache: LichessOpening[] | null = null;
let loadPromise: Promise<LichessOpening[]> | null = null;

export async function loadLichessOpenings(): Promise<LichessOpening[]> {
  if (cache) return cache;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const res = await fetch("/lichess-openings.json");
    if (!res.ok) throw new Error(`Failed to load openings library (${res.status})`);
    const raw = (await res.json()) as LichessOpening[];

    // Lichess ships multiple entries with the same name at different move depths
    // (e.g. "Stafford Gambit" appears as a 6-move stub and an 8-move extension).
    // Keep only the longest version of each (ECO+name) pair so the importer shows
    // each named variation once with its full canonical move sequence.
    const byKey = new Map<string, LichessOpening>();
    for (const o of raw) {
      const key = `${o.e}|${o.n}`;
      const existing = byKey.get(key);
      if (!existing || o.m.length > existing.m.length) {
        byKey.set(key, o);
      }
    }
    cache = Array.from(byKey.values());
    return cache;
  })();
  return loadPromise;
}

export async function searchOpenings(query: string, limit = 60): Promise<LichessOpening[]> {
  const all = await loadLichessOpenings();
  const q = query.trim().toLowerCase();
  if (!q) return all.slice(0, limit);
  const matches: LichessOpening[] = [];
  for (const o of all) {
    if (o.n.toLowerCase().includes(q)) {
      matches.push(o);
      if (matches.length >= limit) break;
    }
  }
  return matches;
}
