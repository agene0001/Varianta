<template>
  <div class="importer-overlay" @click.self="$emit('close')">
    <div class="importer-modal">
      <div class="importer-header">
        <div>
          <h2 class="importer-title">Import from Lichess</h2>
          <p class="importer-subtitle">
            Search ~3,700 named variations, preview, and add to your collection.
          </p>
        </div>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="importer-body">
        <!-- Search row -->
        <div class="search-row">
          <input
            ref="searchInputEl"
            v-model="query"
            class="search-input"
            placeholder="Search by name — e.g. 'Italian Game: Two Knights'"
            @input="runSearch"
          />
          <span class="result-count">{{ resultCount }}</span>
        </div>

        <!-- Status / loading -->
        <p v-if="loadError" class="status-msg error">{{ loadError }}</p>
        <p v-else-if="loading" class="status-msg">Loading openings library…</p>

        <!-- Results list -->
        <div v-if="!loading && !loadError" class="results-list">
          <button
            v-for="opening in results"
            :key="`${opening.e}|${opening.n}|${opening.m.length}`"
            :class="['result-item', { selected: selectedKey === opening.e + opening.n }]"
            @click="selectOpening(opening)"
          >
            <span class="eco">{{ opening.e }}</span>
            <span class="name">{{ opening.n }}</span>
            <span class="moves-preview">
              {{ opening.m.slice(0, 6).join(' ') }}{{ opening.m.length > 6 ? ' …' : '' }}
            </span>
          </button>
          <p v-if="results.length === 0" class="empty-msg">No matches.</p>
        </div>

        <!-- Import config (when a variation is selected) -->
        <div v-if="selected" class="import-config">
          <div class="config-section">
            <div class="section-label">
              <span>Selected variation</span>
              <button class="edit-explorer-link" @click="showExplorer = true">
                Edit in explorer →
              </button>
            </div>
            <div class="selected-name">{{ selected.n }}</div>
            <div class="selected-moves">
              {{ effectiveMoves.join(' ') }}
              <span v-if="movesEdited" class="edited-flag">· edited</span>
            </div>
          </div>

          <div class="config-section">
            <div class="section-label">Target opening</div>
            <select v-model="targetOpeningId" class="select-input">
              <option v-for="o in openings" :key="o.id" :value="o.id">{{ o.name }}</option>
              <option value="__new__">+ Create new opening…</option>
            </select>
          </div>

          <div v-if="targetOpeningId === '__new__'" class="config-section">
            <div class="section-label">New opening</div>
            <input
              v-model="newOpeningName"
              class="text-input"
              placeholder="Opening name (e.g. Sicilian Defense)"
            />
            <div class="color-toggle">
              <button
                v-for="opt in ['white', 'black']"
                :key="opt"
                :class="['color-btn', { active: newOpeningColor === opt }]"
                @click="newOpeningColor = opt as 'white' | 'black'"
              >
                Play as {{ opt }}
              </button>
            </div>
          </div>

          <div class="config-section">
            <div class="section-label">Line name</div>
            <input
              v-model="lineName"
              class="text-input"
              :placeholder="defaultLineName"
            />
          </div>

          <div class="config-section">
            <label class="checkbox-label">
              <input type="checkbox" v-model="useAi" :disabled="!aiAvailable" />
              <span>
                Generate descriptions with Gemini
                <span v-if="!aiAvailable" class="hint">
                  — set VITE_GEMINI_API_KEY in .env to enable
                </span>
                <span v-else class="hint">— uses 1 API call per import</span>
              </span>
            </label>
          </div>

          <div class="actions">
            <button class="cancel-btn" @click="selected = null">Back</button>
            <button class="import-btn" :disabled="importing || !canImport" @click="performImport">
              {{ importing ? statusMessage : 'Import line' }}
            </button>
          </div>
        </div>

        <div v-if="message" :class="['status-msg', { error: messageError }]">
          <span>{{ message }}</span>
        </div>
      </div>
    </div>

    <OpeningExplorer
      v-if="showExplorer && selected"
      :initial-moves="effectiveMoves.map((san) => ({ san, description: '' }))"
      :initial-orientation="orientationForCurrentTarget"
      :title="`Editing: ${selected.n}`"
      :on-close="() => (showExplorer = false)"
      :on-apply="onExplorerApply"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import type { Opening, Line, MoveStep } from '../types/chess';
import { searchOpenings, type LichessOpening } from '../services/lichessOpenings';
import {
  isGeminiConfigured,
  generateMoveDescriptions,
  generateMechanicalDescriptions,
} from '../services/gemini';
import OpeningExplorer from './OpeningExplorer.vue';

interface Props {
  openings: Opening[];
  /** Opening IDs the user plays as White. Defaults to the built-in white-side openings. */
  whiteOpeningIds?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  whiteOpeningIds: () => ['italian-game', 'ruy-lopez', 'queens-gambit', 'english-opening', 'catalan-opening'],
});

const emit = defineEmits<{
  (e: 'close'): void;
  (
    e: 'lineImported',
    payload: { line: Line; openingId: string; newOpening?: Omit<Opening, 'lines'>; playerColor: 'white' | 'black' },
  ): void;
}>();

