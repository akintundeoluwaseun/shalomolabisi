import { dpr, mulberry32 } from './env'

/**
 * Generative engraved blooms for the celebration.
 * Each bloom is a sequence of fine hatched strokes (Fibonacci petal counts, golden-angle stamens)
 * drawn a few strokes per frame onto an accumulating canvas — like ink being laid down.
 */

export type BloomSpec = {
  x: number // 0..1 of width
  y: number // 0..1 of height
  radius: number // px
  seed: number
  palette: string[] // outer → inner, as 'r,g,b'
  alpha?: number
  speed?: number // strokes per frame
}

type Stroke = (ctx: CanvasRenderingContext2D, w: number, h: number) => void

function* strokes(spec: BloomSpec): Generator<Stroke> {
  const rand = mulberry32(spec.seed)
  const R = spec.radius
  const layers = [
    { n: 13, len: 1, width: 0.62, hatch: 15, col: spec.palette[0] },
    { n: 8, len: 0.74, width: 0.7, hatch: 14, col: spec.palette[1] },
    { n: 5, len: 0.48, width: 0.8, hatch: 12, col: spec.palette[2] ?? spec.palette[1] },
  ]
  const baseA = spec.alpha ?? 0.42
  const rot0 = rand() * Math.PI * 2

  for (const [li, L] of layers.entries()) {
    const step = (Math.PI * 2) / L.n
    const rot = rot0 + li * step * 0.5
    const petals = Array.from({ length: L.n }, (_, k) => ({
      a: rot + k * step + (rand() - 0.5) * 0.08,
      len: R * L.len * (0.9 + rand() * 0.16),
      sway: (rand() - 0.5) * 0.35,
    }))
    for (let j = 0; j < L.hatch; j++) {
      const u = j / (L.hatch - 1)
      for (const p of petals) {
        yield (ctx, w, h) => {
          const cx = spec.x * w
          const cy = spec.y * h
          const ang = p.a + (u - 0.5) * step * L.width
          const shape = Math.pow(Math.sin(Math.PI * u), 0.55)
          const r1 = p.len * (0.35 + 0.65 * shape)
          const r0 = R * 0.07
          const x0 = cx + Math.cos(ang) * r0
          const y0 = cy + Math.sin(ang) * r0
          const x1 = cx + Math.cos(p.a + (u - 0.5) * step * L.width * 0.55) * r1
          const y1 = cy + Math.sin(p.a + (u - 0.5) * step * L.width * 0.55) * r1
          const mid = r1 * 0.55
          const ca = ang + p.sway
          ctx.strokeStyle = `rgba(${L.col},${(baseA * (0.55 + 0.45 * shape)).toFixed(3)})`
          ctx.lineWidth = 0.7
          ctx.beginPath()
          ctx.moveTo(x0, y0)
          ctx.quadraticCurveTo(cx + Math.cos(ca) * mid, cy + Math.sin(ca) * mid, x1, y1)
          ctx.stroke()
        }
      }
    }
    // petal outlines for definition
    for (const p of petals) {
      yield (ctx, w, h) => {
        const cx = spec.x * w
        const cy = spec.y * h
        ctx.strokeStyle = `rgba(${L.col},${(baseA * 0.9).toFixed(3)})`
        ctx.lineWidth = 0.9
        ctx.beginPath()
        const segs = 18
        for (let s = 0; s <= segs; s++) {
          const u = s / segs
          const shape = Math.pow(Math.sin(Math.PI * u), 0.55)
          const r1 = Math.max(R * 0.07, p.len * (0.35 + 0.65 * shape) * (s === 0 || s === segs ? 0.2 : 1))
          const ang = p.a + (u - 0.5) * step * L.width * 0.55
          const x = cx + Math.cos(ang) * r1
          const y = cy + Math.sin(ang) * r1
          if (s === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
    }
  }
  // stamens on a golden-angle spiral
  const N = Math.round(60 + R * 0.4)
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let k = 0; k < N; k++) {
    yield (ctx, w, h) => {
      const cx = spec.x * w
      const cy = spec.y * h
      const rr = R * 0.13 * Math.sqrt(k / N)
      const a = k * golden
      ctx.fillStyle = `rgba(${spec.palette[1]},${(0.5 + 0.5 * (k / N)).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0.6 + (k / N) * 1.1, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

export class Garden {
  private ctx: CanvasRenderingContext2D
  private jobs: { gen: Generator<Stroke>; speed: number }[] = []
  private specs: BloomSpec[] = []
  private raf = 0
  private w = 0
  private h = 0
  private ro: ResizeObserver

  constructor(private canvas: HTMLCanvasElement, private reduced: boolean) {
    this.ctx = canvas.getContext('2d')!
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(canvas)
    this.resize()
  }

  get count() {
    return this.specs.length
  }

  private resize() {
    const r = this.canvas.getBoundingClientRect()
    const w = Math.round(r.width)
    const h = Math.round(r.height)
    if (!w || !h || (w === this.w && Math.abs(h - this.h) < 120)) return
    this.w = w
    this.h = h
    const d = dpr()
    this.canvas.width = Math.round(w * d)
    this.canvas.height = Math.round(h * d)
    this.ctx.setTransform(d, 0, 0, d, 0, 0)
    // re-ink everything already planted, instantly
    this.jobs = []
    for (const s of this.specs) {
      for (const draw of strokes(s)) draw(this.ctx, w, h)
    }
  }

  plant(spec: BloomSpec) {
    this.specs.push(spec)
    if (this.reduced) {
      for (const draw of strokes(spec)) draw(this.ctx, this.w, this.h)
      return
    }
    this.jobs.push({ gen: strokes(spec), speed: spec.speed ?? 10 })
    if (!this.raf) this.raf = requestAnimationFrame(this.tick)
  }

  private tick = () => {
    this.raf = 0
    this.jobs = this.jobs.filter((job) => {
      for (let i = 0; i < job.speed; i++) {
        const n = job.gen.next()
        if (n.done) return false
        n.value(this.ctx, this.w, this.h)
      }
      return true
    })
    if (this.jobs.length) this.raf = requestAnimationFrame(this.tick)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
  }
}
