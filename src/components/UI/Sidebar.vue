<template>
    <div class="sidebar">
        <!-- Header: mode + opening name + line indicator -->
        <div class="sidebar-header">
            <div class="header-top">
                <span class="mode-badge">{{ modeBadgeLabel }}</span>
                <span class="opening-name">{{ opening.name }}</span>
                <span v-if="currentMode === 'drill'" class="line-name-header">{{ currentLineName }}</span>
                <span v-else class="line-number">#{{ currentLineIndex + 1 }}</span>
            </div>
        </div>

        <!-- Commentary bubble -->
        <div class="commentary">
            <div class="commentary-icon">&#9822;</div>
            <div class="commentary-bubble">
                <p v-if="currentMode === 'learn' && description" class="description-text">
                    {{ description }}
                </p>
                <p v-else-if="currentMode === 'practice' && !status" class="description-text">
                    Play the correct move.
                </p>
                <p v-else-if="currentMode === 'drill' && !status" class="description-text">
                    Drill mode — play the correct move. Lines auto-advance on completion.
                </p>
                <p v-else-if="currentMode === 'time' && !status" class="description-text">
                    Beat the clock! Mistakes cost 5 seconds.
                </p>
                <p v-if="status" class="status-text" :class="statusClass">
                    {{ status }}
                </p>
                <button
                    v-if="isLineComplete && (currentMode === 'learn' || currentMode === 'practice')"
                    class="continue-btn"
                    @click="$emit('continue')"
                >
                    Continue
                    <span class="continue-hint">{{ currentMode === 'learn' ? 'next line ↓' : 'random line ⤮' }}</span>
                </button>
            </div>
        </div>

        <!-- Mode buttons -->
        <div class="mode-buttons">
            <button
                :class="['mode-btn', 'mode-btn-full', { active: currentMode === 'learn' }]"
                @click="$emit('modeChanged', 'learn')"
            >
                <span class="mode-btn-icon">&#9632;</span>
                <div class="mode-btn-text">
                    <span class="mode-btn-title">Learn</span>
                    <span class="mode-btn-subtitle">{{ linesDiscovered }}/{{ totalLines }} lines discovered</span>
                </div>
            </button>

            <button
                :class="['mode-btn', 'mode-btn-full', { active: currentMode === 'practice' }]"
                @click="$emit('modeChanged', 'practice')"
            >
                <span class="mode-btn-icon">&#9898;</span>
                <div class="mode-btn-text">
                    <span class="mode-btn-title">Practice</span>
                    <span class="mode-btn-subtitle">{{ linesPerfected }}/{{ totalLines }} lines perfected</span>
                </div>
            </button>

            <div class="mode-btn-row">
                <button
                    :class="['mode-btn', 'mode-btn-half', { active: currentMode === 'drill' }]"
                    @click="$emit('modeChanged', 'drill')"
                >
                    <span class="mode-btn-icon">&#127942;</span>
                    <div class="mode-btn-text">
                        <span class="mode-btn-title">Drill</span>
                        <span class="mode-btn-subtitle">
                            <template v-if="currentMode === 'drill'">
                                Streak {{ drillStreak ?? 0 }} · Best {{ drillBestStreak ?? 0 }}
                            </template>
                            <template v-else>Random lines, build a streak</template>
                        </span>
                    </div>
                </button>
                <button
                    :class="['mode-btn', 'mode-btn-half', { active: currentMode === 'time' }]"
                    @click="$emit('modeChanged', 'time')"
                >
                    <span class="mode-btn-icon">&#9202;</span>
                    <div class="mode-btn-text">
                        <span class="mode-btn-title">Time</span>
                        <span class="mode-btn-subtitle">
                            <template v-if="currentMode === 'time'">
                                <span :class="{ 'time-low': (timeLeft ?? 0) <= 5, 'time-out': (timeLeft ?? 0) === 0 }">
                                    {{ timeLeft ?? 0 }}s left
                                </span>
                                <template v-if="bestTime != null"> · Best {{ bestTime }}s</template>
                            </template>
                            <template v-else>Beat the clock, -5s per mistake</template>
                        </span>
                    </div>
                </button>
            </div>

            <div class="mode-btn-row">
                <button class="mode-btn mode-btn-half locked" disabled>
                    <span class="mode-btn-icon">&#127793;</span>
                    <div class="mode-btn-text">
                        <span class="mode-btn-title">Puzzles</span>
                        <span class="mode-btn-subtitle">Learn 2 lines to unlock</span>
                    </div>
                </button>
                <button class="mode-btn mode-btn-half locked" disabled>
                    <span class="mode-btn-icon">&#10006;</span>
                    <div class="mode-btn-text">
                        <span class="mode-btn-title">Arena</span>
                        <span class="mode-btn-subtitle">Learn 2 lines to unlock</span>
                    </div>
                </button>
            </div>
        </div>

        <!-- ── Variations panel ──────────────────────────────── -->
        <div v-if="currentMode !== 'drill'" class="variations-section">

            <!-- Collapse toggle row -->
            <button class="variations-toggle" @click="variationsOpen = !variationsOpen">
                <span class="variations-toggle-left">
                    <span class="variations-label">Variations</span>
                    <span class="variations-count">{{ totalLines }}</span>
                </span>
                <span class="variations-chevron" :class="{ open: variationsOpen }">&#8964;</span>
            </button>

            <Transition name="slide-down">
                <div v-if="variationsOpen" class="variations-body">

                    <!-- Single view toggle -->
                    <div class="view-toggle">
                        <button class="view-pill" @click.stop="viewMode = viewMode === 'tree' ? 'list' : 'tree'">
                            <span>{{ viewMode === 'tree' ? '≡' : '⑂' }}</span>
                            {{ viewMode === 'tree' ? 'List view' : 'Tree view' }}
                        </button>
                    </div>

                    <!-- Scrollable content -->
                    <div class="variations-panel">

                        <!-- Tree view -->
                        <LineTree
                            v-if="viewMode === 'tree'"
                            :lines="opening.lines"
                            :current-line-index="currentLineIndex"
                            :played-moves="playedMoves"
                            :next-move="nextMove"
                            @line-changed="(i) => $emit('lineChanged', i)"
                        />

                        <!-- List view -->
                        <template v-else>
                            <button
                                v-for="(line, index) in opening.lines"
                                :key="index"
                                :class="['variation-btn', { active: index === currentLineIndex }]"
                                @click="$emit('lineChanged', index)"
                            >
                                <span class="variation-index">{{ index + 1 }}</span>
                                <span class="variation-name">{{ line.name }}</span>
                                <span v-if="index === currentLineIndex" class="variation-dot" />
                            </button>
                        </template>

                    </div>
                </div>
            </Transition>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { Opening } from "../../types/chess";