// ── Search state ────────────────────────────────────────────
const query = ref('');
const results = ref<LichessOpening[]>([]);
const loading = ref(true);
const loadError = ref('');
const searchInputEl = ref<HTMLInputElement | null>(null);

const resultCount = computed(() => `${results.value.length} match${results.value.length === 1 ? '' : 'es'}`);

let searchTimer: ReturnType<typeof setTimeout> | null = null;
function runSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    try {
      results.value = await searchOpenings(query.value, 60);
    } catch (e) {
      loadError.value = e instanceof Error ? e.message : String(e);
    }
  }, 120);
}

onMounted(async () => {
  try {
    results.value = await searchOpenings('', 60);
    loading.value = false;
    await nextTick();
    searchInputEl.value?.focus();
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e);
    loading.value = false;
  }
});

// ── Selection + config ─────────────────────────────────────
const selected = ref<LichessOpening | null>(null);
const selectedKey = computed(() => (selected.value ? selected.value.e + selected.value.n : ''));

const targetOpeningId = ref('');
const newOpeningName = ref('');
const newOpeningColor = ref<'white' | 'black'>('white');
const lineName = ref('');
const useAi = ref(isGeminiConfigured());
const aiAvailable = computed(() => isGeminiConfigured());

const defaultLineName = computed(() => {
  if (!selected.value) return '';
  // Strip the parent opening prefix from "Foo: Bar Variation" -> "Bar Variation"
  const idx = selected.value.n.indexOf(': ');
  return idx >= 0 ? selected.value.n.slice(idx + 2) : selected.value.n;
});

function selectOpening(o: LichessOpening) {
  selected.value = o;
  lineName.value = '';
  message.value = '';
  messageError.value = false;
  editedMoves.value = null;

  // Auto-pick the best target opening based on name prefix
  const namePrefix = o.n.split(':')[0].toLowerCase().trim();
  const match = props.openings.find((op) => namePrefix.includes(op.name.toLowerCase().split(' (')[0]) || op.name.toLowerCase().includes(namePrefix));
  targetOpeningId.value = match ? match.id : '__new__';
  if (targetOpeningId.value === '__new__') {
    newOpeningName.value = namePrefix.replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

// ── Explorer integration ───────────────────────────────────
const showExplorer = ref(false);
const editedMoves = ref<string[] | null>(null);

const effectiveMoves = computed<string[]>(() => editedMoves.value ?? selected.value?.m ?? []);
const movesEdited = computed(() => editedMoves.value !== null);

const orientationForCurrentTarget = computed<'white' | 'black'>(() =>
  resolvePlayerColor(targetOpeningId.value),
);

function onExplorerApply(moves: MoveStep[]) {
  editedMoves.value = moves.map((m) => m.san);
  showExplorer.value = false;
}

const canImport = computed(() => {
  if (!selected.value) return false;
  if (targetOpeningId.value === '__new__' && !newOpeningName.value.trim()) return false;
  return true;
});

// ── Import flow ────────────────────────────────────────────
const importing = ref(false);
const statusMessage = ref('');
const message = ref('');
const messageError = ref(false);
const lastImported = ref<{ line: Line; openingId: string; playerColor: 'white' | 'black' } | null>(null);

function showMessage(msg: string, isError = false) {
  message.value = msg;
  messageError.value = isError;
  setTimeout(() => {
    if (message.value === msg) message.value = '';
  }, 5000);
}

function resolvePlayerColor(openingId: string): 'white' | 'black' {
  if (openingId === '__new__') return newOpeningColor.value;
  return props.whiteOpeningIds.includes(openingId) ? 'white' : 'black';
}

async function performImport() {
  if (!selected.value || !canImport.value) return;
  importing.value = true;
  message.value = '';

  try {
    const moves = effectiveMoves.value;
    const playerColor = resolvePlayerColor(targetOpeningId.value);
    const targetName =
      targetOpeningId.value === '__new__'
        ? newOpeningName.value.trim()
        : props.openings.find((o) => o.id === targetOpeningId.value)?.name ?? '';
    const finalLineName = lineName.value.trim() || defaultLineName.value;

    let descriptions: string[];
    if (useAi.value && aiAvailable.value) {
      statusMessage.value = 'Generating descriptions…';
      descriptions = await generateMoveDescriptions({
        openingName: targetName,
        variationName: selected.value.n,
        moves,
        userColor: playerColor,
      });
    } else {
      descriptions = generateMechanicalDescriptions(moves, playerColor);
    }

    const line: Line = {
      name: finalLineName,
      description: '',
      moves: moves.map((san, i) => ({ san, description: descriptions[i] ?? '' })),
    };

    if (targetOpeningId.value === '__new__') {
      const slug = newOpeningName.value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      emit('lineImported', {
        line,
        openingId: slug,
        newOpening: { id: slug, name: newOpeningName.value.trim(), description: '' },
        playerColor,
      });
      lastImported.value = { line, openingId: slug, playerColor };
    } else {
      emit('lineImported', { line, openingId: targetOpeningId.value, playerColor });
      lastImported.value = { line, openingId: targetOpeningId.value, playerColor };
    }

    showMessage(`Imported "${finalLineName}" — ${moves.length} moves.`);
    selected.value = null;
  } catch (e) {
    showMessage(e instanceof Error ? e.message : String(e), true);
  } finally {
    importing.value = false;
    statusMessage.value = '';
  }
}
</script>

<style scoped>
.importer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
}

.importer-modal {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  width: 100%;
  max-width: 800px;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.6);
  position: relative;
}

