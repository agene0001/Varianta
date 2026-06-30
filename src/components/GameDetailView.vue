<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
// @ts-ignore - vue3-chessboard has no types
import { TheChessboard } from 'vue3-chessboard';
import 'vue3-chessboard/style.css';
import { opponent, outcome, type Game } from '../composables/useGames';
import {
  getGameAnalysis,
  analyzeGame,
  evalLabel,
  whiteBarPct,
  type MoveAnalysis,
} from '../composables/useAnalysis';

const props = defineProps<{ game: Game }>();
const emit = defineEmits<{ (e: 'back'): void }>();

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const analyses = ref<MoveAnalysis[] | null>(null);
const selected = ref(-1); // -1 = starting position
const loading = ref(false);
const error = ref('');

onMounted(async () => {
  try {
    analyses.value = await getGameAnalysis(props.game.id);
    if (analyses.value?.length) selected.value = 0;
  } catch (e) {
    error.value = String(e);
  }
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

const current = computed(() =>
  selected.value >= 0 && analyses.value ? analyses.value[selected.value] : null,
);

const currentFen = computed(() => current.value?.fen ?? START_FEN);

const boardConfig = computed(() => ({
  fen: currentFen.value,
  viewOnly: true,
  coordinates: true,
  orientation: props.game.player_color,
}));

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

function moveNumber(ply: number): string {
  return ply % 2 === 1 ? `${Math.ceil(ply / 2)}.` : '';
}
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
      <button
        v-if="analyses?.length"
        class="analyze-btn"
        :disabled="loading"
        @click="onAnalyze"
      >
        {{ loading ? 'Analyzing…' : 'Re-analyze' }}
      </button>
    </header>

    <p v-if="error" class="detail-error">{{ error }}</p>

    <div class="detail-body">
      <div class="board-area">
        <div class="eval-bar" :title="evalText">
          <div class="eval-fill" :style="{ height: barPct + '%' }"></div>
          <span class="eval-text" :class="{ light: barPct < 50 }">{{ evalText }}</span>
        </div>
        <div class="board-wrap">
          <TheChessboard :key="currentFen" :board-config="boardConfig" />
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
          <ol class="move-list">
            <li
              v-for="(m, i) in analyses"
              :key="m.ply"
              class="move-item"
              :class="{ selected: i === selected }"
              @click="selected = i"
            >
              <span class="movenum">{{ moveNumber(m.ply) }}</span>
              <span class="san">{{ m.san }}</span>
              <span v-if="annotation[m.severity]" class="annot" :class="m.severity">
                {{ annotation[m.severity] }}
              </span>
            </li>
          </ol>

          <div v-if="current && current.played_uci !== current.best_uci" class="best-move">
            Best was <code>{{ current.best_uci }}</code>
            <span class="cp-loss">(−{{ (current.cp_loss / 100).toFixed(1) }})</span>
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

.analyze-btn {
  margin-left: auto;
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
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.board-area {
  display: flex;
  gap: 10px;
  align-items: stretch;
  height: 480px;
}

.eval-bar {
  position: relative;
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
  width: 480px;
  height: 480px;
}

.moves-panel {
  flex: 1;
  min-width: 220px;
  max-height: 480px;
  display: flex;
  flex-direction: column;
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
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2px;
}

.move-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.move-item:hover {
  background: var(--bg-card-hover);
}

.move-item.selected {
  background: var(--btn-bg);
  outline: 1px solid var(--border-bright);
}

.movenum {
  color: var(--text-muted);
  min-width: 22px;
  font-size: 12px;
}

.annot {
  font-weight: 700;
}

.annot.inaccuracy {
  color: #e0c200;
}

.annot.mistake {
  color: #ff9f43;
}

.annot.blunder {
  color: #ff5050;
}

.best-move {
  margin-top: 12px;
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
</style>
