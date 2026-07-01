<template>
  <div class="chess-board-container">
      <TheChessboard
        :board-config="boardConfig"
        :player-color="playerColor"
        :reactive-config="true"
        :show-threats="false" 
        @board-created="onBoardCreated"
        @move="onMove"
      />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
// @ts-ignore
import { TheChessboard } from 'vue3-chessboard';
import 'vue3-chessboard/style.css';

interface Props {
  orientation?: 'white' | 'black';
  playerColor?: 'white' | 'black' | 'both';
}

const props = withDefaults(defineProps<Props>(), {
  orientation: 'white',
  playerColor: 'both',
});

const emit = defineEmits<{
  (e: 'boardCreated', api: any): void;
  (e: 'move', move: any): void;
}>();

// In your TheChessboard wrapper component (File 1)

const boardConfig = computed(() => ({
  orientation: props.orientation,
  coordinates: true,
  highlight: {
    lastMove: true,
    check: true,
  },
 

}));

const onBoardCreated = (api: any) => emit('boardCreated', api);
const onMove = (move: any) => emit('move', move);
</script>

<style scoped>
.chess-board-container {
  position: relative;
  width: 100%;
  max-width: 600px;
  aspect-ratio: 1;
}

/* vue3-chessboard/chessground sizes itself off the viewport and ignores this
   container, overflowing into the sidebar. Pin its board to the container's box
   (which has a definite size via aspect-ratio) so it can never exceed it. */
.chess-board-container :deep(.main-board) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding-bottom: 0;
}

.chess-board-container :deep(.cg-wrap) {
  width: 100%;
  height: 100%;
}
</style>
