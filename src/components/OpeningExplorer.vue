<template>
  <Teleport to="body">
    <div class="explorer-overlay" @click.self="handleClose">
    <div class="explorer-modal">
      <div class="explorer-header">
        <div>
          <h2 class="explorer-title">{{ title || 'Position Explorer' }}</h2>
          <p v-if="explorer?.opening" class="explorer-subtitle">
            {{ explorer.opening.eco }} · {{ explorer.opening.name }}
          </p>
          <p v-else class="explorer-subtitle">
            Play moves on the board or pick from popular continuations.
          </p>
        </div>
        <button class="close-btn" type="button" @click="handleClose">✕</button>
      </div>

      <div class="explorer-body">
        <!-- Left: board + controls -->
        <div class="board-pane">
          <div class="board-wrap">
            <TheChessboard
              :board-config="boardConfig"
              player-color="both"
              :reactive-config="true"
              :show-threats="false"
              @board-created="onBoardCreated"
              @move="onMove"
            />
          </div>

          <div class="board-controls">
            <button class="ctrl-btn" :disabled="moves.length === 0" @click="undoMove">
              <span class="ctrl-icon">↩</span> Back
            </button>
            <button class="ctrl-btn" :disabled="moves.length === 0" @click="resetBoard">
              <span class="ctrl-icon">✕</span> Reset
            </button>
            <button class="ctrl-btn" @click="flipBoard">
              <span class="ctrl-icon">⇅</span> Flip
            </button>

            <div class="source-toggle">
              <button
                v-for="opt in sourceOptions"
                :key="opt.value"
                :class="['src-btn', { active: source === opt.value }]"
                :disabled="opt.disabled"
                :title="opt.disabled ? 'Set VITE_LICHESS_TOKEN to enable' : ''"
                @click="setSource(opt.value)"
              >{{ opt.label }}</button>
            </div>
          </div>

          <!-- Current path -->
          <div class="path">
            <span class="path-label">Path:</span>
            <span v-if="moves.length === 0" class="path-empty">starting position</span>
            <span v-else class="path-moves">{{ pathDisplay }}</span>
          </div>
        </div>

        <!-- Right: explorer + save -->
        <div class="info-pane">
          <!-- Top moves -->
          <div class="moves-section">
            <div class="section-label">
              Top moves
              <span v-if="explorer?.total != null" class="total-games">
                {{ formatCount(explorer.total) }} games
              </span>
              <span v-else-if="explorer" class="total-games">{{ explorer.source }}</span>
            </div>

            <div v-if="loading" class="loading">Fetching…</div>
            <div v-else-if="apiError" class="api-error">{{ apiError }}</div>
            <div v-else-if="!explorer || explorer.moves.length === 0" class="empty">
              No games for this position.
            </div>
            <div v-else class="moves-list">
              <button
                v-for="m in explorer.moves"
                :key="m.uci"
                class="move-row"
                :class="rankClass(m)"
                @click="playSan(m.san)"
              >
                <span class="move-san">{{ m.san }}</span>
                <div v-if="hasGameSplit(m)" class="winrate-bar" :title="winrateTitle(m)">
                  <div class="bar-segment white-seg" :style="{ width: pct(m.white!, m.total!) + '%' }"></div>
                  <div class="bar-segment draw-seg" :style="{ width: pct(m.draws!, m.total!) + '%' }"></div>
                  <div class="bar-segment black-seg" :style="{ width: pct(m.black!, m.total!) + '%' }"></div>
                </div>
                <div v-else class="winrate-solid" :title="winrateTitle(m)">
                  <div class="solid-fill" :style="{ width: m.winrate + '%' }"></div>
                  <span class="solid-label">{{ m.winrate.toFixed(1) }}%</span>
                </div>
                <span class="move-count">
                  <template v-if="m.total != null">{{ formatCount(m.total) }}</template>
                  <template v-else-if="m.note">{{ m.note }}</template>
                </span>
              </button>
            </div>
          </div>

          <!-- Apply panel -->
          <div class="apply-section">
            <p class="apply-hint">
              Build the line you want, then apply to send the moves back.
            </p>
            <div class="apply-row">
              <button class="cancel-btn" type="button" @click="handleClose">Cancel</button>
              <button
                class="apply-btn"
                type="button"
                :disabled="moves.length === 0"
                @click="handleApply"
              >
                Apply {{ moves.length }} {{ moves.length === 1 ? 'move' : 'moves' }} →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted } from 'vue';
