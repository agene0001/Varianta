<template>
  <div class="app">
    <nav class="section-nav">
      <button
        class="section-tab"
        :class="{ active: section === 'trainer' }"
        @click="section = 'trainer'"
      >
        Trainer
      </button>
      <button
        class="section-tab"
        :class="{ active: section === 'games' }"
        @click="section = 'games'"
      >
        Games
      </button>
    </nav>

    <GamesView v-if="section === 'games'" />

    <template v-else>
    <!-- Home screen: openings grid -->
    <div v-if="!selectedOpening" class="home-screen">
        <header class="home-header">
           <h1 class="home-title">Repertoirist</h1>
           <div class="header-actions">
             <label class="import-label">
               <input
                 type="file"
                 accept=".json,application/json,.pgn,.sqlite,.db"
                 class="import-input"
                 @change="onImportFile"
               >
               Import
             </label>
             <button
               class="export-btn"
               :title="feedbackMessage"
               @click="onExport"
             >
               Export
             </button>
             <button class="import-lichess-btn" @click="showImporter = true">
               Import from Lichess
             </button>
             <button class="create-line-btn" @click="showLineCreator = true">
               + New Line
             </button>
           </div>
         </header>
         <p v-if="feedbackMessage" class="export-feedback" :class="{ error: feedbackError }">
           {{ feedbackMessage }}
         </p>
      <main class="openings-grid">
        <div
          v-for="opening in openings"
          :key="opening.id"
          class="opening-card"
          @click="selectOpening(opening)"
        >
          <MiniBoard
            class="opening-board"
            :fen="previews[opening.id]?.fen ?? ''"
            :orientation="previews[opening.id]?.orientation ?? 'white'"
          />
          <h2 class="opening-name">{{ opening.name }}</h2>
          <p class="opening-description">{{ opening.description }}</p>
          <div class="opening-stats">
            <span>{{ opening.lines.length }} lines</span>
          </div>
        </div>
      </main>
    </div>

    <!-- Game screen: two-column layout -->
    <div v-else class="game-screen">
      <!-- Progress bar -->
      <div class="progress-bar-container">
        <div
          class="progress-bar-fill"
          :style="{ width: progressPercent + '%' }"
        ></div>
      </div>

      <!-- Main game layout -->
      <div class="game-layout">
        <!-- Left column: chess board -->
        <div class="board-column">
          <ChessBoard
            :orientation="userColor"
            :player-color="userColor"
            @board-created="onBoardCreated"
            @move="onUserMove"
          />
        </div>

        <!-- Right column: sidebar -->
        <div class="sidebar-column">
          <Sidebar
            :opening="selectedOpening"
            :current-line-index="currentLineIndex"
            :current-mode="gameMode"
            :lines-discovered="linesDiscovered"
            :lines-perfected="linesPerfected"
            :status="practiceStatus"
            :description="currentDescription"
            :played-moves="playedMoves"
            :next-move="nextMove"
            :is-line-complete="isLineComplete"
            :drill-streak="drillStreak"
            :drill-best-streak="drillBestStreak"
            :time-left="timeLeft"
            :best-time="bestTime"
            @mode-changed="switchMode"
            @line-changed="switchLine"
            @continue="continueToNextLine"
          />
        </div>
      </div>

      <!-- Bottom toolbar -->
      <div class="bottom-toolbar">
        <button class="toolbar-btn" @click="goHome" title="Back to openings">
          <span>&#9881;</span>
        </button>
        <button
          class="toolbar-btn"
          :disabled="currentMoveIndex === 0"
          title="Step back one move"
          @click="onStepBack"
        >
          <span>&#8592;</span> Back
        </button>
        <button class="toolbar-btn hint-btn" @click="onHint">
          <span>&#128161;</span> Hint
        </button>
        <button class="toolbar-btn mode-toggle" @click="toggleMode">
          Mode
        </button>
      </div>
    </div>
    <LineCreator
      v-if="showLineCreator"
      :openings="openings"
      @close="showLineCreator = false"
      @line-saved="onLineSaved"
    />
    <LichessImporter
      v-if="showImporter"
      :openings="openings"
      :white-opening-ids="userWhiteOpeningIds"
      @close="showImporter = false"
      @line-imported="onLineImported"
    />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { Chess } from 'chess.js';
