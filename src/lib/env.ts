export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const isFinePointer = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

/** Cap device pixel ratio — retina phones at 3x cost a lot for little visible gain on particles. */
export const dpr = (): number => Math.min(window.devicePixelRatio || 1, 2)

/** Small deterministic PRNG so compositions are identical across visits. */
export const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** SVG path for the four-point star motif, centred on 0,0. */
export const starPath = (r: number, waist = 0.18) => {
  const w = r * waist
  return `M0 ${-r} C${w} ${-w} ${w} ${-w} ${r} 0 C${w} ${w} ${w} ${w} 0 ${r} C${-w} ${w} ${-w} ${w} ${-r} 0 C${-w} ${-w} ${-w} ${-w} 0 ${-r}Z`
}

export const vibrate = (ms: number) => {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* not supported */
  }
}
