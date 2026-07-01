<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Chess } from 'chess.js';
import ChessBoard from './ChessBoard.vue';
import { CONCEPT_LABELS, CONCEPT_ICONS, type MoveAnalysis } from '../composables/useAnalysis';
import { opponent, type Game } from '../composables/useGames';

const props = defineProps<{ analyses: MoveAnalysis[]; game: Game }>();
const emit = defineEmits<{ (e: 'exit'): void }>();

// A mistake with a stored engine line becomes a puzzle: solve from the position
// you faced, playing the moves Stockfish recommended.
const puzzles = computed(() =>
  props.analyses.filter(
    (a) => (a.severity === 'mistake' || a.severity === 'blunder') && a.best_line?.length,
  ),
);

const index = ref(0);
const puzzle = computed<MoveAnalysis | null>(() => puzzles.value[index.value] ?? null);
const solverColor = computed<'white' | 'black'>(() => puzzle.value?.side ?? 'white');

type Status = 'solving' | 'wrong' | 'solved' | 'revealed';
const status = ref<Status>('solving');
const stepIndex = ref(0); // index into best_line of the next move the solver must find
const attempts = ref(0);
const results = ref<Record<number, 'solved' | 'failed'>>({});

let boardApi: any = null;
let sim = new Chess(); // mirrors the board position, for UCI→SAN of replies
const isReplaying = ref(false);

const solvedCount = computed(
  () => Object.values(results.value).filter((r) => r === 'solved').length,
);
const attempted = computed(() => Object.keys(results.value).length);

const prompt = computed(() => {
  switch (status.value) {
    case 'solved':
      return 'Solved ✓';
    case 'revealed':
      return 'Solution shown';
    case 'wrong':
      return 'Not the best — try again';
    default:
      return `Find the best move for ${solverColor.value === 'white' ? 'White' : 'Black'}`;
  }
});

function loadPuzzle() {
  const p = puzzle.value;
  if (!p || !boardApi) return;
  sim = new Chess(p.fen);
  boardApi.setPosition(p.fen);
  boardApi.setShapes([]);
  stepIndex.value = 0;
  attempts.value = 0;
  status.value = 'solving';
}

function onBoardCreated(api: any) {
  boardApi = api;
  loadPuzzle();
}

watch(index, loadPuzzle);

function recordResult(r: 'solved' | 'failed') {
  if (!(index.value in results.value)) {
    results.value = { ...results.value, [index.value]: r };
  }
}

function finishSolved() {
  status.value = 'solved';
  recordResult(attempts.value === 0 ? 'solved' : 'failed');
}

function onMove(move: any) {
  if (isReplaying.value) return; // our own reply move
  if (status.value !== 'solving') {
    // A move made while feedback is showing — snap it back.
    setTimeout(() => boardApi?.undoLastMove(), 40);
    return;
  }
  const p = puzzle.value;
  if (!p) return;
  const userUci = move.from + move.to + (move.promotion ?? '');
  if (userUci === p.best_line[stepIndex.value]) {
    sim.move({ from: move.from, to: move.to, promotion: move.promotion });
    boardApi?.setShapes([]);
    stepIndex.value++;
    if (stepIndex.value >= p.best_line.length) {
      finishSolved();
    } else {
      setTimeout(playReply, 430);
    }
  } else {
    status.value = 'wrong';
    attempts.value++;
    setTimeout(() => {
      boardApi?.undoLastMove();
      if (status.value === 'wrong') status.value = 'solving';
    }, 450);
  }
}

// Play the opponent's reply (odd steps of the line) programmatically.
function playReply() {
  const p = puzzle.value;
  if (!p || !boardApi) return;
  const uci = p.best_line[stepIndex.value];
  if (!uci) return;
  let m;
  try {
    m = sim.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
  } catch {
    return;
  }
  isReplaying.value = true;
  boardApi.move(m.san);
  isReplaying.value = false;
  stepIndex.value++;
  if (stepIndex.value >= p.best_line.length) finishSolved();
}

function hint() {
  const p = puzzle.value;
  if (!p || !boardApi || status.value !== 'solving') return;
  // Circle the piece to move — a nudge, not the full answer.
  boardApi.setShapes([{ orig: p.best_line[stepIndex.value].slice(0, 2), brush: 'green' }]);
}

function reveal() {
  const p = puzzle.value;
  if (!p || !boardApi) return;
  recordResult('failed');
  status.value = 'revealed';
  boardApi.setShapes([]);
  playRemaining();
}

function playRemaining() {
  const p = puzzle.value;
  if (!p || stepIndex.value >= p.best_line.length) return;
  const uci = p.best_line[stepIndex.value];
  let m;
  try {
    m = sim.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
  } catch {
    return;
  }
  isReplaying.value = true;
  boardApi.move(m.san);
  isReplaying.value = false;
  stepIndex.value++;
  if (stepIndex.value < p.best_line.length) setTimeout(playRemaining, 550);
}

function next() {
  if (index.value < puzzles.value.length - 1) index.value++;
}
function prev() {
  if (index.value > 0) index.value--;
}
function restart() {
  loadPuzzle();
}