import ChessBoard from './components/ChessBoard.vue';
import Sidebar from './components/UI/Sidebar.vue';
import MiniBoard from './components/UI/MiniBoard.vue';
import { openingsData } from './data/openingsTree';
import { useChessGame } from './composables/useChessGame';
import {
  initUserLinesDb,
  loadUserLines,
  mergeUserLines,
  addLineToExistingOpening,
  addNewOpening,
  addLineToNewOpening,
  exportUserLinesAsFile,
  importUserLinesFromFile,
} from './composables/useUserLinesDb';
import type { Opening, Line } from './types/chess';
import LineCreator from './components/LineCreator.vue';
import LichessImporter from './components/LichessImporter.vue';
import GamesView from './components/GamesView.vue';

const section = ref<'trainer' | 'games'>('trainer');
const showLineCreator = ref(false);
const showImporter = ref(false);
const feedbackMessage = ref('');
const feedbackError = ref(false);
let feedbackTimeout: ReturnType<typeof setTimeout>;

const openings = ref<Opening[]>([]);

const emptyStored = { linesByOpening: {} as Record<string, Line[]>, newOpenings: [] as Opening[] };

onMounted(async () => {
  try {
    const DB_TIMEOUT = 8000;
    await Promise.race([
      initUserLinesDb(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Database init timeout')), DB_TIMEOUT)),
    ]);
    openings.value = mergeUserLines(openingsData, await loadUserLines());
  } catch (e) {
    // DB init failed or timed out — still show built-in openings
    console.warn('Database init failed, using built-in openings only:', e);
    openings.value = mergeUserLines(openingsData, emptyStored);
  }
});

function showFeedback(message: string, isError: boolean) {
  feedbackMessage.value = message;
  feedbackError.value = isError;
  clearTimeout(feedbackTimeout);
  feedbackTimeout = setTimeout(() => {
    feedbackMessage.value = '';
  }, 3000);
}

const onLineSaved = async (payload: {
  line: Line;
  openingId: string;
  newOpening?: Omit<Opening, 'lines'>;
}) => {
  const { line, openingId, newOpening } = payload;

  if (newOpening) {
    const fresh: Opening = { ...newOpening, lines: [line] };
    await addNewOpening(fresh);
    openings.value = mergeUserLines(openingsData, await loadUserLines());
    selectedOpening.value = fresh;
    currentLineIndex.value = 0;
  } else {
    const target = openings.value.find((o) => o.id === openingId);
    if (target) {
      const stored = await loadUserLines();
      const isUserCreated = stored.newOpenings.some((o) => o.id === openingId);
      if (isUserCreated) {
        await addLineToNewOpening(openingId, line);
      } else {
        await addLineToExistingOpening(openingId, line);
        target.lines.push(line);
      }
      openings.value = mergeUserLines(openingsData, await loadUserLines());
      if (selectedOpening.value?.id === openingId) {
        const updated = openings.value.find((o) => o.id === openingId);
        if (updated) selectedOpening.value = updated;
        currentLineIndex.value =
          openings.value.find((o) => o.id === openingId)!.lines.length - 1;
      }
    }
  }

  showLineCreator.value = false;
};

const onLineImported = async (payload: {
  line: Line;
  openingId: string;
  newOpening?: Omit<Opening, 'lines'>;
  playerColor: 'white' | 'black';
}) => {
  const targetId = payload.newOpening ? payload.newOpening.id : payload.openingId;
  if (payload.playerColor === 'white') {
    localStorage.setItem(`opening-color-${targetId}`, 'white');
  } else {
    localStorage.removeItem(`opening-color-${targetId}`);
  }
  await onLineSaved(payload);
  showFeedback(`Imported "${payload.line.name}".`, false);
};

const onExport = async () => {
  const result = await exportUserLinesAsFile();
  showFeedback(result.message, !result.success);
};

const onImportFile = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  const result = await importUserLinesFromFile(file);
  showFeedback(result.message, !result.success);
  if (result.success && (result.imported.lines > 0 || result.imported.openings > 0)) {
    openings.value = mergeUserLines(openingsData, await loadUserLines());
  }
};
const selectedOpening = ref<Opening | null>(null);
const currentLineIndex = ref(0);

