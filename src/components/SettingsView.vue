<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getEnginePath, setEnginePath, verifyEngine } from '../composables/useEngine';

const path = ref('');
const resolved = ref<string | null>(null);
const status = ref<'idle' | 'verifying' | 'ok' | 'error'>('idle');
const statusMsg = ref('');

onMounted(async () => {
  resolved.value = await getEnginePath();
  path.value = resolved.value ?? '';
});

async function onVerify() {
  const p = path.value.trim();
  if (!p) return;
  status.value = 'verifying';
  statusMsg.value = '';
  const err = await verifyEngine(p);
  if (err) {
    status.value = 'error';
    statusMsg.value = err;
  } else {
    status.value = 'ok';
    statusMsg.value = 'Engine OK — speaks UCI.';
  }
}

async function onSave() {
  const p = path.value.trim();
  if (!p) return;
  await setEnginePath(p);
  resolved.value = await getEnginePath();
  statusMsg.value = 'Saved.';
  status.value = 'idle';
}
</script>

<template>
  <section class="settings-view">
    <h2>Settings</h2>

    <div class="setting">
      <label class="setting-label">Chess engine (Stockfish)</label>
      <p class="setting-hint">
        Used for game analysis. Leave the default to auto-detect (En Croissant's
        engine, <code>STOCKFISH_PATH</code>, or <code>stockfish</code> on your PATH);
        or set an explicit path.
      </p>

      <div class="engine-row">
        <input
          v-model="path"
          class="engine-input"
          type="text"
          placeholder="/path/to/stockfish"
          spellcheck="false"
        />
        <button class="btn" :disabled="!path.trim() || status === 'verifying'" @click="onVerify">
          {{ status === 'verifying' ? 'Verifying…' : 'Verify' }}
        </button>
        <button class="btn primary" :disabled="!path.trim()" @click="onSave">Save</button>
      </div>

      <p v-if="statusMsg" class="status" :class="status">{{ statusMsg }}</p>

      <p v-if="resolved" class="resolved">
        Resolved engine: <code>{{ resolved }}</code>
      </p>
      <p v-else class="resolved none">No engine found — set a path above to enable analysis.</p>
    </div>
  </section>
</template>

<style scoped>
.settings-view {
  padding: 24px;
  max-width: 760px;
  margin: 0 auto;
  color: var(--text-primary);
}

.settings-view h2 {
  font-family: 'Outfit', sans-serif;
  font-weight: 600;
  margin: 0 0 20px;
}

.setting-label {
  display: block;
  font-weight: 600;
  margin-bottom: 4px;
}

.setting-hint {
  color: var(--text-secondary);
  font-size: 13px;
  margin: 0 0 12px;
}

.setting-hint code,
.resolved code {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 12px;
}

.engine-row {
  display: flex;
  gap: 8px;
}

.engine-input {
  flex: 1;
  padding: 8px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
}

.engine-input::placeholder {
  color: var(--text-muted);
}

.btn {
  padding: 8px 16px;
  background: var(--btn-bg);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn.primary {
  background: var(--grad-primary);
  color: #05060d;
  border: none;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.status {
  font-size: 13px;
  margin: 12px 0 0;
}

.status.ok {
  color: var(--accent-green);
}

.status.error {
  color: #ff8a8a;
}

.resolved {
  color: var(--text-secondary);
  font-size: 13px;
  margin: 14px 0 0;
}

.resolved.none {
  color: var(--text-muted);
}
</style>