import LineTree from "./LineTree.vue";

interface Props {
    opening: Opening;
    currentLineIndex: number;
    currentMode: "learn" | "practice" | "drill" | "time";
    linesDiscovered: number;
    linesPerfected: number;
    status: string;
    description: string;
    playedMoves?: string[];
    nextMove?: string | null;
    isLineComplete?: boolean;
    drillStreak?: number;
    drillBestStreak?: number;
    timeLeft?: number;
    bestTime?: number | null;
}

const props = defineProps<Props>();

defineEmits<{
    (e: "modeChanged", mode: "learn" | "practice" | "drill" | "time"): void;
    (e: "lineChanged", index: number): void;
    (e: "continue"): void;
}>();

const variationsOpen = ref(true);
const viewMode = ref<"tree" | "list">("tree");

const totalLines = computed(() => props.opening.lines.length);

const currentLineName = computed(() => {
    return props.opening.lines[props.currentLineIndex]?.name ?? "";
});

const modeBadgeLabel = computed(() => {
    switch (props.currentMode) {
        case "learn": return "Learn";
        case "practice": return "Practice";
        case "drill": return "Drill";
        case "time": return "Time";
    }
});

const statusClass = computed(() => {
    if (props.status.includes("Correct") || props.status.includes("complete"))
        return "status-success";
    if (props.status.includes("Incorrect")) return "status-error";
    return "status-info";
});
</script>

<style scoped>
.sidebar {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    height: 100%;
    overflow-y: auto;
}

/* ── Header ──────────────────────────────────────────────── */
.sidebar-header {
    padding: 0.85rem 1rem;
    background: linear-gradient(180deg, rgba(14, 18, 36, 0.95) 0%, rgba(10, 12, 27, 0.95) 100%);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    position: relative;
    overflow: hidden;
}