const BUILT_IN_WHITE_OPENINGS = ['italian-game', 'ruy-lopez', 'queens-gambit', 'english-opening', 'catalan-opening', 'bishops-opening'];

function getOpeningColor(openingId: string): 'white' | 'black' {
  if (BUILT_IN_WHITE_OPENINGS.includes(openingId)) return 'white';
  const stored = localStorage.getItem(`opening-color-${openingId}`);
  return stored === 'white' ? 'white' : 'black';
}

const userWhiteOpeningIds = computed(() =>
  openings.value.map((o) => o.id).filter((id) => getOpeningColor(id) === 'white'),
);

const userColor = computed<'white' | 'black'>(() => {
  if (!selectedOpening.value) return 'white';
  return getOpeningColor(selectedOpening.value.id);
});

// A representative board position per opening for the home-screen previews:
// play the first line a few moves deep, viewed from the side you study it as.
const previews = computed<Record<string, { fen: string; orientation: 'white' | 'black' }>>(() => {
  const out: Record<string, { fen: string; orientation: 'white' | 'black' }> = {};
  for (const o of openings.value) {
    const chess = new Chess();
    const moves = o.lines[0]?.moves ?? [];
    for (const step of moves.slice(0, 12)) {
      try { chess.move(step.san); } catch { break; }
    }
    out[o.id] = { fen: chess.fen(), orientation: getOpeningColor(o.id) };
  }
  return out;
});

const {
  boardAPI,
  currentMoveIndex,
  selectedLine,
  practiceStatus,
  mode: gameMode,
  isLineComplete,
  progressPercent,
  totalMoves,
  currentDescription,
  setBoardAPI,
  startLine,
  handleUserMove,
  showHint,
  stepBack,
  resetGame,
} = useChessGame();

const currentLine = computed(() => {
  if (!selectedOpening.value) return null;
  return selectedOpening.value.lines[currentLineIndex.value] || null;
});

const playedMoves = computed(() => {
  if (!selectedLine.value) return [];
  return selectedLine.value.moves.slice(0, currentMoveIndex.value).map((m) => m.san);
});

const nextMove = computed(() => {
  if (!selectedLine.value) return null;
  return selectedLine.value.moves[currentMoveIndex.value]?.san ?? null;
});

const linesDiscovered = computed(() => {
  if (!selectedOpening.value) return 0;
  return selectedOpening.value.lines.filter(line => {
    const key = `progress-${selectedOpening.value!.id}-${line.name}`;
    return localStorage.getItem(key) !== null;
  }).length;
});

const linesPerfected = computed(() => {
  if (!selectedOpening.value) return 0;
  return selectedOpening.value.lines.filter(line => {
    const key = `progress-${selectedOpening.value!.id}-${line.name}`;
    const data = localStorage.getItem(key);
    return data && JSON.parse(data).mastered;
  }).length;
});

const selectOpening = (opening: Opening) => {
  selectedOpening.value = opening;
  currentLineIndex.value = 0;
  gameMode.value = 'learn';
};

const onBoardCreated = (api: any) => {
  setBoardAPI(api);
  nextTick(() => {
    if (currentLine.value) startLine(currentLine.value, userColor.value);
  });
};

const onUserMove = (move: any) => {
  const correct = handleUserMove(move);
  if (!correct && gameMode.value === 'drill') {
    drillStreak.value = 0;
  }
  if (!correct && gameMode.value === 'time' && timeLeft.value > 0) {
    timeLeft.value = Math.max(0, timeLeft.value - 5);
  }
  if (correct && isLineComplete.value) saveMastery();
};

const switchMode = (newMode: 'learn' | 'practice' | 'drill' | 'time') => {
  stopTimer();
  gameMode.value = newMode;
  if (newMode === 'drill') {
    currentLineIndex.value = pickRandomLineIndex();
  }
  if (currentLine.value) startLine(currentLine.value, userColor.value);
  if (newMode === 'time') startTimer();
};

const toggleMode = () => {
  const cycle: Array<'learn' | 'practice' | 'drill' | 'time'> = ['learn', 'practice', 'drill', 'time'];
  const next = cycle[(cycle.indexOf(gameMode.value) + 1) % cycle.length];
  switchMode(next);
};

