// Hand-picked, in priority order. Each group is a list of candidate patterns
// for the *same* model (fallbacks in case the exact id string differs by
// provider/version) — the first pattern that matches wins the slot, and the
// rest of the group is skipped so two patterns can't both claim a slot.
export const CURATED_MODEL_GROUPS: string[][] = [
  ["deepseek-v4-pro", "deepseek-v4"],
  ["kimi-k2.6", "kimi-k2"],
  ["glm-5.2", "glm-5"],
  ["qwen3.5", "qwen3"],
  ["llama-4-maverick"],
  ["minimax-m2.7", "minimax-m2"],
];

export function pickCuratedModels<T extends { id: string }>(models: T[]): T[] {
  const picked: T[] = [];
  const usedIds = new Set<string>();

  for (const patterns of CURATED_MODEL_GROUPS) {
    for (const pattern of patterns) {
      const match = models.find(
        (m) => !usedIds.has(m.id) && m.id.toLowerCase().includes(pattern)
      );
      if (match) {
        picked.push(match);
        usedIds.add(match.id);
        break;
      }
    }
  }

  return picked;
}
