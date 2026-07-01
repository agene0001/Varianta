<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
// @ts-ignore - vue3-chessboard has no types
import { TheChessboard } from 'vue3-chessboard';
import 'vue3-chessboard/style.css';
import { Chess } from 'chess.js';
import { opponent, outcome, type Game } from '../composables/useGames';
import {
  getGameAnalysis,
  analyzeGame,
  evalLabel,
  whiteBarPct,
  CONCEPT_LABELS,
  CONCEPT_ICONS,
  type MoveAnalysis,
} from '../composables/useAnalysis';

const props = defineProps<{ game: Game }>();
const emit = defineEmits<{ (e: 'back'): void }>();

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const analyses = ref<MoveAnalysis[] | null>(null);
const selected = ref(-1); // -1 = starting position
const loading = ref(false);
const error = ref('');

const boardArea = ref<HTMLElement | null>(null);
const boardPx = ref(440);
let resizeObserver: ResizeObserver | null = null;

function updateBoardSize() {
  const el = boardArea.value;
  if (!el) return;
  // Fit the board to BOTH the available width (column minus eval bar 24 + gap 10)
  // and the available height (viewport below the board's top, minus a margin),
  // capped at 900 — so it never clips horizontally into the moves or vertically.
  const availWidth = el.clientWidth - 34;
  // Reserve ~60px below the board for the "best move" note + a bottom margin.
  const availHeight = window.innerHeight - el.getBoundingClientRect().top - 60;
  boardPx.value = Math.max(200, Math.min(900, availWidth, availHeight));
}

onMounted(async () => {
  resizeObserver = new ResizeObserver(updateBoardSize);
  if (boardArea.value) resizeObserver.observe(boardArea.value);
  window.addEventListener('resize', updateBoardSize); // ResizeObserver misses height-only changes
  updateBoardSize();
  try {
    analyses.value = await getGameAnalysis(props.game.id);
    if (analyses.value?.length) selected.value = 0;
  } catch (e) {
    error.value = String(e);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  window.removeEventListener('resize', updateBoardSize);
});

async function onAnalyze() {
  loading.value = true;
  error.value = '';
  try {
    analyses.value = await analyzeGame(props.game.id);
    selected.value = analyses.value.length ? 0 : -1;
  } catch (e) {
    error.value = String(e);
  } finally {
    loading.value = false;
  }
}

// Advance the selection to the next mistake/blunder (wraps around).
function nextMistake() {
  const list = analyses.value;
  if (!list?.length) return;
  for (let off = 1; off <= list.length; off++) {
    const i = (selected.value + off + list.length) % list.length;
    if (list[i].severity === 'mistake' || list[i].severity === 'blunder') {
      selected.value = i;
      return;
    }
  }
}

// The engine's best move in SAN (e.g. "e4"), converted from UCI via chess.js.
function bestSan(a: MoveAnalysis): string {
  try {
    const c = new Chess(a.fen);
    const m = c.move({
      from: a.best_uci.slice(0, 2),
      to: a.best_uci.slice(2, 4),
      promotion: a.best_uci.slice(4) || undefined,
    });
    return m?.san ?? a.best_uci;
  } catch {
    return a.best_uci;
  }
}

const current = computed(() =>
  selected.value >= 0 && analyses.value ? analyses.value[selected.value] : null,
);

function squares(uci: string): [string, string] {
  return [uci.slice(0, 2), uci.slice(2, 4)];
}

// Every move shows the RESULTING position, so navigating always advances exactly
// one ply. On a mistake/blunder we additionally draw arrows from the moving
// piece's origin: green = engine's best move, red = the move actually played.
// (Driven onto the live board via the API in a watcher — reactive-config does
// not apply fen updates here.)
const boardView = computed(() => {
  const c = current.value;
  if (!c) return { fen: START_FEN, shapes: [] as Array<Record<string, string>> };
  const fen = c.fen_after || c.fen;
  if (c.severity === 'mistake' || c.severity === 'blunder') {
    const [bo, bd] = squares(c.best_uci);
    const [po, pd] = squares(c.played_uci);
    return {
      fen,
      shapes: [
        { orig: bo, dest: bd, brush: 'green' },
        { orig: po, dest: pd, brush: 'red' },
      ],
    };
  }
  return { fen, shapes: [] as Array<Record<string, string>> };
});

// Which step of the previewed engine line is on the board (null = the selection).
const previewIndex = ref<number | null>(null);

// The engine's recommended continuation for the current mistake, played out from
// the position before the move into clickable SAN steps.
const pvLine = computed(() => {
  const c = current.value;
  if (!c?.best_line?.length) return [];
  if (c.severity !== 'mistake' && c.severity !== 'blunder') return [];
  const chess = new Chess(c.fen);
  const steps: { san: string; fen: string; prefix: string; orig: string; dest: string }[] = [];
  for (let i = 0; i < c.best_line.length; i++) {
    const uci = c.best_line[i];
    const whiteToMove = chess.turn() === 'w';
    const moveNo = chess.moveNumber();
    let m;
    try {
      m = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.slice(4) || undefined,
      });
    } catch {
      break;
    }
    steps.push({
      san: m.san,
      fen: chess.fen(),
      prefix: whiteToMove ? `${moveNo}.` : i === 0 ? `${moveNo}…` : '',
      orig: uci.slice(0, 2),
      dest: uci.slice(2, 4),
    });
  }
  return steps;
});