const switchLine = (index: number) => {
  // Re-clicking the current line should restart it, not no-op.
  if (index === currentLineIndex.value && currentLine.value && boardAPI.value) {
    startLine(currentLine.value, userColor.value);
    if (gameMode.value === 'time') startTimer();
  } else {
    currentLineIndex.value = index;
  }
};

// Advance after finishing a line: Learn walks sequentially down the tree,
// Practice jumps to a random line.
const continueToNextLine = () => {
  if (!selectedOpening.value) return;
  const count = selectedOpening.value.lines.length;
  if (count === 0) return;
  const nextIndex =
    gameMode.value === 'practice'
      ? pickRandomLineIndex()
      : (currentLineIndex.value + 1) % count;
  if (nextIndex === currentLineIndex.value) {
    // Same line (e.g. only one exists) — restart it, since the watcher won't fire.
    if (currentLine.value) startLine(currentLine.value, userColor.value);
  } else {
    currentLineIndex.value = nextIndex;
  }
};

// ─── Drill mode ──────────────────────────────────────────
const drillStreak = ref(0);
const drillBestStreak = ref(0);
const drillCompleted = ref(0);

function pickRandomLineIndex(): number {
  if (!selectedOpening.value || selectedOpening.value.lines.length === 0) return 0;
  const count = selectedOpening.value.lines.length;
  if (count === 1) return 0;
  // Avoid picking the same line twice in a row
  let next = Math.floor(Math.random() * count);
  if (next === currentLineIndex.value) next = (next + 1) % count;
  return next;
}

// ─── Time mode ───────────────────────────────────────────
const timeLimit = ref(30);
const timeLeft = ref(30);
let timerId: ReturnType<typeof setInterval> | null = null;

const bestTime = computed(() => {
  if (!selectedOpening.value || !selectedLine.value) return null;
  const raw = localStorage.getItem(timeKey());
  return raw ? Number(raw) : null;
});

function timeKey(): string {
  return `besttime-${selectedOpening.value?.id}-${selectedLine.value?.name}`;
}

function startTimer() {
  stopTimer();
  timeLeft.value = timeLimit.value;
  timerId = setInterval(() => {
    if (timeLeft.value > 0) timeLeft.value -= 1;
    if (timeLeft.value <= 0) stopTimer();
  }, 1000);
}

function stopTimer() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

function saveBestTime(remaining: number) {
  if (!selectedOpening.value || !selectedLine.value) return;
  const elapsed = timeLimit.value - remaining;
  const existing = bestTime.value;
  if (existing === null || elapsed < existing) {
    localStorage.setItem(timeKey(), String(elapsed));
  }
}

// Mode-specific completion handling
watch(isLineComplete, (complete) => {
  if (!complete) return;
  if (gameMode.value === 'drill') {
    drillStreak.value += 1;
    drillCompleted.value += 1;
    if (drillStreak.value > drillBestStreak.value) drillBestStreak.value = drillStreak.value;
    setTimeout(() => {
      currentLineIndex.value = pickRandomLineIndex();
    }, 1200);
  } else if (gameMode.value === 'time') {
    if (timeLeft.value > 0) saveBestTime(timeLeft.value);
    stopTimer();
  }
});

const onHint = () => showHint();

const onStepBack = () => stepBack();

const saveMastery = () => {
  if (!selectedOpening.value || !selectedLine.value) return;
  const progress = {
    lineId: selectedLine.value.name,
    openingId: selectedOpening.value.id,
    mastered: true,
  };
  localStorage.setItem(
    `progress-${selectedOpening.value.id}-${selectedLine.value.name}`,
    JSON.stringify(progress)
  );
};

const goHome = () => {
  stopTimer();
  resetGame();
  selectedOpening.value = null;
  currentLineIndex.value = 0;
  drillStreak.value = 0;
};

watch(currentLineIndex, () => {
  if (currentLine.value && boardAPI.value) startLine(currentLine.value, userColor.value);
  if (gameMode.value === 'time') startTimer();
});
</script>

<style scoped>
.app {
  min-height: 100vh;
  color: var(--text-primary);
}