import { Chess } from 'chess.js';
// @ts-ignore - vue3-chessboard has no types
import { TheChessboard } from 'vue3-chessboard';
import 'vue3-chessboard/style.css';
import type { MoveStep } from '../types/chess';
import {
  getExplorerForFen,
  getDefaultSource,
  isLichessAvailable,
  type ExplorerResponse,
  type ExplorerMove,
  type ExplorerSource,
} from '../services/lichessExplorer';

interface Props {
  /** Pre-load these moves into the explorer. */
  initialMoves?: MoveStep[];
  /** Auto-orient board to this color. */
  initialOrientation?: 'white' | 'black';
  /** Title shown in the header (e.g. the line name being edited). */
  title?: string;
  /** Called when the user closes the explorer (X, Cancel, Escape, overlay click). */
  onClose: () => void;
  /** Called when the user clicks Apply with the final move list. */
  onApply: (moves: MoveStep[]) => void;
}

const props = withDefaults(defineProps<Props>(), {
  initialMoves: () => [],
  initialOrientation: 'white',
  title: '',
});

function handleClose() {
  props.onClose();
}

function handleApply() {
  props.onApply(moves.value.slice());
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') handleClose();
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
});

// ── Board state ────────────────────────────────────────────
const boardAPI = ref<any>(null);
const chess = new Chess();
const moves = ref<MoveStep[]>([]);
const orientation = ref<'white' | 'black'>(props.initialOrientation);

const boardConfig = computed(() => ({
  orientation: orientation.value,
  coordinates: true,
  highlight: { lastMove: true, check: true },
}));

let isProgrammaticMove = false;

function onBoardCreated(api: any) {
  boardAPI.value = api;
  // If initialMoves were provided, replay them on the board.
  // Guard with isProgrammaticMove so the board's @move event doesn't double-apply.
  if (props.initialMoves.length > 0) {
    isProgrammaticMove = true;
    try {
      for (const step of props.initialMoves) {
        boardAPI.value.move(step.san);
        chess.move(step.san);
        moves.value.push({ san: step.san, description: step.description ?? '' });
      }
    } catch (e) {
      console.warn('Failed to replay initial moves:', e);
    } finally {
      isProgrammaticMove = false;
    }
  }
  fetchExplorer();
}

function onMove(move: any) {
  if (isProgrammaticMove) return;
  chess.move(move.san);
  moves.value.push({ san: move.san, description: '' });
  fetchExplorer();
}

function playSan(san: string) {
  // Triggered when user clicks a move from the explorer panel.
  isProgrammaticMove = true;
  boardAPI.value?.move(san);
  isProgrammaticMove = false;
  chess.move(san);
  moves.value.push({ san, description: '' });
  fetchExplorer();
}

function undoMove() {
  if (moves.value.length === 0) return;
  boardAPI.value?.undoLastMove();
  chess.undo();
  moves.value.pop();
  fetchExplorer();
}

function resetBoard() {
  boardAPI.value?.resetBoard();
  chess.reset();
  moves.value = [];
  fetchExplorer();
}

function flipBoard() {
  boardAPI.value?.toggleOrientation();
  orientation.value = orientation.value === 'white' ? 'black' : 'white';
}

// ── Explorer fetching ─────────────────────────────────────
const explorer = ref<ExplorerResponse | null>(null);
const loading = ref(false);
const apiError = ref('');
const source = ref<ExplorerSource>(getDefaultSource());
const lichessEnabled = computed(() => isLichessAvailable());

const sourceOptions = computed<{ value: ExplorerSource; label: string; disabled: boolean }[]>(() => [
  { value: 'chessdb', label: 'ChessDB', disabled: false },
  { value: 'lichess', label: 'Lichess', disabled: !lichessEnabled.value },
  { value: 'masters', label: 'Masters', disabled: !lichessEnabled.value },
]);

