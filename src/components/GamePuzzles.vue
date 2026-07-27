<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Chess } from 'chess.js';
import ChessBoard from './ChessBoard.vue';
import {
  CONCEPT_LABELS,
  CONCEPT_ICONS,
  CONCEPT_THEMES,
  fetchLichessPuzzle,
  type Concept,
  type MoveAnalysis,
} from '../composables/useAnalysis';
import { opponent, type Game } from '../composables/useGames';

const props = defineProps<{ analyses: MoveAnalysis[]; game: Game }>();
const emit = defineEmits<{ (e: 'exit'): void }>();

// A normalized puzzle the solver understands, from either source.
type Pz = {
  fen: string;
  best_line: string[]; // solver plays the even-indexed moves
  side: 'white' | 'black';
  concepts: Concept[];
  source: 'game' | 'lichess';
  ply?: number;
  played_uci?: string;
  cp_loss?: number;
  rating?: number;
};

// ── Source A: this game's mistakes ─────────────────────────────
const gamePuzzles = computed<Pz[]>(() =>
  props.analyses
    .filter((a) => (a.severity === 'mistake' || a.severity === 'blunder') && a.best_line?.length)
    .map((a) => ({
      fen: a.fen,
      best_line: a.best_line,
      side: a.side,
      concepts: a.concepts,
      source: 'game',
      ply: a.ply,
      played_uci: a.played_uci,
      cp_loss: a.cp_loss,
    })),
);
const index = ref(0);

// ── Source B: Lichess theme drill ──────────────────────────────
const mode = ref<'game' | 'lichess'>('game');
const lichessConcept = ref<Concept | null>(null);
const lichessPuzzle = ref<Pz | null>(null);
const lichessLoading = ref(false);
const lichessError = ref('');
const drillSolved = ref(0);
const drillDone = ref(0);

// Concepts from this game that Lichess can serve puzzles for.
const drillableConcepts = computed(() => {
  const seen = new Set<Concept>();
  for (const p of gamePuzzles.value) {
    for (const c of p.concepts) if (CONCEPT_THEMES[c]) seen.add(c);
  }
  return [...seen];
});

const puzzle = computed<Pz | null>(() =>
  mode.value === 'lichess' ? lichessPuzzle.value : gamePuzzles.value[index.value] ?? null,
);
const solverColor = computed<'white' | 'black'>(() => puzzle.value?.side ?? 'white');

// ── Solving state ──────────────────────────────────────────────
type Status = 'solving' | 'wrong' | 'solved' | 'revealed';
const status = ref<Status>('solving');
const stepIndex = ref(0); // index into best_line of the next move to find
const attempts = ref(0);
const results = ref<Record<number, 'solved' | 'failed'>>({}); // game mode, by index

let boardApi: any = null;
let sim = new Chess(); // mirrors the board, for UCI→SAN of replies
const isReplaying = ref(false);

const solvedCount = computed(
  () => Object.values(results.value).filter((r) => r === 'solved').length,
);
const attempted = computed(() => Object.keys(results.value).length);
const revealDone = computed(() => status.value === 'solved' || status.value === 'revealed');