.sidebar-header::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--accent-blue), var(--accent-green), var(--accent-purple), transparent);
    opacity: 0.6;
}

.header-top {
    display: flex;
    align-items: center;
    gap: 0.6rem;
}

.mode-badge {
    background: linear-gradient(135deg, var(--accent-blue), var(--accent-green), var(--accent-purple));
    color: #05060d;
    padding: 0.2rem 0.55rem;
    border-radius: 4px;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    box-shadow: 0 0 12px rgba(0, 245, 184, 0.35);
}

.opening-name {
    font-family: "Outfit", "Inter", system-ui, sans-serif;
    color: var(--text-primary);
    font-weight: 500;
    font-size: 1rem;
    letter-spacing: -0.015em;
    line-height: 1.2;
}

.line-number {
    color: var(--accent-cyan);
    margin-left: auto;
    font-size: 0.82rem;
    font-weight: 500;
    letter-spacing: 0.01em;
}

.line-name-header {
    color: var(--accent-green);
    margin-left: auto;
    font-size: 0.85rem;
    font-weight: 500;
    letter-spacing: -0.005em;
    max-width: 55%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* ── Commentary ──────────────────────────────────────────── */
.commentary {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
}

.commentary-icon {
    font-size: 1.5rem;
    color: var(--text-secondary);
    flex-shrink: 0;
    margin-top: 0.25rem;
}

.commentary-bubble {
    background: linear-gradient(180deg, rgba(14, 18, 36, 0.95) 0%, rgba(10, 12, 27, 0.95) 100%);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 0.8rem 1rem;
    flex: 1;
    box-shadow: inset 0 0 0 1px rgba(0, 240, 255, 0.04);
}

.commentary-bubble p {
    margin: 0;
    color: var(--text-primary);
    font-size: 0.9rem;
    line-height: 1.5;
}

.description-text { margin-bottom: 0.25rem; }

.status-text {
    margin-top: 0.5rem !important;
    font-weight: 600;
}

.status-success { color: var(--accent-green); }
.status-error   { color: #ef4444; }
.status-info    { color: var(--text-secondary); }

/* ── Continue button (shown when a line is complete) ─────── */
.continue-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    margin-top: 0.75rem;
    padding: 0.6rem 1rem;
    background: linear-gradient(135deg, var(--accent-blue), var(--accent-green), var(--accent-purple));
    color: #05060d;
    border: 1px solid transparent;
    border-radius: 8px;
    font-family: "Outfit", "Inter", system-ui, sans-serif;
    font-weight: 600;
    font-size: 0.92rem;
    letter-spacing: -0.01em;
    cursor: pointer;
    transition: filter 0.2s ease, box-shadow 0.2s ease;
    box-shadow: 0 0 18px rgba(0, 245, 184, 0.3);
}

.continue-btn:hover {
    filter: brightness(1.12);
    box-shadow: 0 0 24px rgba(0, 245, 184, 0.5);
}

.continue-hint {
    font-size: 0.74rem;
    font-weight: 600;
    opacity: 0.75;
    background: rgba(5, 6, 13, 0.18);
    padding: 0.1rem 0.45rem;
    border-radius: 4px;
}

/* ── Mode buttons ────────────────────────────────────────── */
.mode-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.mode-btn {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: linear-gradient(180deg, rgba(14, 18, 36, 0.95) 0%, rgba(10, 12, 27, 0.95) 100%);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
}

.mode-btn:hover:not(:disabled) {
    background: var(--bg-card-hover);
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent-soft), 0 0 14px rgba(0, 245, 184, 0.2);
}

.mode-btn.active {
    border-color: var(--accent-green);
    background: linear-gradient(135deg, rgba(0, 180, 255, 0.12), rgba(0, 245, 184, 0.14), rgba(168, 85, 247, 0.10));
    box-shadow: 0 0 0 1px var(--accent-soft), 0 0 20px rgba(0, 245, 184, 0.25);
}

.mode-btn.active .mode-btn-title {
    color: var(--accent-green);
}

.mode-btn.locked {
    opacity: 0.4;
    cursor: not-allowed;
    filter: grayscale(0.4);
}

