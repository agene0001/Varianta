<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  listGames,
  importGames,
  opponent,
  outcome,
  type Game,
} from '../composables/useGames';

const PAGE_SIZE = 25;

const username = ref('');
const games = ref<Game[]>([]);
const visibleCount = ref(PAGE_SIZE);
const loading = ref(false);
const error = ref('');

const visibleGames = computed(() => games.value.slice(0, visibleCount.value));
const hasMore = computed(() => visibleCount.value < games.value.length);

function setGames(list: Game[]) {
  games.value = list;
  visibleCount.value = PAGE_SIZE; // reset paging whenever the set changes
}

function viewMore() {
  visibleCount.value = Math.min(visibleCount.value + PAGE_SIZE, games.value.length);
}

onMounted(async () => {
  try {
    setGames(await listGames());
  } catch (e) {
    error.value = String(e);
  }
});

async function onImport() {
  const name = username.value.trim();
  if (!name) return;
  loading.value = true;
  error.value = '';
  try {
    setGames(await importGames(name));
  } catch (e) {
    error.value = String(e);
  } finally {
    loading.value = false;
  }
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString();
}

const outcomeLabel: Record<string, string> = {
  win: 'W',
  loss: 'L',
  draw: '½',
  unknown: '–',
};
</script>

<template>
  <section class="games-view">
    <header class="games-header">
      <h2>My Games</h2>
      <form class="import-bar" @submit.prevent="onImport">
        <input
          v-model="username"
          class="username-input"
          type="text"
          placeholder="Chess.com username"
          :disabled="loading"
        />
        <button class="import-btn" type="submit" :disabled="loading || !username.trim()">
          {{ loading ? 'Importing…' : 'Import' }}
        </button>
      </form>
    </header>

    <p v-if="error" class="games-error">{{ error }}</p>

    <p v-if="!games.length && !loading" class="games-empty">
      No games imported yet. Enter your Chess.com username above and click Import.
    </p>

    <div v-else-if="games.length" class="games-table-wrap">
      <table class="games-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Color</th>
            <th>Opponent</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="g in visibleGames" :key="g.id">
            <td>{{ fmtDate(g.played_at) }}</td>
            <td>
              <span class="color-dot" :class="g.player_color"></span>
              {{ g.player_color }}
            </td>
            <td>{{ opponent(g) }}</td>
            <td>
              <span class="result" :class="outcome(g)">{{ outcomeLabel[outcome(g)] }}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <footer class="games-footer">
        <span class="games-count">Showing {{ visibleGames.length }} of {{ games.length }}</span>
        <button v-if="hasMore" class="view-more-btn" @click="viewMore">View more</button>
      </footer>
    </div>
  </section>
</template>

<style scoped>
.games-view {
  padding: 24px;
  max-width: 880px;
  margin: 0 auto;
  color: var(--text-primary);
}

.games-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.games-header h2 {
  font-family: 'Outfit', sans-serif;
  font-weight: 600;
  margin: 0;
}

.import-bar {
  display: flex;
  gap: 8px;
}

.username-input {
  padding: 8px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
}

.username-input::placeholder {
  color: var(--text-muted);
}

.import-btn {
  padding: 8px 18px;
  background: var(--grad-primary);
  color: #05060d;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
}

.import-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.games-error {
  color: #ff8a8a;
  background: rgba(220, 38, 38, 0.12);
  border: 1px solid rgba(220, 38, 38, 0.4);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
}

.games-empty {
  color: var(--text-muted);
  text-align: center;
  padding: 48px 0;
}

.games-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.games-table th {
  text-align: left;
  color: var(--text-secondary);
  font-weight: 500;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
}

.games-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(42, 52, 112, 0.4);
  text-transform: capitalize;
  color: var(--text-primary);
}

.color-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 6px;
  border: 1px solid var(--border-bright);
  vertical-align: middle;
}

.color-dot.white {
  background: #e6ecff;
}

.color-dot.black {
  background: #05060d;
}

.result {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 12px;
}

.result.win {
  background: rgba(0, 245, 184, 0.18);
  color: var(--accent-green);
}

.result.loss {
  background: rgba(255, 80, 80, 0.16);
  color: #ff8a8a;
}

.result.draw {
  background: rgba(138, 150, 196, 0.16);
  color: var(--text-secondary);
}

.result.unknown {
  background: rgba(90, 100, 146, 0.12);
  color: var(--text-muted);
}

.games-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 18px 0;
}

.games-count {
  color: var(--text-muted);
  font-size: 13px;
}

.view-more-btn {
  background: var(--btn-bg);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-weight: 600;
  padding: 8px 20px;
  border-radius: 8px;
  cursor: pointer;
}
</style>
