// src/composables/useChessGame.ts
import { ref, computed } from "vue";
import { Chess } from "chess.js";
import type { Line } from "../types/chess";

export function useChessGame() {
  const boardAPI = ref<any>(null);
  const currentMoveIndex = ref(0);
  const selectedLine = ref<Line | null>(null);
  const practiceStatus = ref("");
  const mode = ref<"learn" | "practice" | "drill" | "time">("learn");
  
  const userColor = ref<"white" | "black">("white");
  
  // NEW: Flag to track when the computer is moving
  const isComputerMoving = ref(false); 

  const isLineComplete = computed(() => {
    return (
      selectedLine.value != null &&
      currentMoveIndex.value >= selectedLine.value.moves.length
    );
  });

  const progressPercent = computed(() => {
    if (!selectedLine.value || selectedLine.value.moves.length === 0) return 0;
    return (currentMoveIndex.value / selectedLine.value.moves.length) * 100;
  });

  const totalMoves = computed(() => selectedLine.value?.moves.length ?? 0);

  const currentDescription = computed(() => {
      if (!selectedLine.value) return "";
      
      // If the line is completely finished, give a success message 
      // (or you could return selectedLine.value.description here)
      if (currentMoveIndex.value >= selectedLine.value.moves.length) {
        return "Line complete! Great job.";
      }
  
      // Show the description for the exact move that needs to be played RIGHT NOW
      return selectedLine.value.moves[currentMoveIndex.value]?.description || "";
    });  const setBoardAPI = (api: any) => {
    boardAPI.value = api;
  };

  const startLine = (line: Line, color: "white" | "black") => {
    selectedLine.value = line;
    userColor.value = color;
    currentMoveIndex.value = 0;
    practiceStatus.value = "";
    
    if (boardAPI.value) {
      boardAPI.value.resetBoard();
      if (userColor.value === 'black') {
        setTimeout(() => playNextComputerMove(), 600);
      }
    }
  };

  const playNextComputerMove = () => {
    if (
      !selectedLine.value ||
      currentMoveIndex.value >= selectedLine.value.moves.length
    ) {
      if (isLineComplete.value) practiceStatus.value = "Line complete!";
      return;
    }

    const isWhiteTurn = currentMoveIndex.value % 2 === 0;
    const isComputerTurn = (userColor.value === 'white' && !isWhiteTurn) || 
                           (userColor.value === 'black' && isWhiteTurn);

    if (isComputerTurn) {
      const step = selectedLine.value.moves[currentMoveIndex.value];
      
      // NEW: Set flag so handleUserMove ignores the subsequent @move event
      isComputerMoving.value = true;
      boardAPI.value?.move(step.san);
      isComputerMoving.value = false;

      currentMoveIndex.value++;

      if (currentMoveIndex.value >= selectedLine.value.moves.length) {
        practiceStatus.value = "Line complete!";
      } else {
        practiceStatus.value = "Your turn";
      }
    }
  };

  /**
   * Every line in the opening being trained. Set by the caller so that a move
   * which follows a different line from the current position can be recognised
   * rather than marked wrong.
   */
  const lineOptions = ref<Line[]>([]);

  /**
   * A sibling line that reaches this exact position and plays `san` next, or
   * null. The prefix must match move for move — a line that merely contains the
   * same move later on is a different position and must not be accepted.
   *
   * Several lines usually qualify (playing ...Nc6 into the Stafford matches all
   * ten of its lines, which only diverge later). The longest is chosen: a short
   * trunk line is a strict prefix of the deeper ones, so picking it would end
   * the drill within a couple of moves, and any remaining divergence resolves
   * itself at the next fork anyway.
   */
  const findLineContinuing = (san: string): Line | null => {
    const idx = currentMoveIndex.value;
    const current = selectedLine.value;
    if (!current) return null;
    const played = current.moves.slice(0, idx);
    const candidates = lineOptions.value.filter(
      (line) =>
        line !== current &&
        line.moves.length > idx &&
        line.moves[idx].san === san &&
        played.every((step, i) => line.moves[i]?.san === step.san),
    );
    if (candidates.length === 0) return null;
    return candidates.reduce((best, line) =>
      line.moves.length > best.moves.length ? line : best,
    );
  };

  const handleUserMove = (move: any): boolean => {
      if (isComputerMoving.value) return true;
      
      const moveColor = move.color === 'w' ? 'white' : 'black';
      if (moveColor !== userColor.value) return true;
  
      if (
        !selectedLine.value ||
        currentMoveIndex.value >= selectedLine.value.moves.length
      ) {
        return false;
      }
  
      const isWhiteTurn = currentMoveIndex.value % 2 === 0;
      const isUserTurn = (userColor.value === 'white' && isWhiteTurn) || 
                         (userColor.value === 'black' && !isWhiteTurn);
  
      if (!isUserTurn) {
        // Defer the undo slightly to prevent visual glitches
        setTimeout(() => {
          boardAPI.value?.undoLastMove();
        }, 50);
        return false;
      }
  
      const expectedStep = selectedLine.value.moves[currentMoveIndex.value];

      // Several lines in an opening share a position and then diverge on *our*
      // move — Najdorf vs Dragon, Tarrasch vs Advance, the Stafford Be3 trap vs
      // its quiet treatment. Any of those moves is a legitimate thing to play,
      // so if the move continues a sibling line rather than this one, switch to
      // that line instead of rejecting it.
      const alternative =
        move.san === expectedStep.san ? null : findLineContinuing(move.san);
      if (alternative) selectedLine.value = alternative;

      if (move.san === expectedStep.san || alternative) {
        currentMoveIndex.value++;
        practiceStatus.value = alternative ? "Correct! (switched variation)" : "Correct!";

        if (currentMoveIndex.value >= selectedLine.value.moves.length) {
          practiceStatus.value = "Line complete!";
        } else {
          setTimeout(playNextComputerMove, 500);
        }
        return true;
      } else {
        practiceStatus.value = "Incorrect! Try again.";
        
        // FIX: Defer the undo to fix the "ghost piece" / desync issue
        // A 400ms delay provides a nice visual "snap back" effect
        setTimeout(() => {
          boardAPI.value?.undoLastMove();
        }, 400); 
        
        return false;
      }
    };

  const showHint = () => {
    if (!selectedLine.value || currentMoveIndex.value >= selectedLine.value.moves.length) return;
    const fen = boardAPI.value?.getFen();
    if (!fen) return;
    const tempGame = new Chess(fen);
    const expectedStep = selectedLine.value.moves[currentMoveIndex.value];
    try {
      const moveObj = tempGame.move(expectedStep.san);
      if (moveObj) {
        boardAPI.value?.setShapes([{ orig: moveObj.from, dest: moveObj.to, brush: "green" }]);
      }
    } catch (e) { console.error(e) }
  };

  const clearHint = () => boardAPI.value?.setShapes([]);

  /** Step backward one move on the board. If after the undo it would be the computer's turn,
   *  also undo the computer's previous move so the user keeps the turn. */
  const stepBack = () => {
    if (!selectedLine.value || currentMoveIndex.value <= 0) return;
    boardAPI.value?.undoLastMove();
    currentMoveIndex.value--;
    practiceStatus.value = "";
    if (currentMoveIndex.value > 0) {
      const isWhiteTurn = currentMoveIndex.value % 2 === 0;
      const isComputerTurn =
        (userColor.value === "white" && !isWhiteTurn) ||
        (userColor.value === "black" && isWhiteTurn);
      if (isComputerTurn) {
        boardAPI.value?.undoLastMove();
        currentMoveIndex.value--;
      }
    }
  };

  const resetGame = () => {
    selectedLine.value = null;
    currentMoveIndex.value = 0;
    practiceStatus.value = "";
    boardAPI.value?.resetBoard();
  };

  return {
    boardAPI,
    currentMoveIndex,
    selectedLine,
    lineOptions,
    practiceStatus,
    mode,
    isLineComplete,
    progressPercent,
    totalMoves,
    currentDescription,
    setBoardAPI,
    startLine,
    playNextComputerMove,
    handleUserMove,
    showHint,
    clearHint,
    stepBack,
    resetGame,
  };
}