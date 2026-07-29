/** A tiny deterministic PRNG suitable for replayable game simulations. */
export function createRandom(seed = 1) {
  let value = Number(seed) >>> 0 || 1;

  return {
    next() {
      value += 0x6d2b79f5;
      let result = value;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    },
    get state() {
      return value >>> 0;
    },
    set state(next) {
      value = Number(next) >>> 0 || 1;
    },
  };
}