// The move actually played in the game, in SAN (shown after solving/revealing).
const playedSan = computed(() => {
  const p = puzzle.value;
  if (!p) return '';
  try {
    const c = new Chess(p.fen);
    return c.move({
      from: p.played_uci.slice(0, 2),
      to: p.played_uci.slice(2, 4),
      promotion: p.played_uci.slice(4) || undefined,
    }).san;
  } catch {
    return p.played_uci;
  }
});

const revealDone = computed(() => status.value === 'solved' || status.value === 'revealed');
</script>

<template>
  <section class="puzzles">
    <header class="pz-header">
      <button class="pz-back" @click="emit('exit')">← Analysis</button>
      <div class="pz-title">Mistake trainer — {{ game.white }} vs {{ game.black }}</div>
      <div v-if="puzzles.length" class="pz-progress">
        Puzzle {{ index + 1 }} / {{ puzzles.length }} · solved {{ solvedCount }}
      </div>
    </header>

    <div v-if="!puzzles.length" class="pz-empty">
      <p>No trainable mistakes in this game.</p>
      <p class="pz-hint-text">
        Either you played cleanly, or this analysis predates stored engine lines —
        re-analyze the game and try again.
      </p>
      <button class="pz-btn primary" @click="emit('exit')">Back to analysis</button>
    </div>

    <div v-else class="pz-body">
      <div class="pz-board-col">
        <ChessBoard
          :orientation="solverColor"
          :player-color="solverColor"
          @board-created="onBoardCreated"
          @move="onMove"
        />
      </div>

      <aside class="pz-panel">
        <div class="pz-prompt" :class="status">{{ prompt }}</div>

        <div class="pz-context">
          Move {{ Math.ceil(puzzle!.ply / 2) }} · vs {{ opponent(game) }}
        </div>

        <!-- Concepts are a hint, so only reveal them once solved/shown. -->
        <div v-if="revealDone && puzzle!.concepts.length" class="pz-concepts">
          <span v-for="c in puzzle!.concepts" :key="c" class="pz-chip">
            {{ CONCEPT_ICONS[c] }} {{ CONCEPT_LABELS[c] }}
          </span>
        </div>

        <div v-if="revealDone" class="pz-played">
          In the game you played <code>{{ playedSan }}</code>, losing
          <span class="pz-loss">{{ (puzzle!.cp_loss / 100).toFixed(1) }}</span>.
        </div>

        <div class="pz-controls">
          <button class="pz-btn" :disabled="status !== 'solving'" @click="hint">Hint</button>
          <button class="pz-btn" :disabled="revealDone" @click="reveal">Reveal</button>
          <button class="pz-btn" @click="restart">Restart</button>
        </div>
        <div class="pz-nav">
          <button class="pz-btn" :disabled="index === 0" @click="prev">‹ Prev</button>
          <button
            class="pz-btn primary"
            :disabled="index >= puzzles.length - 1"
            @click="next"
          >
            Next ›
          </button>
        </div>

        <div v-if="attempted >= puzzles.length" class="pz-summary">
          Done — solved {{ solvedCount }} of {{ puzzles.length }} first try.
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.puzzles {
  padding: 20px;
  color: var(--text-primary);
}

.pz-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 18px;
}

.pz-back {
  background: var(--btn-bg);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
}

.pz-title {
  font-family: 'Outfit', sans-serif;
  font-weight: 600;
}

.pz-progress {
  margin-left: auto;
  color: var(--text-muted);
  font-size: 13px;
}

.pz-empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.pz-hint-text {
  color: var(--text-muted);
  font-size: 13px;
}

.pz-body {
  display: grid;
  grid-template-columns: minmax(0, 560px) minmax(260px, 340px);
  gap: 24px;
  justify-content: center;
}

.pz-board-col {
  display: flex;
  justify-content: center;
}

.pz-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pz-prompt {
  font-size: 16px;
  font-weight: 600;
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
}

.pz-prompt.wrong {
  color: #ff8a8a;
  border-color: rgba(255, 80, 80, 0.4);
}

.pz-prompt.solved {
  color: var(--accent-green);
  border-color: rgba(0, 245, 184, 0.4);
}

.pz-prompt.revealed {
  color: #e0c200;
}

.pz-context {
  color: var(--text-muted);
  font-size: 13px;
}

.pz-concepts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pz-chip {
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(255, 138, 138, 0.14);
  border: 1px solid rgba(255, 138, 138, 0.35);
  color: #ffb3b3;
  font-size: 12px;
  font-weight: 600;
}

.pz-played {
  font-size: 13px;
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px 12px;
}

.pz-played code {
  color: var(--accent-green);
}

.pz-loss {
  color: #ff8a8a;
  font-weight: 600;
}

.pz-controls,
.pz-nav {
  display: flex;
  gap: 8px;
}

.pz-btn {
  flex: 1;
  background: var(--btn-bg);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
}

.pz-btn:hover:not(:disabled) {
  background: var(--btn-bg-hover, var(--bg-card-hover));
}

.pz-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pz-btn.primary {
  background: var(--grad-primary);
  color: #05060d;
  border-color: transparent;
  font-weight: 700;
}

.pz-summary {
  margin-top: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(0, 245, 184, 0.1);
  border: 1px solid rgba(0, 245, 184, 0.3);
  color: var(--accent-green);
  font-size: 13px;
}

@media (max-width: 780px) {
  .pz-body {
    grid-template-columns: minmax(0, 560px);
  }
}
</style>
