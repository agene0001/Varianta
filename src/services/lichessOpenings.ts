export interface LichessOpening {
  e: string;
  n: string;
  m: string[];
}

let cache: LichessOpening[] | null = null;
let rawCache: LichessOpening[] | null = null;
let rawPromise: Promise<LichessOpening[]> | null = null;

/**
 * Every entry exactly as shipped, including the same-name variants that
 * [`loadLichessOpenings`] collapses. Book detection wants all of them: two
 * entries can share an ECO and a name while following different move sequences,
 * and dropping one loses positions that really are theory.
 */
async function loadRawOpenings(): Promise<LichessOpening[]> {
  if (rawCache) return rawCache;
  if (rawPromise) return rawPromise;
  rawPromise = (async () => {
    const res = await fetch("/lichess-openings.json");
    if (!res.ok) throw new Error(`Failed to load openings library (${res.status})`);
    rawCache = (await res.json()) as LichessOpening[];
    return rawCache;
  })();
  return rawPromise;
}

export async function loadLichessOpenings(): Promise<LichessOpening[]> {
  if (cache) return cache;
  const raw = await loadRawOpenings();

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
}

/**
 * Key a FEN by position only, dropping the halfmove clock and fullmove number.
 *
 * This is what makes transposition matching work: 1.d4 e6 2.e4 d5 and
 * 1.e4 e6 2.d4 d5 reach the same position but with different move counters, so
 * comparing whole FENs (or move sequences) would treat them as unrelated.
 */
export function positionKey(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

let bookPositions: Set<string> | null = null;
let bookPositionsPromise: Promise<Set<string>> | null = null;

/**
 * Every position reachable by a named opening, for "is this still theory?"
 * checks.
 *
 * Built by replaying the opening database through chess.js, which takes ~0.5s,
 * so it is computed once on first use and cached for the session. The move lists
 * are walked as a trie so each shared prefix is replayed once rather than once
 * per opening containing it — 8.4k moves instead of 35.7k, and about twice as
 * fast for an identical result.
 */
export async function loadBookPositions(): Promise<Set<string>> {
  if (bookPositions) return bookPositions;
  if (bookPositionsPromise) return bookPositionsPromise;
  bookPositionsPromise = (async () => {
    const { Chess } = await import("chess.js");
    const openings = await loadRawOpenings();

    type Node = Map<string, Node>;
    const root: Node = new Map();
    for (const o of openings) {
      let node = root;
      for (const san of o.m) {
        let next = node.get(san);
        if (!next) {
          next = new Map();
          node.set(san, next);
        }
        node = next;
      }
    }

    const fens = new Set<string>();
    const chess = new Chess();
    const walk = (node: Node) => {
      for (const [san, child] of node) {
        try {
          chess.move(san);
        } catch {
          continue; // skip a malformed entry rather than abandoning the walk
        }
        fens.add(positionKey(chess.fen()));
        walk(child);
        chess.undo();
      }
    };
    walk(root);

    bookPositions = fens;
    return fens;
  })();
  return bookPositionsPromise;
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