function togglePreview(i: number) {
  previewIndex.value = previewIndex.value === i ? null : i;
}

// What the board actually shows: a previewed line step if one is active, else the
// selected move's position.
const displayView = computed(() => {
  const i = previewIndex.value;
  const step = i !== null ? pvLine.value[i] : null;
  if (step) {
    return { fen: step.fen, shapes: [{ orig: step.orig, dest: step.dest, brush: 'blue' }] };
  }
  return boardView.value;
});

// Only the initial config; live updates go through the API below.
const boardConfig = computed<any>(() => ({
  fen: boardView.value.fen,
  orientation: props.game.player_color,
  viewOnly: true,
  coordinates: true,
  drawable: { enabled: false },
}));

let boardApi: any = null;

function applyBoardView() {
  if (!boardApi) return;
  boardApi.setPosition(displayView.value.fen);
  boardApi.setShapes(displayView.value.shapes);
}

function onBoardCreated(api: any) {
  boardApi = api;
  applyBoardView();
}

watch(displayView, applyBoardView);
// Leaving a mistake drops any previewed line so the next move starts clean.
watch(selected, () => {
  previewIndex.value = null;
});

const barPct = computed(() => (current.value ? whiteBarPct(current.value) : 50));
const evalText = computed(() => (current.value ? evalLabel(current.value) : '0.0'));

const annotation: Record<string, string> = {
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
};

const outcomeLabel: Record<string, string> = {
  win: 'Win',
  loss: 'Loss',
  draw: 'Draw',
  unknown: '—',
};

interface MoveRow {
  no: number;
  white?: MoveAnalysis;
  whiteIdx?: number;
  black?: MoveAnalysis;
  blackIdx?: number;
}

// Group the flat ply list into (number, white, black) rows for a standard move list.
const movePairs = computed<MoveRow[]>(() => {
  const list = analyses.value ?? [];
  const rows: MoveRow[] = [];
  list.forEach((m, i) => {
    const no = Math.ceil(m.ply / 2);
    const last = rows[rows.length - 1];
    if (m.ply % 2 === 1) {
      rows.push({ no, white: m, whiteIdx: i });
    } else if (last && last.no === no && last.black === undefined && last.white) {
      last.black = m;
      last.blackIdx = i;
    } else {
      rows.push({ no, black: m, blackIdx: i });
    }
  });
  return rows;
});
</script>

