const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const MODEL = (import.meta.env.VITE_GEMINI_MODEL as string | undefined) || "gemini-3.5-flash";

export function isGeminiConfigured(): boolean {
  return Boolean(API_KEY && API_KEY.trim());
}

export interface MoveDescriptionRequest {
  openingName: string;
  variationName: string;
  moves: string[];
  userColor: "white" | "black";
}

export async function generateMoveDescriptions(req: MoveDescriptionRequest): Promise<string[]> {
  if (!isGeminiConfigured()) {
    throw new Error("Gemini API key not set. Add VITE_GEMINI_API_KEY to your .env file.");
  }

  const numbered = req.moves
    .map((san, i) => {
      const moveColor = i % 2 === 0 ? "white" : "black";
      const whoseTurn = moveColor === req.userColor ? "PLAYER" : "OPPONENT";
      return `${i + 1}. ${san} (${moveColor}, ${whoseTurn})`;
    })
    .join("\n");

  const prompt = `You are a chess coach narrating an opening repertoire line for a student.

Opening: ${req.openingName}
Variation: ${req.variationName}
Student plays: ${req.userColor}

Write one terse, instructive sentence for each move in the sequence below.

Voice rules:
- When it is the PLAYER's move: instruct the student on what to play and the strategic reason. Example voice: "Black defended e4 with Nc3. Play the flexible Najdorf move (a6) to prevent pieces from landing on b5."
- When it is the OPPONENT's move: narrate what just happened from the student's perspective. Example voice: "Black mirrors your bishop development." or "White grabbed space with e5."
- Keep each description to one sentence. No hedging, no preamble, no markdown.

Moves:
${numbered}

Return ONLY a JSON array of exactly ${req.moves.length} strings, one description per move in order.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.6,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned an empty response.");

  let descriptions: unknown;
  try {
    descriptions = JSON.parse(text);
  } catch {
    throw new Error("Gemini response was not valid JSON.");
  }

  if (!Array.isArray(descriptions) || descriptions.length !== req.moves.length) {
    throw new Error(
      `Expected ${req.moves.length} descriptions, got ${(descriptions as any[])?.length ?? 0}.`,
    );
  }

  return descriptions.map((d) => String(d));
}

// ── Mechanical fallback ──────────────────────────────────────────
const PIECE_NAMES: Record<string, string> = {
  K: "king",
  Q: "queen",
  R: "rook",
  B: "bishop",
  N: "knight",
};

export function generateMechanicalDescriptions(
  moves: string[],
  userColor: "white" | "black",
): string[] {
  return moves.map((san, i) => describeSan(san, i, userColor));
}

function describeSan(san: string, moveIndex: number, _userColor: "white" | "black"): string {
  const moveColor = moveIndex % 2 === 0 ? "White" : "Black";
  if (san === "O-O") return `${moveColor} castles kingside.`;
  if (san === "O-O-O") return `${moveColor} castles queenside.`;

  const isCheckmate = san.endsWith("#");
  const isCheck = san.endsWith("+");
  const clean = san.replace(/[+#!?]+$/, "");

  const match = clean.match(/^([KQRBN])?([a-h]?[1-8]?)(x?)([a-h][1-8])(?:=([QRBN]))?$/);
  if (!match) return `${moveColor} plays ${san}.`;

  const [, piece, , capture, dest, promo] = match;
  const pieceName = piece ? PIECE_NAMES[piece] : "pawn";
  const verb = capture ? "captures on" : "moves to";
  let desc = `${moveColor}'s ${pieceName} ${verb} ${dest}`;
  if (promo) desc += `, promoting to ${PIECE_NAMES[promo]}`;
  if (isCheckmate) desc += ". Checkmate!";
  else if (isCheck) desc += ", check.";
  else desc += ".";
  return desc;
}