/* ── Home Screen ─────────────────────────────────────────── */
.home-screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.home-header {
  background: linear-gradient(180deg, rgba(14, 18, 36, 0.88) 0%, rgba(14, 18, 36, 0.35) 100%);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  padding: 1.1rem 2rem;
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 1px 0 rgba(0, 240, 255, 0.18), 0 8px 32px rgba(0, 0, 0, 0.45);
  position: relative;
}

.home-header::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent-blue), var(--accent-green), var(--accent-purple), transparent);
  opacity: 0.6;
}

.home-title {
  font-family: "Outfit", "Inter", system-ui, sans-serif;
  font-size: 1.85rem;
  font-weight: 500;
  letter-spacing: -0.025em;
  margin: 0;
  background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-green) 50%, var(--accent-purple) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 22px rgba(0, 245, 184, 0.3));
  line-height: 1.1;
}

.openings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 1.25rem;
  padding: 2.5rem 2rem 3rem;
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
}

.opening-card {
  position: relative;
  background:
    linear-gradient(180deg, rgba(14, 18, 36, 0.92) 0%, rgba(10, 12, 27, 0.92) 100%);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 1.4rem 1.4rem 1.25rem;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  overflow: hidden;
  isolation: isolate;
}

/* Animated gradient border on hover */
.opening-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 10px;
  padding: 1px;
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-green), var(--accent-purple));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
  z-index: 1;
}

/* Faint scanlines over the card */
.opening-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    180deg,
    transparent 0,
    transparent 3px,
    rgba(0, 245, 184, 0.025) 3px,
    rgba(0, 245, 184, 0.025) 4px
  );
  pointer-events: none;
  opacity: 0.6;
  z-index: 0;
}

.opening-card > * {
  position: relative;
  z-index: 2;
}

.opening-card:hover {
  border-color: transparent;
  transform: translateY(-3px);
  box-shadow:
    0 0 0 1px rgba(0, 245, 184, 0.25),
    0 14px 36px rgba(0, 0, 0, 0.55),
    0 0 36px rgba(0, 245, 184, 0.18);
}

.opening-card:hover::before {
  opacity: 1;
}

.opening-board {
  width: 100%;
  max-width: 270px;
  margin: 0 auto 1rem;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.opening-card:hover .opening-board {
  box-shadow: 0 0 22px rgba(0, 245, 184, 0.22);
}

.opening-name {
  font-family: "Outfit", "Inter", system-ui, sans-serif;
  font-size: 1.15rem;
  font-weight: 500;
  letter-spacing: -0.015em;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
  line-height: 1.2;
}

.opening-description {
  font-size: 0.86rem;
  color: var(--text-secondary);
  margin: 0 0 1rem 0;
  line-height: 1.55;
}

.opening-stats {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--accent-cyan);
  letter-spacing: 0.01em;
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.opening-stats::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  background: var(--accent-cyan);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--accent-cyan), 0 0 14px rgba(0, 240, 255, 0.6);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.5; }
}

/* ── Game Screen ─────────────────────────────────────────── */
.game-screen {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.progress-bar-container {
  height: 4px;
  background: rgba(14, 18, 36, 0.8);
  width: 100%;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border-color);
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-blue), var(--accent-green), var(--accent-purple));
  transition: width 0.3s ease;
  border-radius: 0 2px 2px 0;
  box-shadow: 0 0 12px var(--accent-glow);
}

/* ── Game layout ─────────────────────────────────────────── */
.game-layout {
  flex: 1;
  display: flex;
  flex-wrap: wrap;        /* sidebar drops below when it can't fit */
  align-content: flex-start;
  padding: 1.5rem;
  gap: 1.5rem;
  overflow-y: auto;
  min-height: 0;
}

.board-column {
  flex: 0 0 auto;
  height: min(calc(100vh - 120px), calc(100vw - 1.5rem));
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-column {
  flex: 1 1 280px;    /* grows to fill space beside board; wraps below if < 280px available */
  min-width: 280px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

/* ── Bottom Toolbar ──────────────────────────────────────── */
.bottom-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(180deg, rgba(14, 18, 36, 0.4) 0%, rgba(14, 18, 36, 0.9) 100%);
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
  position: relative;
}

.bottom-toolbar::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: -1px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent-blue), var(--accent-green), var(--accent-purple), transparent);
  opacity: 0.45;
}

