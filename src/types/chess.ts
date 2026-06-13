export type ChessPosition = string;

export interface MoveStep {
  san: string;
  description?: string; // shown in Learn mode after this move is played
}

export interface Line {
  name: string;
  description: string;
  moves: MoveStep[];
}

/** Tree node for one move - branches represent variations from this position. */
export interface TreeMove {
  san: string;
  description?: string;
  /** Name of this variation (e.g. "Main Line", "Hungarian Defense") - on the first move of a branch */
  lineName?: string;
  /** Description of this variation */
  lineDescription?: string;
  /** Child moves - empty/undefined = leaf (end of line) */
  variations?: TreeMove[];
}

export interface Opening {
  id: string;
  name: string;
  description: string;
  lines: Line[];
}

export interface ChessMove {
  from: string;
  to: string;
  piece: string;
  captured?: string;
  promotion?: string;
  castle?: "kingside" | "queenside";
  enPassant?: boolean;
}

export interface GameState {
  position: ChessPosition;
  toMove: "white" | "black";
  castlingRights: {
    whiteKingside: boolean;
    whiteQueenside: boolean;
    blackKingside: boolean;
    blackQueenside: boolean;
  };
  enPassantSquare: string | null;
  halfmoveClock: number;
  fullmoveNumber: number;
}