<template>
  <section class="detail">
    <header class="detail-header">
      <button class="back-btn" @click="emit('back')">← Games</button>
      <div class="detail-title">
        <span class="players">{{ game.white }} – {{ game.black }}</span>
        <span class="result-badge" :class="outcome(game)">
          {{ outcomeLabel[outcome(game)] }} vs {{ opponent(game) }}
        </span>
      </div>
      <div v-if="analyses?.length" class="header-actions">
        <button class="analyze-btn" @click="nextMistake">Next mistake ›</button>
        <button class="analyze-btn" :disabled="loading" @click="onAnalyze">
          {{ loading ? 'Analyzing…' : 'Re-analyze' }}
        </button>
      </div>
    </header>

    <p v-if="error" class="detail-error">{{ error }}</p>

    <div class="detail-body">
      <div class="board-column">
        <div ref="boardArea" class="board-area">
          <div class="eval-bar" :style="{ height: boardPx + 'px' }" :title="evalText">
            <div class="eval-fill" :style="{ height: barPct + '%' }"></div>
            <span class="eval-text" :class="{ light: barPct < 50 }">{{ evalText }}</span>
          </div>
          <div
            class="board-wrap"
            :style="{ width: boardPx + 'px', height: boardPx + 'px', '--bpx': boardPx + 'px' }"
          >
            <!-- reactive-config (no :key) so navigating updates the LIVE board:
                 chessground animates/highlights the single move instead of remounting
                 (a remount snapped to a fresh position with nothing to track). Resize
                 is handled by --bpx + chessground's own ResizeObserver. -->
            <TheChessboard :board-config="boardConfig" @board-created="onBoardCreated" />
          </div>
        </div>

        <!-- Best-move note under the board (so it's always visible, not buried below
             the scrolling move list). Only shown when the played move wasn't best. -->
        <div
          v-if="current && (current.severity === 'mistake' || current.severity === 'blunder')"
          class="best-move"
        >
          Best was <code>{{ bestSan(current) }}</code>
          <span class="cp-loss">(−{{ (current.cp_loss / 100).toFixed(1) }})</span>
          <span
            v-for="c in current.concepts"
            :key="c"
            class="concept-chip"
          >{{ CONCEPT_LABELS[c] }}</span>
        </div>

        <!-- Engine's recommended line — click a move to step the board through it. -->
        <div v-if="pvLine.length" class="pv-line">
          <span class="pv-label">Line</span>
          <span
            v-for="(s, i) in pvLine"
            :key="i"
            class="pv-move"
            :class="{ active: previewIndex === i }"
            @click="togglePreview(i)"
          ><span v-if="s.prefix" class="pv-num">{{ s.prefix }}</span>{{ s.san }}</span>
        </div>
      </div>

      <aside class="moves-panel">
        <div v-if="loading" class="analyzing">Analyzing with Stockfish…</div>

        <div v-else-if="!analyses" class="not-analyzed">
          <p>This game hasn't been analyzed yet.</p>
          <button class="analyze-btn primary" @click="onAnalyze">Analyze game</button>
          <p class="hint">Runs Stockfish over every move — a few seconds to a minute.</p>
        </div>

        <template v-else>
          <div class="move-list">
            <div
              v-for="row in movePairs"
              :key="(row.whiteIdx ?? row.blackIdx)!"
              class="move-row"
            >
              <span class="movenum">{{ row.no }}.</span>
              <span
                v-if="row.white"
                class="ply"
                :class="[row.white.severity, { selected: selected === row.whiteIdx }]"
                @click="selected = row.whiteIdx!"
              >
                {{ row.white.san
                }}<span v-if="annotation[row.white.severity]" class="annot">{{
                  annotation[row.white.severity]
                }}</span><span
                  v-for="c in row.white.concepts"
                  :key="c"
                  class="concept-mark"
                  :title="CONCEPT_LABELS[c]"
                  >{{ CONCEPT_ICONS[c] }}</span>
              </span>
              <span v-else class="ply empty"></span>
              <span
                v-if="row.black"
                class="ply"
                :class="[row.black.severity, { selected: selected === row.blackIdx }]"
                @click="selected = row.blackIdx!"
              >
                {{ row.black.san
                }}<span v-if="annotation[row.black.severity]" class="annot">{{
                  annotation[row.black.severity]
                }}</span><span
                  v-for="c in row.black.concepts"
                  :key="c"
                  class="concept-mark"
                  :title="CONCEPT_LABELS[c]"
                  >{{ CONCEPT_ICONS[c] }}</span>
              </span>
              <span v-else class="ply empty"></span>
            </div>
          </div>
        </template>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.detail {
  padding: 20px;
  color: var(--text-primary);
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 18px;
}

.back-btn {
  background: var(--btn-bg);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
  font-weight: 600;
}

.detail-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.players {
  font-family: 'Outfit', sans-serif;
  font-weight: 600;
}

.result-badge {
  font-size: 12px;
  color: var(--text-secondary);
}

.result-badge.win {
  color: var(--accent-green);
}

.result-badge.loss {
  color: #ff8a8a;
}

.header-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.analyze-btn {
  background: var(--btn-bg);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  border-radius: 8px;
  padding: 7px 16px;
  font-weight: 600;
  cursor: pointer;
}