.toolbar-btn {
  background: var(--btn-bg);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.toolbar-btn:hover:not(:disabled) {
  background: var(--btn-bg-hover);
  border-color: var(--accent-cyan);
  box-shadow: 0 0 0 1px var(--accent-cyan-soft), 0 0 14px rgba(0, 240, 255, 0.18);
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.mode-toggle {
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-green), var(--accent-purple));
  color: #05060d;
  border: 1px solid transparent;
  font-weight: 600;
  box-shadow: 0 0 18px rgba(0, 245, 184, 0.32);
}

.mode-toggle:hover {
  filter: brightness(1.15);
  box-shadow: 0 0 24px rgba(0, 245, 184, 0.5);
}

/* ── Responsive: stack vertically on narrow screens ──────── */
@media (max-width: 700px) {
  .game-screen {
    height: auto;
    min-height: 100vh;
    overflow-y: auto;
  }

  .game-layout {
    flex-direction: column;
    overflow: visible;
    padding: 1rem;
    gap: 1rem;
  }

  .board-column {
    width: 100%;
    min-width: unset;
  }

  .sidebar-column {
    flex: none;
    overflow-y: visible;
  }
}
.home-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.import-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.import-label {
  display: flex;
  align-items: center;
  padding: 0.5rem 1.1rem;
  background: rgba(14, 18, 36, 0.6);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.import-label:hover {
  background: var(--btn-bg-hover);
  color: var(--accent-cyan);
  border-color: var(--accent-cyan);
  box-shadow: 0 0 0 1px var(--accent-cyan-soft), 0 0 14px rgba(0, 240, 255, 0.2);
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1.1rem;
  background: rgba(14, 18, 36, 0.6);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.export-btn:hover {
  background: var(--btn-bg-hover);
  color: var(--accent-cyan);
  border-color: var(--accent-cyan);
  box-shadow: 0 0 0 1px var(--accent-cyan-soft), 0 0 14px rgba(0, 240, 255, 0.2);
}

.export-feedback {
  margin: 0;
  padding: 0.5rem 2rem;
  font-size: 0.85rem;
  font-style: italic;
  color: var(--accent-cyan);
  background: rgba(0, 240, 255, 0.06);
  border-bottom: 1px solid rgba(0, 240, 255, 0.18);
}
.export-feedback.error {
  color: #ff4d6d;
  background: rgba(255, 77, 109, 0.08);
  border-bottom-color: rgba(255, 77, 109, 0.22);
}

.create-line-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1.2rem;
  background: linear-gradient(135deg, rgba(0, 180, 255, 0.14), rgba(0, 245, 184, 0.14), rgba(168, 85, 247, 0.14));
  border: 1px solid var(--accent-green);
  border-radius: 6px;
  color: var(--accent-green);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 0 0 1px transparent, 0 0 18px rgba(0, 245, 184, 0.22);
}
.create-line-btn:hover {
  background: linear-gradient(135deg, rgba(0, 180, 255, 0.26), rgba(0, 245, 184, 0.26), rgba(168, 85, 247, 0.26));
  color: #fff;
  box-shadow: 0 0 0 1px var(--accent-green), 0 0 24px rgba(0, 245, 184, 0.45);
}

.import-lichess-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1.1rem;
  background: rgba(0, 180, 255, 0.10);
  border: 1px solid rgba(0, 180, 255, 0.45);
  border-radius: 6px;
  color: var(--accent-blue);
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.import-lichess-btn:hover {
  background: rgba(0, 180, 255, 0.18);
  border-color: var(--accent-blue);
  color: #fff;
  box-shadow: 0 0 14px rgba(0, 180, 255, 0.28);
}

/* Top-level section nav (Trainer | Games) */
.section-nav {
  display: flex;
  gap: 4px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-elevated);
}

.section-tab {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-secondary);
  font-weight: 600;
  padding: 6px 16px;
  border-radius: 8px;
}

.section-tab.active {
  color: var(--text-primary);
  background: var(--btn-bg);
  border-color: var(--border-color);
}

</style>