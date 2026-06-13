import type { Line, MoveStep, TreeMove } from "../types/chess";

/**
 * Flattens an opening tree into an array of lines. Each path from root to leaf
 * becomes one Line. Shared moves are stored only once in the tree.
 */
export function linesFromTree(tree: TreeMove[]): Line[] {
  const lines: Line[] = [];
  function traverse(
    moves: TreeMove[],
    path: MoveStep[],
    lineName: string,
    lineDescription: string
  ) {
    for (const node of moves) {
      const step: MoveStep = { san: node.san, description: node.description };
      const newPath = [...path, step];
      const name = node.lineName ?? lineName;
      const desc = node.lineDescription ?? lineDescription;
      const variations = node.variations ?? [];
      if (variations.length === 0) {
        lines.push({ name, description: desc, moves: newPath });
      } else {
        traverse(variations, newPath, name, desc);
      }
    }
  }
  traverse(tree, [], "", "");
  return lines;
}