.importer-modal::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent-blue), var(--accent-green), var(--accent-purple), transparent);
  opacity: 0.6;
}

.importer-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem 1.25rem 0.85rem;
  border-bottom: 1px solid var(--border-color);
}

.importer-title {
  font-family: "Outfit", "Inter", sans-serif;
  font-size: 1.3rem;
  font-weight: 500;
  letter-spacing: -0.02em;
  margin: 0;
  color: var(--accent-green);
}
.importer-subtitle {
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
  font-size: 0.85rem;
  transition: all 0.15s;
}
.close-btn:hover {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  border-color: #ef4444;
}

.importer-body {
  padding: 1rem 1.25rem 1.25rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ── Search ─────────────────────────────────────── */
.search-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.search-input {
  flex: 1;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.95rem;
  padding: 0.6rem 0.9rem;
  font-family: inherit;
}

.result-count {
  font-size: 0.78rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

/* ── Results ───────────────────────────────────── */
.results-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 320px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: rgba(10, 12, 27, 0.45);
}

.result-item {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  gap: 0.6rem;
  align-items: center;
  padding: 0.5rem 0.7rem;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
  font-size: 0.85rem;
  transition: background 0.12s;
  border-radius: 4px;
}
.result-item:hover {
  background: var(--bg-card-hover);
}
.result-item.selected {
  background: rgba(0, 245, 184, 0.10);
  border-color: var(--accent-green);
}

.eco {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.7rem;
  color: var(--accent-blue);
  background: rgba(0, 180, 255, 0.10);
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  text-align: center;
}

.name {
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.moves-preview {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.72rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.empty-msg {
  padding: 1rem;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin: 0;
}

/* ── Config section ─────────────────────────────── */
.import-config {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  background: rgba(10, 12, 27, 0.55);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.section-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  letter-spacing: 0.01em;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.edit-explorer-link {
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid rgba(168, 85, 247, 0.4);
  color: #d6b6ff;
  padding: 0.25rem 0.6rem;
  border-radius: 5px;
  font-size: 0.72rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.edit-explorer-link:hover {
  background: rgba(168, 85, 247, 0.22);
  color: #fff;
  box-shadow: 0 0 10px rgba(168, 85, 247, 0.28);
}

.edited-flag {
  color: var(--accent-purple);
  font-style: italic;
  font-size: 0.78rem;
  margin-left: 0.3rem;
}

.selected-name {
  font-family: "Outfit", "Inter", sans-serif;
  font-size: 1rem;
  color: var(--accent-green);
  font-weight: 500;
  letter-spacing: -0.015em;
}

.selected-moves {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.78rem;
  color: var(--text-secondary);
  word-break: break-word;
}

.select-input,
.text-input {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.88rem;
  padding: 0.5rem 0.7rem;
  font-family: inherit;
}

.color-toggle {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.4rem;
}
.color-btn {
  flex: 1;
  padding: 0.45rem 0.7rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
}
.color-btn.active {
  background: rgba(0, 245, 184, 0.12);
  color: var(--accent-green);
  border-color: var(--accent-green);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.86rem;
  color: var(--text-primary);
  cursor: pointer;
}
.checkbox-label input { cursor: pointer; }
.hint {
  color: var(--text-secondary);
  font-size: 0.78rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.4rem;
}

.cancel-btn {
  flex: 0 0 auto;
  padding: 0.55rem 1rem;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 0.88rem;
  cursor: pointer;
}
.cancel-btn:hover {
  color: var(--text-primary);
  border-color: var(--text-secondary);
}

.import-btn {
  flex: 1;
  padding: 0.6rem 1.1rem;
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-green), var(--accent-purple));
  border: 1px solid transparent;
  border-radius: 6px;
  color: #05060d;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 0 18px rgba(0, 245, 184, 0.28);
}
.import-btn:hover:not(:disabled) {
  filter: brightness(1.1);
}
.import-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(0.4);
}

/* ── Status ─────────────────────────────────────── */
.status-msg {
  margin: 0;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 245, 184, 0.08);
  border: 1px solid rgba(0, 245, 184, 0.25);
  border-radius: 6px;
  color: var(--accent-green);
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.status-msg.error {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.25);
  color: #ef4444;
}

.deepen-btn {
  background: rgba(168, 85, 247, 0.15);
  border: 1px solid var(--accent-purple);
  color: #d6b6ff;
  padding: 0.35rem 0.75rem;
  border-radius: 5px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.deepen-btn:hover {
  background: rgba(168, 85, 247, 0.25);
  color: #fff;
  box-shadow: 0 0 12px rgba(168, 85, 247, 0.3);
}
</style>
