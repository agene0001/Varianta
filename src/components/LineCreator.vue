<template>
  <div class="creator-overlay" @click.self="$emit('close')">
    <div class="creator-modal">

      <!-- ── Header ─────────────────────────────────────────── -->
      <div class="creator-header">
        <div class="creator-title-row">
          <span class="creator-title">Line Creator</span>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>
        <p class="creator-subtitle">Play moves on the board, add descriptions, then save.</p>
      </div>

      <!-- ── Body ──────────────────────────────────────────── -->
      <div class="creator-body">

        <!-- Left: board + controls -->
        <div class="creator-left">
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

          <!-- Orientation + undo row -->
          <div class="board-controls">
            <button class="ctrl-btn" @click="flipBoard" title="Flip board">
              <span class="ctrl-icon">⇅</span> Flip
            </button>
            <button class="ctrl-btn" :disabled="moves.length === 0" @click="undoMove" title="Undo last move">
              <span class="ctrl-icon">↩</span> Undo
            </button>
            <button class="ctrl-btn danger" :disabled="moves.length === 0" @click="resetMoves" title="Reset board">
              <span class="ctrl-icon">✕</span> Reset
            </button>
          </div>
        </div>

        <!-- Right: move list + metadata -->
        <div class="creator-right">

          <!-- Start from existing line -->
          <div class="start-from-section">
            <div class="section-label">Starting position</div>
            <div class="start-from-toggle">
              <button
                v-for="opt in ['scratch', 'existing']"
                :key="opt"
                class="seg-btn"
                :class="{ active: startFromMode === opt }"
                @click="setStartFromMode(opt as 'scratch' | 'existing')"
              >
                {{ opt === 'scratch' ? 'From scratch' : 'From existing line' }}
              </button>
            </div>

            <template v-if="startFromMode === 'existing'">
              <label class="field-label">Opening</label>
              <select
                v-model="startFromOpeningId"
                class="text-input select-input"
              >
                <option value="" disabled>Select opening…</option>
                <option v-for="o in openings" :key="o.id" :value="o.id">
                  {{ o.name }}
                </option>
              </select>

              <label class="field-label" style="margin-top: 0.5rem;">Tree — click a branch, line, or “+ New branch” to start from</label>
              <div class="tree-picker-wrap" v-if="startFromOpeningId && startFromLines.length">
                <LineTree
                  :lines="startFromLines"
                  :select-mode="true"
                  @branch-selected="onBranchSelected"
                />
              </div>
              <p v-else-if="startFromOpeningId && !startFromLines.length" class="tree-empty">
                No variations in this opening yet.
              </p>
            </template>
          </div>

          <!-- Move list -->
          <div class="moves-section">
            <div class="section-label">
              <span>
                Moves
                <span class="move-count">{{ moves.length }}</span>
              </span>
              <button class="edit-explorer-link" @click="openExplorer">
                Open in explorer →
              </button>
            </div>

            <div class="moves-list" ref="movesListEl">
              <div v-if="moves.length === 0" class="moves-empty">
                Play moves on the board to begin…
              </div>

              <div
                v-for="(step, i) in moves"
                :key="i"
                class="move-row"
                :class="{ 'is-editing': editingIndex === i }"
              >
                <!-- Move number + SAN -->
                <div class="move-header" @click="toggleEdit(i)">
                  <span class="move-num">{{ Math.floor(i / 2) + 1 }}{{ i % 2 === 0 ? '.' : '…' }}</span>
                  <span class="move-san">{{ step.san }}</span>
                  <span class="move-color-dot" :class="i % 2 === 0 ? 'white' : 'black'" />
                  <span class="move-desc-preview" v-if="step.description && editingIndex !== i">
                    {{ step.description }}
                  </span>
                  <span class="move-edit-hint" v-else-if="editingIndex !== i">
                    + add note
                  </span>
                  <span class="move-chevron" :class="{ open: editingIndex === i }">›</span>
                </div>

                <!-- Inline description editor -->
                <Transition name="expand">
                  <div v-if="editingIndex === i" class="move-desc-editor">
                    <textarea
                      v-model="step.description"
                      class="desc-textarea"
                      placeholder="Describe the idea behind this move…"
                      rows="2"
                      @keydown.enter.prevent="editingIndex = null"
                      autofocus
                    />
                    <button class="done-btn" @click="editingIndex = null">Done</button>
                  </div>
                </Transition>
              </div>
            </div>
          </div>

          <!-- Line metadata -->
          <div class="meta-section">
            <div class="section-label">Line Details</div>

            <label class="field-label">Line name <span class="required">*</span></label>
            <input
              v-model="lineName"
              class="text-input"
              placeholder="e.g. Main Line, Sharp Variation…"
              maxlength="60"
            />

            <label class="field-label" style="margin-top: 0.75rem;">Save to opening</label>
            <div class="opening-target">
              <button
                v-for="opt in ['existing', 'new']"
                :key="opt"
                class="seg-btn"
                :class="{ active: targetMode === opt }"
                @click="targetMode = opt as 'existing' | 'new'"
              >{{ opt === 'existing' ? 'Existing opening' : 'New opening' }}</button>
            </div>

            <!-- Existing opening select -->
            <select
              v-if="targetMode === 'existing'"
              v-model="selectedOpeningId"
              class="text-input select-input"
            >
              <option value="" disabled>Select an opening…</option>
              <option
                v-for="o in openings"
                :key="o.id"
                :value="o.id"
              >{{ o.name }}</option>
            </select>

            <!-- New opening fields -->
            <template v-else>
              <input
                v-model="newOpeningName"
                class="text-input"
                placeholder="Opening name (e.g. Sicilian Defense)"
                maxlength="60"
              />
              <input
                v-model="newOpeningDescription"
                class="text-input"
                style="margin-top: 0.5rem;"
                placeholder="Short description (optional)"
                maxlength="120"
              />
            </template>
          </div>

          <!-- Validation + save -->
          <div class="save-section">
            <p v-if="validationError" class="validation-error">{{ validationError }}</p>
            <button
              class="save-btn"
              :disabled="moves.length === 0"
              @click="saveLine"
            >
              <span>Save Line</span>
              <span class="save-arrow">→</span>
            </button>
          </div>

        </div>
      </div>
    </div>

    <OpeningExplorer
      v-if="showExplorer"
      :initial-moves="moves.map((m) => ({ san: m.san, description: m.description }))"
      :initial-orientation="orientation"
      :title="lineName.trim() ? `Editing: ${lineName}` : 'New line'"
      :on-close="() => (showExplorer = false)"
      :on-apply="onExplorerApply"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
