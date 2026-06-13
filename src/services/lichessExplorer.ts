/**
 * Opening explorer service.
 *
 * Lichess locked their public explorer endpoint behind authentication, so chessdb.cn
 * is the default (no key required, engine eval + estimated winrate per move).
 * If VITE_LICHESS_TOKEN is set, the Lichess endpoint is used instead — that source
 * gives real game statistics (white wins / draws / black wins / total games).
 */

const LICHESS_TOKEN = import.meta.env.VITE_LICHESS_TOKEN as string | undefined;

export type ExplorerSource = "lichess" | "masters" | "chessdb";

export interface ExplorerMove {
  uci: string;
  san: string;
  /** Estimated win rate from White's perspective (0–100). */
  winrate: number;
  /** Total games at this position (Lichess sources only). */
  total?: number;
  /** White wins (Lichess sources only). */
  white?: number;
  /** Draws (Lichess sources only). */
  draws?: number;
  /** Black wins (Lichess sources only). */
  black?: number;
  /** Centipawn-ish engine eval, White's perspective (chessdb only). */
  score?: number;
  /** chessdb annotation: 2=best, 1=ok, 0=dubious. */
  rank?: number;
  /** Annotation string from chessdb (e.g. "! (20-05)"). */
  note?: string;
}

export interface ExplorerResponse {
  source: ExplorerSource;
  moves: ExplorerMove[];
  /** Total games at this position (Lichess sources only). */
  total?: number;
  opening?: { eco: string; name: string } | null;
}

export function getDefaultSource(): ExplorerSource {
  return LICHESS_TOKEN ? "lichess" : "chessdb";
}

export function isLichessAvailable(): boolean {
  return Boolean(LICHESS_TOKEN);
}

/** Fetch the explorer for a given FEN. */
export async function getExplorerForFen(
  fen: string,
  source: ExplorerSource = getDefaultSource(),
  signal?: AbortSignal,
): Promise<ExplorerResponse> {
  if (source === "chessdb") return fetchChessdb(fen, signal);
  if (!LICHESS_TOKEN) {
    throw new Error(
      "Lichess explorer requires VITE_LICHESS_TOKEN (free at https://lichess.org/account/oauth/token). Using chessdb instead.",
    );
  }
  return fetchLichess(fen, source, signal);
}

// ── chessdb.cn ───────────────────────────────────────────────
interface ChessdbMove {
  uci: string;
  san: string;
  score: number;
  rank: number;
  note: string;
  winrate: string;
}
interface ChessdbResponse {
  status: string;
  moves?: ChessdbMove[];
  ply?: number;
}

async function fetchChessdb(fen: string, signal?: AbortSignal): Promise<ExplorerResponse> {
  const url = `https://www.chessdb.cn/cdb.php?action=queryall&board=${encodeURIComponent(fen)}&json=1`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`chessdb error ${res.status}`);
  const data = (await res.json()) as ChessdbResponse;
  if (data.status !== "ok" || !data.moves) {
    return { source: "chessdb", moves: [], opening: null };
  }
  return {
    source: "chessdb",
    moves: data.moves.map((m) => ({
      uci: m.uci,
      san: m.san,
      winrate: Number(m.winrate),
      score: m.score,
      rank: m.rank,
      note: m.note,
    })),
    opening: null,
  };
}

// ── Lichess (optional, requires token) ───────────────────────
interface LichessMove {
  uci: string;
  san: string;
  white: number;
  draws: number;
  black: number;
  averageRating?: number;
}
interface LichessRaw {
  white: number;
  draws: number;
  black: number;
  moves: LichessMove[];
  opening?: { eco: string; name: string } | null;
}

async function fetchLichess(
  fen: string,
  source: "lichess" | "masters",
  signal?: AbortSignal,
): Promise<ExplorerResponse> {
  const params = new URLSearchParams({
    fen,
    moves: "12",
    topGames: "0",
    recentGames: "0",
  });
  const res = await fetch(`https://explorer.lichess.ovh/${source}?${params.toString()}`, {
    signal,
    headers: LICHESS_TOKEN ? { Authorization: `Bearer ${LICHESS_TOKEN}` } : {},
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Lichess token rejected (401). Check VITE_LICHESS_TOKEN.");
    if (res.status === 429) throw new Error("Rate limited by Lichess. Wait a moment and try again.");
    throw new Error(`Lichess explorer error ${res.status}`);
  }
  const raw = (await res.json()) as LichessRaw;
  const total = raw.white + raw.draws + raw.black;
  return {
    source,
    total,
    moves: raw.moves.map((m) => {
      const moveTotal = m.white + m.draws + m.black;
      const whitePct = moveTotal ? (m.white + m.draws / 2) / moveTotal : 0.5;
      return {
        uci: m.uci,
        san: m.san,
        winrate: whitePct * 100,
        total: moveTotal,
        white: m.white,
        draws: m.draws,
        black: m.black,
      };
    }),
    opening: raw.opening ?? null,
  };
}