.analyze-btn.primary {
  background: var(--grad-primary);
  color: #05060d;
  border: none;
}

.analyze-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.detail-error {
  color: #ff8a8a;
  background: rgba(220, 38, 38, 0.12);
  border: 1px solid rgba(220, 38, 38, 0.4);
  border-radius: 8px;
  padding: 10px 12px;
}

.detail-body {
  /* Two independent grid tracks — the board column and the moves column can
     never overlap, regardless of how the board sizes itself. */
  display: grid;
  grid-template-columns: minmax(0, 934px) minmax(280px, 380px);
  gap: 20px;
  align-items: start;
  justify-content: center;
}

/* Stack the moves under the board when too narrow for two columns. */
@media (max-width: 780px) {
  .detail-body {
    grid-template-columns: minmax(0, 934px);
  }
}

.board-column {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.board-area {
  display: flex;
  gap: 10px;
  min-width: 0;
}

.eval-bar {
  position: relative;
  flex: none;
  width: 24px;
  background: #05060d;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
}

.eval-fill {
  position: absolute;
  bottom: 0;
  width: 100%;
  background: #e6ecff;
  transition: height 0.2s ease;
}

.eval-text {
  position: absolute;
  bottom: 4px;
  width: 100%;
  text-align: center;
  font-size: 10px;
  font-weight: 700;
  color: #05060d;
}

.eval-text.light {
  bottom: auto;
  top: 4px;
  color: #e6ecff;
}

.board-wrap {
  flex: none;
  overflow: hidden;
}

/* vue3-chessboard sizes the board ~90vh (off the viewport height), ignoring our
   box and overflowing. Force its elements to the container size via an explicit
   px custom property (--bpx) — percentages collapsed the board, px doesn't. */
.board-wrap :deep(.main-board) {
  width: var(--bpx);
  height: var(--bpx);
  padding-bottom: 0;
}

.board-wrap :deep(.cg-wrap) {
  width: var(--bpx);
  height: var(--bpx);
}

.moves-panel {
  min-width: 0;
  max-height: 480px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.not-analyzed,
.analyzing {
  color: var(--text-secondary);
  text-align: center;
  padding: 32px 12px;
}

.hint {
  color: var(--text-muted);
  font-size: 12px;
  margin-top: 8px;
}

.move-list {
  margin: 0;
  padding: 0 4px 0 0;
  min-height: 0;
  overflow-y: auto;
}

.move-row {
  display: grid;
  grid-template-columns: 2.4em 1fr 1fr;
  align-items: center;
  gap: 4px;
}

.movenum {
  color: var(--text-muted);
  font-size: 12px;
  text-align: right;
}

.ply {
  text-align: left;
  padding: 3px 6px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
}

.ply:hover:not(.empty) {
  background: var(--bg-card-hover);
}

.ply.selected {
  background: var(--btn-bg);
  outline: 1px solid var(--border-bright);
}

.ply.empty {
  cursor: default;
}

.annot {
  font-weight: 700;
  margin-left: 2px;
}

.ply.inaccuracy .annot {
  color: #e0c200;
}

.ply.mistake .annot {
  color: #ff9f43;
}

.ply.blunder .annot {
  color: #ff5050;
}

.concept-mark {
  margin-left: 3px;
  font-size: 0.82em;
  cursor: help;
  vertical-align: middle;
}

.best-move {
  margin-top: 0;
  padding: 10px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.best-move code {
  color: var(--accent-green);
}

.cp-loss {
  color: #ff8a8a;
  margin-left: 4px;
}

.pv-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  padding: 8px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 13px;
}

.pv-label {
  color: var(--text-muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-right: 2px;
}

.pv-move {
  cursor: pointer;
  padding: 1px 5px;
  border-radius: 5px;
  color: var(--text-primary);
  white-space: nowrap;
}

.pv-move:hover {
  background: var(--bg-card-hover);
}

.pv-move.active {
  background: var(--grad-primary);
  color: #05060d;
  font-weight: 700;
}

.pv-num {
  color: var(--text-muted);
  margin-right: 3px;
}

.pv-move.active .pv-num {
  color: #05060d;
}

.concept-chip {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 138, 138, 0.14);
  border: 1px solid rgba(255, 138, 138, 0.35);
  color: #ffb3b3;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
</style>