// @ts-ignore
import { TheChessboard } from 'vue3-chessboard'
import 'vue3-chessboard/style.css'
import type { Opening, Line, MoveStep as ExternalMoveStep } from '../types/chess'
import LineTree from './UI/LineTree.vue'
import OpeningExplorer from './OpeningExplorer.vue'

/* ── Props / Emits ──────────────────────────────────────── */
interface Props {
  openings: Opening[]
}
const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'lineSaved', payload: { line: Line; openingId: string; newOpening?: Omit<Opening, 'lines'> }): void
}>()

/* ── Start from existing line ───────────────────────────── */
const startFromMode = ref<'scratch' | 'existing'>('scratch')
const startFromOpeningId = ref('')
const isLoadingFromLine = ref(false)

const startFromLines = computed(() => {
  if (!startFromOpeningId.value) return []
  const opening = props.openings.find(o => o.id === startFromOpeningId.value)
  return opening?.lines ?? []
})

function setStartFromMode(mode: 'scratch' | 'existing') {
  startFromMode.value = mode
  if (mode === 'scratch') startFromOpeningId.value = ''
}

function onBranchSelected(selectedMoves: { san: string; description?: string }[]) {
  if (!boardAPI.value || selectedMoves.length === 0) return

  isLoadingFromLine.value = true
  boardAPI.value.resetBoard()
  for (const step of selectedMoves) {
    boardAPI.value.move(step.san)
  }
  moves.value = selectedMoves.map(m => ({
    san: m.san,
    description: m.description ?? '',
  }))
  editingIndex.value = null
  isLoadingFromLine.value = false
  targetMode.value = 'existing'
  selectedOpeningId.value = startFromOpeningId.value

  nextTick(() => {
    if (movesListEl.value) {
      movesListEl.value.scrollTop = movesListEl.value.scrollHeight
    }
  })
}

