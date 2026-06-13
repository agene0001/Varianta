<template>
  <div class="line-tree">
    <div
      v-for="(row, i) in rows"
      :key="i"
      class="tree-row"
      :class="{
        'is-leaf':   row.isLeaf,
        'is-active': row.isLeaf && row.lineIndex === currentLineIndex,
        'is-trunk':  !row.isLeaf,
      }"
      @click="handleRowClick(row)"
    >
      <!-- ── Gutter ─────────────────────────────────────────── -->
      <div class="tree-gutter">
        <!-- One cell per ancestor depth level -->
        <div
          v-for="d in row.depth"
          :key="d"
          class="gutter-cell"
          :class="{ 'has-vbar': row.ancestorContinues[d - 1] }"
        />
        <!-- Branch connector: vertical rail segment + horizontal tick + arrowhead -->
        <div
          v-if="row.depth > 0"
          class="gutter-branch"
          :class="{ 'is-last-child': row.isLastSibling }"
        >
          <span class="arrow-tip" />
        </div>
      </div>

      <!-- ── Content ───────────────────────────────────────── -->
      <div class="row-content">
        <span
          v-for="(move, mi) in row.moves"
          :key="mi"
          class="move-chip"
          :class="chipClass(row, mi)"
          @click.stop="selectMode && onChipClick(row, mi)"
        >{{ move }}</span>
        <span v-if="row.isLeaf"  class="line-name">{{ row.lineName }}</span>
        <span v-else-if="row.trunkKey" class="collapse-icon" @click.stop="toggleTrunk(row.trunkKey!)">{{ row.isCollapsed ? '▸' : '▾' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Line } from '../../types/chess'

interface Props {
  lines: Line[]
  currentLineIndex?: number
  /** SAN sequence of moves played so far on the active line — chips matching this prefix get "played" styling */
  playedMoves?: string[]
  /** SAN of the next move to play on the active line — chip matching it gets "next" styling */
  nextMove?: string | null
  /** When true, clicking any row (leaf or branch) emits branchSelected with the path; used for "start from" picker */
  selectMode?: boolean
}

const props = withDefaults(defineProps<Props>(), { selectMode: false, playedMoves: () => [], nextMove: null })
const emit  = defineEmits<{
  (e: 'lineChanged', index: number): void
  (e: 'branchSelected', moves: { san: string; description?: string }[]): void
}>()

/* ── Types ─────────────────────────────────────────────────── */
interface TrieNode {
  children: Map<string, TrieNode>
  terminalLineIndices: number[]
}

interface CompactNode {
  moves: string[]
  children: CompactNode[]
  terminalLineIndices: number[]
}

interface DisplayRow {
  moves: string[]
  pathMoves: string[]            // full SAN path from root to this row
  isLeaf: boolean
  lineIndex?: number
  lineName?: string
  depth: number
  isLastSibling: boolean
  ancestorContinues: boolean[]   // length === depth; [d] = true → draw vbar at depth d
  childCount: number
  trunkKey?: string              // unique path key used for collapse tracking
  isCollapsed?: boolean
}

/* ── Collapse state ────────────────────────────────────────── */
// Replace the whole Set to trigger Vue reactivity
const collapsedTrunks = ref<Set<string>>(new Set())

function toggleTrunk(key: string) {
  const next = new Set(collapsedTrunks.value)
  if (next.has(key)) next.delete(key)
  else               next.add(key)
  collapsedTrunks.value = next
}

function pathUpToChip(row: DisplayRow, chipIndex: number): string[] {
  const base = row.pathMoves.length - row.moves.length
  return row.pathMoves.slice(0, base + chipIndex + 1)
}

function onChipClick(row: DisplayRow, chipIndex: number) {
  const path = pathUpToChip(row, chipIndex)
  if (path.length > 0) emit('branchSelected', path.map(san => ({ san })))
}

function chipClass(row: DisplayRow, mi: number): string[] {
  const absIdx = (row.pathMoves.length - row.moves.length) + mi
  const isWhiteMove = absIdx % 2 === 0
  const classes: string[] = [isWhiteMove ? 'move-chip-white' : 'move-chip-black']
  if (!row.isLeaf) classes.push('move-chip-trunk')
  if (props.selectMode) classes.push('move-chip-clickable')

  const played = props.playedMoves
  if (played.length > 0 || props.nextMove) {
    if (absIdx < played.length) {
      // Played: full prefix of this chip's path must match playedMoves
      const matches = row.pathMoves.slice(0, absIdx + 1).every((san, j) => san === played[j])
      if (matches) classes.push('move-chip-played')
    } else if (absIdx === played.length && props.nextMove) {
      // Next: prefix up to absIdx matches played, and chip itself is the next move
      const prefixMatches = row.pathMoves.slice(0, absIdx).every((san, j) => san === played[j])
      if (prefixMatches && row.pathMoves[absIdx] === props.nextMove) {
        classes.push('move-chip-next')
      }
    }
  }

  return classes
}

function handleRowClick(row: DisplayRow) {
  if (props.selectMode) {
    if (row.isLeaf && row.lineIndex != null) {
      const line = props.lines[row.lineIndex]
      emit('branchSelected', line.moves)
    } else if (row.pathMoves.length > 0) {
      emit('branchSelected', row.pathMoves.map(san => ({ san })))
    }
    return
  }
  if (row.isLeaf)             emit('lineChanged', row.lineIndex!)
  else if (row.trunkKey)      toggleTrunk(row.trunkKey)
}

/* ── Build trie ────────────────────────────────────────────── */
function buildTrie(): TrieNode {
  const root: TrieNode = { children: new Map(), terminalLineIndices: [] }
  for (let i = 0; i < props.lines.length; i++) {
    let node = root
    for (const step of props.lines[i].moves) {
      if (!node.children.has(step.san)) {
        node.children.set(step.san, { children: new Map(), terminalLineIndices: [] })
      }
      node = node.children.get(step.san)!
    }
    node.terminalLineIndices.push(i)
  }
  return root
}

/* ── Compact: merge single-child chains ────────────────────── */
function compact(node: TrieNode, moves: string[]): CompactNode {
  if (node.children.size === 1 && node.terminalLineIndices.length === 0) {
    const [move, child] = [...node.children.entries()][0]
    return compact(child, [...moves, move])
  }
  return {
    moves,
    children: [...node.children.entries()].map(([move, c]) => compact(c, [move])),
    terminalLineIndices: node.terminalLineIndices,
  }
}

/* ── Fix: trie children don't store their own move key ─────── */
function compactFromTrie(node: TrieNode): CompactNode {
  return {
    moves: [],   // root has no moves
    children: [...node.children.entries()].map(([move, child]) => compact(child, [move])),
    terminalLineIndices: [],
  }
}

/* ── Flatten into display rows ─────────────────────────────── */
function flatten(
  node: CompactNode,
  depth: number,
  isLastSibling: boolean,
  ancestorContinues: boolean[],
  rows: DisplayRow[],
  collapsedSet: Set<string>,
  pathPrefix: string,
) {
  const hasTerminals = node.terminalLineIndices.length > 0
  const fullPath     = pathPrefix ? `${pathPrefix}/${node.moves.join('|')}` : node.moves.join('|')
  const pathMoves   = fullPath ? fullPath.split('/').flatMap(s => s.split('|')).filter(Boolean) : []

  if (node.moves.length > 0) {
    if (hasTerminals) {
      // Leaf row(s) — one per terminal line at this node
      node.terminalLineIndices.forEach((lineIdx, ti) => {
        rows.push({
          moves: node.moves,
          pathMoves: props.lines[lineIdx]?.moves.map(m => m.san) ?? pathMoves,
          isLeaf: true,
          lineIndex: lineIdx,
          lineName: props.lines[lineIdx]?.name ?? `Line ${lineIdx + 1}`,
          depth,
          isLastSibling: isLastSibling && ti === node.terminalLineIndices.length - 1,
          ancestorContinues: [...ancestorContinues],
          childCount: 0,
        })
      })
    } else {
      // Trunk row
      const isCollapsed = collapsedSet.has(fullPath)
      rows.push({
        moves: node.moves,
        pathMoves,
        isLeaf: false,
        depth,
        isLastSibling,
        ancestorContinues: [...ancestorContinues],
        childCount: node.children.length,
        trunkKey: fullPath,
        isCollapsed,
      })
      // Stop here if collapsed
      if (isCollapsed) return
    }
  }

  if (node.children.length > 0) {
    const childDepth             = node.moves.length > 0 ? depth + 1 : depth
    const childAncestorContinues = node.moves.length > 0
      ? [...ancestorContinues, !isLastSibling]
      : [...ancestorContinues]

    node.children.forEach((child, idx) => {
      flatten(
        child,
        childDepth,
        idx === node.children.length - 1,
        childAncestorContinues,
        rows,
        collapsedSet,
        fullPath,
      )
    })
  }
}

const rows = computed((): DisplayRow[] => {
  if (!props.lines.length) return []
  const root = compactFromTrie(buildTrie())
  const result: DisplayRow[] = []
  flatten(root, 0, true, [], result, collapsedTrunks.value, '')
  return result
})
</script>

<style scoped>
/* ── CELL DIMENSIONS ─────────────────────────────────────────
   CELL_W = 16px  — width of each indent cell
   BRANCH_W = 22px — width of the branch connector cell
   ROW_H = 32px   — row height (min-height)
   CENTER = 8px   — horizontal center of each cell (for vertical bars)
   ──────────────────────────────────────────────────────────── */

.line-tree {
  display: flex;
  flex-direction: column;
  gap: 1px;
  font-family: inherit;
}

/* ── Row ─────────────────────────────────────────────────────── */
.tree-row {
  display: flex;
  align-items: stretch;     /* let gutter cells fill full row height */
  min-height: 32px;
  border-radius: 7px;
  cursor: default;
  transition: background 0.15s ease;
}

.tree-row.is-leaf  { cursor: pointer; }
.tree-row.is-trunk { cursor: pointer; }
.tree-row.is-leaf:hover  { background: var(--bg-card-hover); }
.tree-row.is-trunk:hover { background: rgba(70, 83, 98, 0.4); }
.tree-row.is-active      { background: rgba(76, 175, 80, 0.12) !important; }

/* ── Gutter ──────────────────────────────────────────────────── */
.tree-gutter {
  display: flex;
  align-items: stretch;
  flex-shrink: 0;
}

/* ── Indent cell: 16px wide, shows a vertical bar if ancestor continues ── */
.gutter-cell {
  width: 16px;
  position: relative;
  flex-shrink: 0;
}

/* Vertical continuation bar sits at left=8px (center of cell) */
.gutter-cell.has-vbar::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 1.5px;
  background: var(--border-color, #3a4555);
}

/* ── Branch cell: 22px wide
     ::before  = vertical segment of the rail
     ::after   = horizontal tick toward content
     .arrow-tip = arrowhead at end of horizontal tick           ── */
.gutter-branch {
  width: 22px;
  position: relative;
  flex-shrink: 0;
}

/* Vertical segment:
   - last child  → top-half only  (top → 50%)
   - other child → full height    (top → bottom) so next sibling's hbar connects */
.gutter-branch::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 50%;        /* last-child default: top → middle */
  width: 1.5px;
  background: var(--border-color, #3a4555);
}

.gutter-branch:not(.is-last-child)::before {
  bottom: 0;          /* continue full height to connect to next sibling */
}

/* Horizontal tick: from center of cell to near right edge */
.gutter-branch::after {
  content: '';
  position: absolute;
  left: 8px;
  right: 5px;         /* leave 5px for the arrowhead */
  top: 50%;
  transform: translateY(-50%);
  height: 1.5px;
  background: var(--border-color, #3a4555);
}

/* Arrowhead (right-pointing CSS triangle) */
.arrow-tip {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 3.5px 0 3.5px 5px;
  border-color: transparent transparent transparent var(--border-color, #3a4555);
}

/* ── Row content ─────────────────────────────────────────────── */
.row-content {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 3px;
  flex: 1;
  min-width: 0;
  padding: 4px 8px 4px 4px;
}

/* ── Move chips ──────────────────────────────────────────────── */
.move-chip {
  font-family: "JetBrains Mono", "Fira Code", "Cascadia Code", monospace;
  font-size: 0.68rem;
  padding: 2px 5px;
  border-radius: 4px;
  white-space: nowrap;
  border: 1px solid transparent;
  flex-shrink: 0;
  transition: all 0.18s ease;
}

/* White moves — cyan-blue tint */
.move-chip-white {
  background: rgba(0, 180, 255, 0.10);
  color: rgba(170, 220, 255, 0.95);
  border-color: rgba(0, 180, 255, 0.20);
}

/* Black moves — violet-purple tint */
.move-chip-black {
  background: rgba(168, 85, 247, 0.10);
  color: rgba(215, 180, 255, 0.95);
  border-color: rgba(168, 85, 247, 0.22);
}

/* Trunk shared-prefix chips: brighter + bolder */
.move-chip-trunk.move-chip-white {
  background: rgba(0, 180, 255, 0.18);
  color: rgba(210, 235, 255, 1);
  border-color: rgba(0, 180, 255, 0.32);
  font-weight: 700;
}
.move-chip-trunk.move-chip-black {
  background: rgba(168, 85, 247, 0.18);
  color: rgba(235, 210, 255, 1);
  border-color: rgba(168, 85, 247, 0.32);
  font-weight: 700;
}

.move-chip-clickable { cursor: pointer; }
.move-chip-clickable:hover {
  background: rgba(0, 245, 184, 0.18) !important;
  color: var(--accent-green) !important;
  border-color: rgba(0, 245, 184, 0.45) !important;
}

/* Played — keep white/black distinction with a different palette than unplayed:
   white move → green, black move → bright blue */
.move-chip-played.move-chip-white {
  background: rgba(0, 245, 184, 0.22);
  color: var(--accent-green);
  border-color: rgba(0, 245, 184, 0.6);
  box-shadow: 0 0 8px rgba(0, 245, 184, 0.28);
  font-weight: 700;
}
.move-chip-played.move-chip-black {
  background: rgba(0, 180, 255, 0.22);
  color: var(--accent-blue);
  border-color: rgba(0, 180, 255, 0.6);
  box-shadow: 0 0 8px rgba(0, 180, 255, 0.28);
  font-weight: 700;
}

/* Next move to play — purple, distinctly different from played + pulsing */
.move-chip-next.move-chip-white,
.move-chip-next.move-chip-black {
  background: rgba(168, 85, 247, 0.22);
  color: #d6b6ff;
  border-color: var(--accent-purple);
  box-shadow: 0 0 10px rgba(168, 85, 247, 0.35);
  font-weight: 700;
  animation: chip-pulse 1.6s ease-in-out infinite;
}

@keyframes chip-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.55), 0 0 10px rgba(168, 85, 247, 0.35); }
  50%      { box-shadow: 0 0 0 4px rgba(168, 85, 247, 0),     0 0 10px rgba(168, 85, 247, 0.35); }
}

/* ── Line name ───────────────────────────────────────────────── */
.line-name {
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin-left: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
  transition: color 0.15s;
}

.tree-row.is-leaf:hover .line-name { color: var(--text-primary); }

.tree-row.is-active .line-name {
  color: var(--accent-green) !important;
  font-weight: 600;
}

/* ── Collapse arrow ──────────────────────────────────────────── */
.collapse-icon {
  margin-left: auto;
  font-size: 0.72rem;
  color: var(--text-secondary);
  flex-shrink: 0;
  padding-left: 6px;
  line-height: 1;
}
</style>