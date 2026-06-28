import type { Line, MoveStep, TreeMove } from "../types/chess";

/**
 * Flattens an opening tree into an array of lines. Each path from root to leaf
 * becomes one Line. Shared moves are stored only once in the tree.
 *
 * In addition, every *named* branch node whose name no leaf already carries
 * (i.e. a pure parent grouping, like "Classical Variation") is emitted as its
 * own "shared trunk" line: the moves from the root up to the point where that
 * branch first forks. This lets each branch be learned on its own — you can
 * study the shared mainline, then drill the individual sub-variations.
 */
export function linesFromTree(tree: TreeMove[]): Line[] {
  // Pre-pass: collect every name that an actual leaf line carries, so we don't
  // emit a duplicate (or name-clashing) trunk line for it.
  const leafNames = new Set<string>();
  (function collectLeafNames(moves: TreeMove[], inherited: string) {
    for (const node of moves) {
      const name = node.lineName ?? inherited;
      const variations = node.variations ?? [];
      if (variations.length === 0) leafNames.add(name);
      else collectLeafNames(variations, name);
    }
  })(tree, "");

  const lines: Line[] = [];

  // Walk the forced (single-child) continuation from a node, returning the
  // moves from this node up to — and including — the first fork or leaf.
  function forcedContinuation(node: TreeMove): MoveStep[] {
    const steps: MoveStep[] = [{ san: node.san, description: node.description }];
    let cur = node;
    while (cur.variations && cur.variations.length === 1) {
      cur = cur.variations[0];
      steps.push({ san: cur.san, description: cur.description });
    }
    return steps;
  }

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
        // A named branch that no leaf carries gets its own shared-trunk line,
        // ending where the branch first splits.
        if (node.lineName && !leafNames.has(node.lineName)) {
          lines.push({
            name: node.lineName,
            description: node.lineDescription ?? desc,
            moves: [...path, ...forcedContinuation(node)],
          });
        }
        traverse(variations, newPath, name, desc);
      }
    }
  }
  traverse(tree, [], "", "");
  return lines;
}