/* ── Board ──────────────────────────────────────────────── */
const orientation = ref<'white' | 'black'>('white')
const boardAPI    = ref<any>(null)

const boardConfig = computed(() => ({
  orientation: orientation.value,
  coordinates: true,
  highlight: { lastMove: true, check: true },
}))

const onBoardCreated = (api: any) => { boardAPI.value = api }

const flipBoard = () => {
  boardAPI.value?.toggleOrientation()
  orientation.value = orientation.value === 'white' ? 'black' : 'white'
}

/* ── Explorer integration ──────────────────────────────── */
const showExplorer = ref(false)

const openExplorer = () => { showExplorer.value = true }

const onExplorerApply = (newMoves: ExternalMoveStep[]) => {
  // Replay onto the actual board so the visual stays in sync with state.
  if (boardAPI.value) {
    isLoadingFromLine.value = true
    boardAPI.value.resetBoard()
    for (const step of newMoves) {
      boardAPI.value.move(step.san)
    }
    isLoadingFromLine.value = false
  }
  moves.value = newMoves.map((m) => ({ san: m.san, description: m.description ?? '' }))
  editingIndex.value = null
  showExplorer.value = false
  nextTick(() => {
    if (movesListEl.value) movesListEl.value.scrollTop = movesListEl.value.scrollHeight
  })
}

/* ── Move tracking ──────────────────────────────────────── */
interface MoveStep {
  san: string
  description: string
}

const moves       = ref<MoveStep[]>([])
const movesListEl = ref<HTMLElement | null>(null)
const editingIndex = ref<number | null>(null)

const onMove = (move: any) => {
  if (isLoadingFromLine.value) return
  moves.value.push({ san: move.san, description: '' })
  nextTick(() => {
    if (movesListEl.value) {
      movesListEl.value.scrollTop = movesListEl.value.scrollHeight
    }
  })
}

const undoMove = () => {
  if (moves.value.length === 0) return
  boardAPI.value?.undoLastMove()
  moves.value.pop()
  if (editingIndex.value !== null && editingIndex.value >= moves.value.length) {
    editingIndex.value = null
  }
}

const resetMoves = () => {
  boardAPI.value?.resetBoard()
  moves.value = []
  editingIndex.value = null
}

const toggleEdit = (i: number) => {
  editingIndex.value = editingIndex.value === i ? null : i
}

/* ── Metadata ───────────────────────────────────────────── */
const lineName              = ref('')
const targetMode            = ref<'existing' | 'new'>('existing')
const selectedOpeningId     = ref('')
const newOpeningName        = ref('')
const newOpeningDescription = ref('')

/* ── Validation + save ──────────────────────────────────── */
const validationError = ref('')

const saveLine = () => {
  validationError.value = ''

  if (moves.value.length === 0) {
    validationError.value = 'Play at least one move before saving.'
    return
  }
  if (!lineName.value.trim()) {
    validationError.value = 'Please give this line a name.'
    return
  }
  if (targetMode.value === 'existing' && !selectedOpeningId.value) {
    validationError.value = 'Select an existing opening, or switch to "New opening".'
    return
  }
  if (targetMode.value === 'new' && !newOpeningName.value.trim()) {
    validationError.value = 'Enter a name for the new opening.'
    return
  }

  const moveSequence = moves.value.map(m => m.san).join(' ')
  const targetOpening = targetMode.value === 'existing'
    ? props.openings.find(o => o.id === selectedOpeningId.value)
    : null

  if (targetOpening) {
    const isDuplicate = targetOpening.lines.some(
      existing => existing.moves.map(m => m.san).join(' ') === moveSequence
    )
    if (isDuplicate) {
      validationError.value = 'A line with this exact move sequence already exists in this opening.'
      return
    }
  }

  const line: Line = {
    name: lineName.value.trim(),
    description: '',
    moves: moves.value.map(m => ({ san: m.san, description: m.description })),
  }

  if (targetMode.value === 'existing') {
    emit('lineSaved', { line, openingId: selectedOpeningId.value })
  } else {
    const slug = newOpeningName.value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    emit('lineSaved', {
      line,
      openingId: slug,
      newOpening: {
        id: slug,
        name: newOpeningName.value.trim(),
        description: newOpeningDescription.value.trim(),
      },
    })
  }
}
</script>