let abortCtrl: AbortController | null = null;
let debounceId: ReturnType<typeof setTimeout> | null = null;

function fetchExplorer() {
  if (debounceId) clearTimeout(debounceId);
  debounceId = setTimeout(async () => {
    if (abortCtrl) abortCtrl.abort();
    abortCtrl = new AbortController();
    loading.value = true;
    apiError.value = '';
    try {
      const fen = chess.fen();
      explorer.value = await getExplorerForFen(fen, source.value, abortCtrl.signal);
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      apiError.value = e?.message ?? String(e);
    } finally {
      loading.value = false;
    }
  }, 220);
}

function setSource(src: ExplorerSource) {
  source.value = src;
  fetchExplorer();
}

// ── Path display ────────────────────────────────────────────
const pathDisplay = computed(() => {
  return moves.value
    .map((m, i) => (i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ${m.san}` : m.san))
    .join(' ');
});

// ── Helpers ────────────────────────────────────────────────
function pct(part: number, total: number): number {
  if (total === 0) return 0;
  return (part / total) * 100;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function hasGameSplit(m: ExplorerMove): boolean {
  return m.total != null && m.white != null && m.draws != null && m.black != null;
}

function winrateTitle(m: ExplorerMove): string {
  if (hasGameSplit(m)) {
    return `White ${pct(m.white!, m.total!).toFixed(1)}% · Draw ${pct(m.draws!, m.total!).toFixed(1)}% · Black ${pct(m.black!, m.total!).toFixed(1)}%`;
  }
  return `Expected white score ${m.winrate.toFixed(1)}%${m.score != null ? ` · eval ${m.score}` : ''}`;
}

function rankClass(m: ExplorerMove): string {
  if (m.rank == null) return '';
  if (m.rank >= 2) return 'rank-best';
  if (m.rank === 1) return 'rank-ok';
  return 'rank-dubious';
}

// ── Cleanup ────────────────────────────────────────────────
onBeforeUnmount(() => {
  if (debounceId) clearTimeout(debounceId);
  if (abortCtrl) abortCtrl.abort();
  window.removeEventListener('keydown', onKeydown);
});
</script>

<style scoped>
.explorer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(4px);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
}

.explorer-modal {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  width: 100%;
  max-width: 1180px;
  max-height: 96vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.6);
  position: relative;
}
.explorer-modal::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent-blue), var(--accent-green), var(--accent-purple), transparent);
  opacity: 0.6;
}

.explorer-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem 1.25rem 0.85rem;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}
.explorer-title {
  font-family: "Outfit", "Inter", sans-serif;
  font-size: 1.3rem;
  font-weight: 500;
  letter-spacing: -0.02em;
  margin: 0;
  color: var(--accent-green);
}
.explorer-subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.82rem;
  color: var(--text-secondary);
}
.close-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  width: 30px;
  height: 30px;
  border-radius: 6px;
  cursor: pointer;
}
.close-btn:hover {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  border-color: #ef4444;
}

.explorer-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ── Board pane ──────────────────────────────────────────── */
.board-pane {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.9rem;
  gap: 0.65rem;
  border-right: 1px solid var(--border-color);
  flex: 0 1 55%;
  min-width: 320px;
  max-width: 600px;
}

.board-wrap {
  width: 100%;
  max-width: 520px;
  aspect-ratio: 1;
  overflow: hidden;
}
.board-wrap :deep(.main-wrap),
.board-wrap :deep(.main-board),
.board-wrap :deep(.cg-wrap) {
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
}

.board-controls {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
  align-items: center;
}

.ctrl-btn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.75rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.ctrl-btn:hover:not(:disabled) {
  background: var(--bg-card-hover);
  color: var(--accent-green);
  border-color: var(--accent-green);
}
.ctrl-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.ctrl-icon { font-size: 0.85rem; }

.source-toggle {
  display: flex;
  margin-left: auto;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
}
.src-btn {
  padding: 0.35rem 0.75rem;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.78rem;
  cursor: pointer;
}
.src-btn:not(:last-child) {
  border-right: 1px solid var(--border-color);
}
.src-btn.active {
  background: rgba(0, 245, 184, 0.12);
  color: var(--accent-green);
}
.src-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.path {
  width: 100%;
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
  padding: 0.4rem 0.6rem;
  background: rgba(10, 12, 27, 0.6);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.78rem;
}
.path-label {
  color: var(--text-secondary);
  flex-shrink: 0;
}
.path-empty {
  color: var(--text-secondary);
  font-style: italic;
}
.path-moves {
  font-family: "JetBrains Mono", monospace;
  color: var(--accent-green);
  word-break: break-word;
}

/* ── Info pane ─────────────────────────────────────────── */
.info-pane {
  flex: 1 1 45%;
  display: flex;
  flex-direction: column;
  min-width: 300px;
  padding: 0.9rem 1rem;
  gap: 0.75rem;
  overflow-y: auto;
}

.section-label {
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.total-games {
  margin-left: auto;
  font-family: "JetBrains Mono", monospace;
  font-size: 0.72rem;
  color: var(--accent-blue);
  background: rgba(0, 180, 255, 0.10);
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
}

.moves-section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.loading, .empty, .api-error {
  font-size: 0.82rem;
  padding: 0.55rem 0.7rem;
  border: 1px dashed var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  text-align: center;
}
.api-error { color: #ef4444; border-color: rgba(239, 68, 68, 0.4); }

.moves-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 320px;
  overflow-y: auto;
}

.move-row {
  display: grid;
  grid-template-columns: 64px 1fr 60px;
  gap: 0.6rem;
  align-items: center;
  padding: 0.45rem 0.6rem;
  background: rgba(14, 18, 36, 0.6);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: all 0.12s;
}
.move-row:hover {
  border-color: var(--accent-green);
  background: rgba(0, 245, 184, 0.07);
}

.move-san {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-primary);
}

.winrate-bar {
  display: flex;
  height: 12px;
  border-radius: 3px;
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
}
.bar-segment { height: 100%; }
.white-seg { background: linear-gradient(180deg, #e6ecff, #b8c4e0); }
.draw-seg  { background: var(--text-muted); }
.black-seg { background: linear-gradient(180deg, #1a1a2e, #0a0c1b); }

.winrate-solid {
  position: relative;
  height: 14px;
  border-radius: 3px;
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
}
.solid-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-blue), var(--accent-green));
  transition: width 0.2s ease;
}
.solid-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "JetBrains Mono", monospace;
  font-size: 0.7rem;
  color: #fff;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.7);
}

/* Rank tints (chessdb) */
.move-row.rank-best   { border-color: rgba(0, 245, 184, 0.45); }
.move-row.rank-ok     { border-color: rgba(0, 180, 255, 0.35); }
.move-row.rank-dubious { opacity: 0.65; border-color: rgba(168, 85, 247, 0.25); }

.move-count {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.72rem;
  color: var(--text-secondary);
  text-align: right;
}

/* ── Apply section ─────────────────────────────────────── */
.apply-section {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: auto;
  padding-top: 0.9rem;
  border-top: 1px solid var(--border-color);
}

.apply-hint {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.apply-row {
  display: flex;
  gap: 0.6rem;
}

.cancel-btn {
  padding: 0.55rem 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 0.86rem;
  cursor: pointer;
}
.cancel-btn:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

.apply-btn {
  flex: 1;
  padding: 0.6rem 1rem;
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-green), var(--accent-purple));
  border: 1px solid transparent;
  border-radius: 6px;
  color: #05060d;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 0 18px rgba(0, 245, 184, 0.28);
}
.apply-btn:hover:not(:disabled) { filter: brightness(1.1); }
.apply-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  filter: grayscale(0.4);
}

/* Stack vertical on narrow screens */
@media (max-width: 900px) {
  .explorer-body { flex-direction: column; overflow-y: auto; }
  .board-pane { flex: none; max-width: none; border-right: none; border-bottom: 1px solid var(--border-color); }
}
</style>