const prompt = computed(() => {
  if (lichessLoading.value) return 'Loading puzzle…';
  if (lichessError.value) return 'Could not load a puzzle';
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

// Reload whenever the active puzzle changes (index, mode, or a new Lichess fetch).
watch(puzzle, loadPuzzle);

function recordResult(r: 'solved' | 'failed') {
  if (mode.value === 'game') {
    if (!(index.value in results.value)) {
      results.value = { ...results.value, [index.value]: r };
    }
  } else {
    drillDone.value++;
    if (r === 'solved') drillSolved.value++;
  }
}

function finishSolved() {
  status.value = 'solved';
  recordResult(attempts.value === 0 ? 'solved' : 'failed');
}

function onMove(move: any) {
  if (isReplaying.value) return; // our own reply move
  if (status.value !== 'solving') {
    setTimeout(() => boardApi?.undoLastMove(), 40); // snap back moves during feedback
    return;
  }
  const p = puzzle.value;
  if (!p) return;
  const userUci = move.from + move.to + (move.promotion ?? '');
  if (userUci === p.best_line[stepIndex.value]) {
    sim.move({ from: move.from, to: move.to, promotion: move.promotion });
    boardApi?.setShapes([]);
    stepIndex.value++;
    if (stepIndex.value >= p.best_line.length) finishSolved();
    else setTimeout(playReply, 430);
  } else {
    status.value = 'wrong';
    attempts.value++;
    setTimeout(() => {
      boardApi?.undoLastMove();
      if (status.value === 'wrong') status.value = 'solving';
    }, 450);
  }
}

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
  if (mode.value === 'lichess') {
    loadLichess();
    return;
  }
  if (index.value < gamePuzzles.value.length - 1) index.value++;
}
function prev() {
  if (mode.value === 'game' && index.value > 0) index.value--;
}
function restart() {
  loadPuzzle();
}

// ── Lichess drill ──────────────────────────────────────────────
async function startLichessDrill(c: Concept) {
  if (!CONCEPT_THEMES[c]) return;
  lichessConcept.value = c;
  mode.value = 'lichess';
  drillSolved.value = 0;
  drillDone.value = 0;
  await loadLichess();
}

async function loadLichess() {
  const c = lichessConcept.value;
  const theme = c ? CONCEPT_THEMES[c] : null;
  if (!theme) return;
  lichessLoading.value = true;
  lichessError.value = '';
  try {
    const raw = await fetchLichessPuzzle(theme);
    // The puzzle position is reached by playing the entire PGN; the side then to
    // move is the solver, and solution[0] is the solver's first move.
    const board = new Chess();
    for (const san of raw.pgn.split(' ').filter(Boolean)) board.move(san);
    lichessPuzzle.value = {
      fen: board.fen(),
      best_line: raw.solution,
      side: board.turn() === 'w' ? 'white' : 'black',
      concepts: c ? [c] : [],
      source: 'lichess',
      rating: raw.rating,
    };
  } catch (e) {
    lichessError.value = String(e);
  } finally {
    lichessLoading.value = false;
  }
}

function exitLichessDrill() {
  mode.value = 'game';
  lichessPuzzle.value = null;
  lichessConcept.value = null;
  lichessError.value = '';
}

// ── Display helpers ────────────────────────────────────────────
const playedSan = computed(() => {
  const p = puzzle.value;
  if (!p?.played_uci) return '';
  try {
    return new Chess(p.fen).move({
      from: p.played_uci.slice(0, 2),
      to: p.played_uci.slice(2, 4),
      promotion: p.played_uci.slice(4) || undefined,
    }).san;
  } catch {
    return p.played_uci;
  }
});

// Short pattern name for a drill button ("Missed a fork" → "fork").
function drillLabel(c: Concept): string {
  return CONCEPT_LABELS[c].replace(/^Missed (a |an )?/i, '').replace(/^Hangs a piece$/i, 'hanging piece');
}
</script>

<template>
  <section class="puzzles">
    <header class="pz-header">
      <button v-if="mode === 'lichess'" class="pz-back" @click="exitLichessDrill">
        ← Game puzzles
      </button>
      <button v-else class="pz-back" @click="emit('exit')">← Analysis</button>

      <div v-if="mode === 'lichess'" class="pz-title">
        Drill: {{ lichessConcept ? drillLabel(lichessConcept) : '' }} · Lichess
      </div>
      <div v-else class="pz-title">Mistake trainer — {{ game.white }} vs {{ game.black }}</div>

      <div v-if="mode === 'lichess'" class="pz-progress">
        <span v-if="puzzle?.rating">rating {{ puzzle.rating }} · </span>solved
        {{ drillSolved }}/{{ drillDone }}
      </div>
      <div v-else-if="gamePuzzles.length" class="pz-progress">
        Puzzle {{ index + 1 }} / {{ gamePuzzles.length }} · solved {{ solvedCount }}
      </div>
    </header>

    <div v-if="!gamePuzzles.length" class="pz-empty">
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

        <div v-if="lichessError" class="pz-error">{{ lichessError }}</div>

        <div v-if="mode === 'game'" class="pz-context">
          Move {{ Math.ceil((puzzle?.ply ?? 0) / 2) }} · vs {{ opponent(game) }}
        </div>
        <div v-else class="pz-context">Lichess puzzle · drilling {{ lichessConcept ? drillLabel(lichessConcept) : '' }}</div>

        <!-- Concepts are a hint, so only reveal them once solved/shown (game mode). -->
        <div v-if="mode === 'game' && revealDone && puzzle?.concepts.length" class="pz-concepts">
          <span v-for="c in puzzle!.concepts" :key="c" class="pz-chip">
            {{ CONCEPT_ICONS[c] }} {{ CONCEPT_LABELS[c] }}
          </span>
        </div>

        <div v-if="mode === 'game' && revealDone && puzzle?.played_uci" class="pz-played">
          In the game you played <code>{{ playedSan }}</code>, losing
          <span class="pz-loss">{{ ((puzzle!.cp_loss ?? 0) / 100).toFixed(1) }}</span>.
        </div>

        <div class="pz-controls">
          <button class="pz-btn" :disabled="status !== 'solving'" @click="hint">Hint</button>
          <button class="pz-btn" :disabled="revealDone" @click="reveal">Reveal</button>
          <button class="pz-btn" @click="restart">Restart</button>
        </div>
        <div class="pz-nav">
          <button
            v-if="mode === 'game'"
            class="pz-btn"
            :disabled="index === 0"
            @click="prev"
          >
            ‹ Prev
          </button>
          <button
            class="pz-btn primary"
            :disabled="mode === 'game' && index >= gamePuzzles.length - 1"
            @click="next"
          >
            {{ mode === 'lichess' ? 'New puzzle ›' : 'Next ›' }}
          </button>
        </div>

        <div
          v-if="mode === 'game' && attempted >= gamePuzzles.length"
          class="pz-summary"
        >
          Done — solved {{ solvedCount }} of {{ gamePuzzles.length }} first try.
        </div>

        <!-- Drill the same patterns beyond this game, from Lichess's tagged DB. -->
        <div v-if="mode === 'game' && drillableConcepts.length" class="pz-drills">
          <div class="pz-drills-label">Drill this pattern on Lichess</div>
          <div class="pz-drills-btns">
            <button
              v-for="c in drillableConcepts"
              :key="c"
              class="pz-btn drill"
              @click="startLichessDrill(c)"
            >
              {{ CONCEPT_ICONS[c] }} {{ drillLabel(c) }}
            </button>
          </div>
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

.pz-error {
  color: #ff8a8a;
  font-size: 13px;
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

.pz-drills {
  margin-top: 6px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.pz-drills-label {
  color: var(--text-muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.pz-drills-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pz-btn.drill {
  flex: 0 0 auto;
  text-transform: capitalize;
}

@media (max-width: 780px) {
  .pz-body {
    grid-template-columns: minmax(0, 560px);
  }
}
</style>