.mode-btn-full { width: 100%; }
.mode-btn-row  { display: flex; gap: 0.5rem; }
.mode-btn-half { flex: 1; }

.mode-btn-icon     { font-size: 1.15rem; flex-shrink: 0; }
.mode-btn-text     { display: flex; flex-direction: column; gap: 0.1rem; }
.mode-btn-title    {
    font-family: "Outfit", "Inter", system-ui, sans-serif;
    font-weight: 500;
    font-size: 0.95rem;
    letter-spacing: -0.015em;
    line-height: 1.2;
}
.mode-btn-subtitle {
    font-size: 0.76rem;
    color: var(--text-secondary);
}

.time-low { color: #ffb84d; font-weight: 700; }
.time-out { color: #ff4d6d; font-weight: 700; }

/* ── Variations section ──────────────────────────────────── */
.variations-section {
    border: 1px solid var(--border-color);
    border-radius: 10px;
    overflow: hidden;
    background: linear-gradient(180deg, rgba(14, 18, 36, 0.95) 0%, rgba(10, 12, 27, 0.95) 100%);
}

.variations-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.65rem 1rem;
    background: transparent;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    transition: background 0.15s ease;
}

.variations-toggle:hover {
    background: rgba(0, 240, 255, 0.04);
    box-shadow: none;
}

.variations-toggle-left {
    display: flex;
    align-items: center;
    gap: 0.6rem;
}

.variations-label {
    font-family: "Outfit", "Inter", system-ui, sans-serif;
    font-weight: 500;
    font-size: 0.88rem;
    letter-spacing: -0.005em;
}

.variations-count {
    font-size: 0.74rem;
    font-weight: 600;
    background: rgba(0, 240, 255, 0.12);
    color: var(--accent-cyan);
    padding: 0.1rem 0.5rem;
    border-radius: 4px;
    border: 1px solid rgba(0, 240, 255, 0.3);
    line-height: 1.3;
}

.variations-chevron {
    font-size: 1rem;
    color: var(--text-secondary);
    transition: transform 0.22s ease;
    display: inline-block;
    line-height: 1;
}

.variations-chevron.open { transform: rotate(180deg); }

/* ── Body ────────────────────────────────────────────────── */
.variations-body {
    border-top: 1px solid var(--border-color);
}

/* ── View toggle ─────────────────────────────────────────── */
.view-toggle {
    display: flex;
    padding: 0.4rem 0.5rem;
    border-bottom: 1px solid var(--border-color);
}

.view-pill {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.3rem 0.75rem;
    margin-left: auto;
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-secondary);
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
}

.view-pill:hover {
    background: var(--bg-card-hover);
    color: var(--text-primary);
}

/* ── Scrollable panel ────────────────────────────────────── */
.variations-panel {
    padding: 0.4rem;
    max-height: 260px;
    overflow-y: auto;
}

.variations-panel::-webkit-scrollbar       { width: 4px; }
.variations-panel::-webkit-scrollbar-track { background: transparent; }
.variations-panel::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 2px;
}

/* ── List view buttons ───────────────────────────────────── */
.variation-btn {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 0.85rem;
    text-align: left;
    transition: all 0.15s ease;
}

.variation-btn:hover {
    background: var(--bg-card-hover);
    color: var(--text-primary);
    border-color: var(--border-color);
}

.variation-btn.active {
    background: rgba(76, 175, 80, 0.1);
    border-color: var(--accent-green);
    color: var(--accent-green);
}

.variation-index {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--text-secondary);
    background: rgba(70, 83, 98, 0.6);
    border-radius: 4px;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-family: "JetBrains Mono", monospace;
}

.variation-btn.active .variation-index {
    background: rgba(76, 175, 80, 0.2);
    color: var(--accent-green);
}

.variation-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.variation-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent-green);
    flex-shrink: 0;
}

/* ── Slide transition ────────────────────────────────────── */
.slide-down-enter-active,
.slide-down-leave-active {
    transition: max-height 0.25s ease, opacity 0.2s ease;
    overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to   { max-height: 0;    opacity: 0; }
.slide-down-enter-to,
.slide-down-leave-from { max-height: 400px; opacity: 1; }
</style>