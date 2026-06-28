<template>
  <div class="mini-board">
    <div v-for="(row, r) in rows" :key="r" class="mini-row">
      <div
        v-for="(sq, f) in row"
        :key="f"
        class="mini-square"
        :class="sq.isLight ? 'light' : 'dark'"
      >
        <span
          v-if="sq.glyph"
          class="mini-piece"
          :class="sq.white ? 'piece-white' : 'piece-black'"
        >{{ sq.glyph }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  fen: string;
  orientation?: 'white' | 'black';
}
const props = withDefaults(defineProps<Props>(), { orientation: 'white' });

// Filled glyphs for both colors (coloured via CSS) so the set looks consistent.
const GLYPH: Record<string, string> = {
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

interface Sq { glyph: string; isLight: boolean; white: boolean }

const rows = computed<Sq[][]>(() => {
  const placement = (props.fen || '').split(' ')[0];
  // grid[r][f]: r = 0 → rank 8 (top), f = 0 → file a
  const grid: (string | null)[][] = placement.split('/').map((row) => {
    const cells: (string | null)[] = [];
    for (const ch of row) {
      if (ch >= '1' && ch <= '8') {
        for (let i = 0; i < Number(ch); i++) cells.push(null);
      } else {
        cells.push(ch);
      }
    }
    return cells;
  });

  const order = props.orientation === 'black'
    ? [7, 6, 5, 4, 3, 2, 1, 0]
    : [0, 1, 2, 3, 4, 5, 6, 7];

  return order.map((r) =>
    order.map((f) => {
      const piece = grid[r]?.[f] ?? null;
      const rank = 8 - r;
      const isLight = (f + rank) % 2 === 0;
      if (!piece) return { glyph: '', isLight, white: false };
      return {
        glyph: GLYPH[piece.toLowerCase()] ?? '',
        isLight,
        white: piece === piece.toUpperCase(),
      };
    })
  );
});
</script>

<style scoped>
.mini-board {
  display: flex;
  flex-direction: column;
  aspect-ratio: 1 / 1;
  width: 100%;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  box-shadow: inset 0 0 0 1px rgba(0, 240, 255, 0.06);
  container-type: inline-size;
}

.mini-row {
  display: flex;
  flex: 1 1 0;
  min-height: 0;
}

.mini-square {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Cool slate squares to fit the neon-dark theme */
.mini-square.light { background: #8593a8; }
.mini-square.dark  { background: #46536a; }

.mini-piece {
  font-size: 10.5cqi;      /* ~0.84 of a square, scales with the board */
  line-height: 1;
  user-select: none;
}

/* Fallback if container query units are unsupported — still readable */
@supports not (font-size: 1cqi) {
  .mini-piece { font-size: min(3.6vw, 22px); }
}

.piece-white {
  color: #f6f8ff;
  text-shadow: 0 0 1px #11151f, 0 1px 1px rgba(0, 0, 0, 0.55);
}

.piece-black {
  color: #11141d;
  text-shadow: 0 0 1px rgba(255, 255, 255, 0.35);
}
</style>
