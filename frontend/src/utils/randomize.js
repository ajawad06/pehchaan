/**
 * Item randomization helpers.
 *
 * Every game picks its items ONCE per mount (via a useState initializer), never
 * on render — otherwise questions would change underneath the student mid-game.
 *
 * Which helper a game uses depends on what it measures:
 *
 *   - Ability tests (Pattern Hunter, Visual Spatial, Learning Agility) draw a
 *     random subset from a larger pool. Any item is as valid as any other, so a
 *     plain `sample` is fine.
 *
 *   - Measurement instruments (Instinct Swipe's RIASEC deck, the Big Five
 *     questionnaire) must keep an equal number of items per dimension or the
 *     score stops meaning anything. Those use `sampleBalanced`, which draws the
 *     same count from every group.
 */

/** Fisher-Yates. Returns a new array; never mutates the input. */
export function shuffle(list) {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** `count` random items, no repeats. Returns fewer if the pool is smaller. */
export function sample(list, count) {
  return shuffle(list).slice(0, Math.min(count, list.length))
}

/**
 * Draws `perGroup` items from every group, so each dimension stays equally
 * represented. Used where the balance of the item set IS the measurement.
 * The result is shuffled so groups don't appear in blocks.
 */
export function sampleBalanced(list, groupOf, perGroup) {
  const groups = new Map()
  for (const item of list) {
    const key = groupOf(item)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }
  const picked = []
  for (const items of groups.values()) picked.push(...sample(items, perGroup))
  return shuffle(picked)
}

/** Inclusive random integer in [min, max]. */
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** One random element. */
export function pick(list) {
  return list[Math.floor(Math.random() * list.length)]
}