<style scoped>
/* ── Overlay ─────────────────────────────────────────────── */
.creator-overlay {
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

/* ── Modal ───────────────────────────────────────────────── */
.creator-modal {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  width: 100%;
  max-width: min(95vw, 1280px);
  max-height: 96vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 32px 80px rgba(0,0,0,0.6);
}

/* ── Header ──────────────────────────────────────────────── */
.creator-header {
  padding: 0.75rem 1rem 0.6rem;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.creator-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.creator-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.02em;
}

.creator-subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.close-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.close-btn:hover { background: rgba(239,68,68,0.12); color: #ef4444; border-color: #ef4444; }

/* ── Body layout ─────────────────────────────────────────── */
.creator-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* ── Left column ─────────────────────────────────────────── */
.creator-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem;
  gap: 0.5rem;
  border-right: 1px solid var(--border-color);
  flex: 0 1 50%;
  min-width: 280px;
  max-width: 520px;
}

.board-wrap {
  width: 100%;
  min-width: 260px;
  max-width: 480px;
  aspect-ratio: 1;
  overflow: hidden;
  flex-shrink: 0;
}

/* Override vue3-chessboard's fixed 700px so it scales with container */
.board-wrap :deep(.main-wrap) {
  width: 100% !important;
  max-width: 100% !important;
}

.board-wrap :deep(.main-board) {
  width: 100% !important;
  max-width: 100% !important;
}

.board-wrap :deep(.cg-wrap) {
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
}

.board-controls {
  display: flex;
  gap: 0.5rem;
}

.ctrl-btn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.75rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 7px;
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.ctrl-btn:hover:not(:disabled) { background: var(--bg-card-hover); color: var(--text-primary); }
.ctrl-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.ctrl-btn.danger:hover:not(:disabled) { border-color: #ef4444; color: #ef4444; }
.ctrl-icon { font-size: 0.85rem; }

/* ── Right column ────────────────────────────────────────── */
.creator-right {
  flex: 1 1 45%;
  display: flex;
  flex-direction: column;
  min-width: 280px;
  min-height: 0;
  padding: 0.75rem 1rem;
  gap: 0.75rem;
  overflow-y: auto;
}

/* ── Start from section ─────────────────────────────────── */
.start-from-section {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 0.5rem;
}

.start-from-toggle {
  display: flex;
  gap: 0;
  margin-bottom: 0.6rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.start-from-toggle .seg-btn {
  flex: 1;
  padding: 0.4rem 0.65rem;
  font-size: 0.78rem;
}

.tree-picker-wrap {
  height: 200px;
  overflow-y: scroll;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.5rem;
  background: var(--bg-card);
  margin-top: 0.4rem;
}

.tree-empty {
  margin: 0.5rem 0 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* ── Section label ───────────────────────────────────────── */
.section-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
}

.edit-explorer-link {
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid rgba(168, 85, 247, 0.4);
  color: #d6b6ff;
  padding: 0.25rem 0.6rem;
  border-radius: 5px;
  font-size: 0.66rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.edit-explorer-link:hover {
  background: rgba(168, 85, 247, 0.22);
  color: #fff;
  box-shadow: 0 0 10px rgba(168, 85, 247, 0.28);
}

.move-count {
  background: rgba(76,175,80,0.15);
  color: var(--accent-green);
  font-size: 0.68rem;
  padding: 0.1rem 0.4rem;
  border-radius: 8px;
}

/* ── Moves list ──────────────────────────────────────────── */
.moves-section {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}

.moves-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  height: 220px;
  overflow-y: scroll;
  overflow-x: hidden;
  padding-right: 6px;
  flex-shrink: 0;
}

.moves-list::-webkit-scrollbar       { width: 3px; }
.moves-list::-webkit-scrollbar-track { background: transparent; }
.moves-list::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 2px; }

.moves-empty {
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-align: center;
  padding: 1.5rem 1rem;
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  opacity: 0.6;
}

.move-row {
  border: 1px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.15s;
}
.move-row.is-editing { border-color: var(--accent-green); }

.move-header {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.6rem;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.12s;
}
.move-header:hover { background: var(--bg-card-hover); }
.move-row.is-editing .move-header { background: rgba(76,175,80,0.07); }

.move-num {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.68rem;
  color: var(--text-secondary);
  flex-shrink: 0;
  min-width: 24px;
}

.move-san {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-primary);
  background: rgba(70,83,98,0.5);
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.move-color-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.move-color-dot.white { background: #e8e8e8; border: 1px solid #888; }
.move-color-dot.black { background: #333; border: 1px solid #666; }

.move-desc-preview {
  font-size: 0.75rem;
  color: var(--text-secondary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.move-edit-hint {
  font-size: 0.72rem;
  color: var(--text-secondary);
  opacity: 0.45;
  flex: 1;
}

.move-chevron {
  font-size: 0.85rem;
  color: var(--text-secondary);
  transition: transform 0.18s;
  flex-shrink: 0;
  margin-left: auto;
  line-height: 1;
}
.move-chevron.open { transform: rotate(90deg); color: var(--accent-green); }

/* ── Description textarea ────────────────────────────────── */
.move-desc-editor {
  padding: 0.5rem 0.6rem 0.6rem;
  background: rgba(76,175,80,0.04);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.desc-textarea {
  width: 100%;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.8rem;
  line-height: 1.5;
  padding: 0.5rem 0.65rem;
  resize: none;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.desc-textarea:focus { outline: none; border-color: var(--accent-green); }

.done-btn {
  align-self: flex-end;
  padding: 0.3rem 0.75rem;
  background: rgba(76,175,80,0.15);
  border: 1px solid rgba(76,175,80,0.35);
  border-radius: 5px;
  color: var(--accent-green);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.done-btn:hover { background: rgba(76,175,80,0.25); }

/* ── Expand transition ───────────────────────────────────── */
.expand-enter-active, .expand-leave-active {
  transition: max-height 0.2s ease, opacity 0.15s ease;
  overflow: hidden;
}
.expand-enter-from, .expand-leave-to { max-height: 0; opacity: 0; }
.expand-enter-to, .expand-leave-from { max-height: 120px; opacity: 1; }

/* ── Meta section ────────────────────────────────────────── */
.meta-section { display: flex; flex-direction: column; flex-shrink: 0; }

.field-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.3rem;
  display: block;
}

.required { color: #ef4444; margin-left: 2px; }

.text-input {
  width: 100%;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.85rem;
  padding: 0.55rem 0.8rem;
  box-sizing: border-box;
  font-family: inherit;
  transition: border-color 0.15s;
}
.text-input:focus { outline: none; border-color: var(--accent-green); }
.text-input::placeholder { color: var(--text-secondary); opacity: 0.5; }

.select-input { cursor: pointer; }
.select-input option { background: var(--bg-card); color: var(--text-primary); }

/* ── Segmented control ───────────────────────────────────── */
.opening-target {
  display: flex;
  gap: 0;
  margin-bottom: 0.55rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.seg-btn {
  flex: 1;
  padding: 0.45rem 0.75rem;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.seg-btn:not(:last-child) { border-right: 1px solid var(--border-color); }
.seg-btn.active { background: rgba(76,175,80,0.12); color: var(--accent-green); }
.seg-btn:hover:not(.active) { background: var(--bg-card-hover); color: var(--text-primary); }

/* ── Save section ────────────────────────────────────────── */
.save-section {
  margin-top: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.validation-error {
  font-size: 0.78rem;
  color: #ef4444;
  margin: 0;
  padding: 0.4rem 0.65rem;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 6px;
}

.save-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.7rem 1.2rem;
  background: var(--accent-green);
  border: none;
  border-radius: 10px;
  color: #000;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.01em;
}
.save-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
.save-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }
.save-arrow { font-size: 1.1rem; transition: transform 0.2s; }
.save-btn:hover:not(:disabled) .save-arrow { transform: translateX(3px); }

/* ── Responsive: stack board above menu when narrow ──────── */
@media (max-width: 900px) {
  .creator-body {
    flex-direction: column;
    overflow-y: auto;
  }
  .creator-left {
    flex: none;
    max-width: none;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }
  .board-wrap {
    max-width: min(92vw, 520px);
    min-width: unset;
  }
}
</style>