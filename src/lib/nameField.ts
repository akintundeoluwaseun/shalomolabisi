import { clamp, dpr, easeInOutCubic, lerp, mulberry32 } from './env'

/**
 * "Shalom", written in stardust.
 * The letterforms are sampled from the display face on an offscreen canvas; each sample becomes
 * a particle that drifts loosely around the screen until `progress` (driven by the visitor's
 * press-and-hold) pulls it home. Particles flee the pointer/finger and spring back afterwards.
 */

type P = {
  x: number
  y: number
  vx: number
  vy: number
  hx: number
  hy: number
  tx: number
  ty: number
  d: number
  s: number
  ph: number
}

const PALETTE = ['244,238,227', '216,190,142', '169,156,203']

export class NameField {
  progress = 0
  private groups: P[][] = [[], [], []]
  private ctx: CanvasRenderingContext2D
  private w = 0
  private h = 0
  private raf = 0
  private running = false
  private mx = -9999
  private my = -9999
  private pointerActive = false
  private lockedAt = -1
  private t0 = performance.now()
  private ro: ResizeObserver
  private io: IntersectionObserver
  private onScreen = true
  private font = ''
  private textY = 0

  constructor(
    private canvas: HTMLCanvasElement,
    private text: string,
    private reduced: boolean,
    private anchorY = 0.44,
  ) {
    this.ctx = canvas.getContext('2d')!
    this.ro = new ResizeObserver(() => this.layout())
    this.ro.observe(canvas)
    this.io = new IntersectionObserver(([e]) => {
      this.onScreen = e.isIntersecting
    })
    this.io.observe(canvas)
    window.addEventListener('pointermove', this.onMove, { passive: true })
    window.addEventListener('pointerdown', this.onMove, { passive: true })
    window.addEventListener('pointerup', this.onUp, { passive: true })
    window.addEventListener('pointercancel', this.onUp, { passive: true })
  }

  private onMove = (e: PointerEvent) => {
    const r = this.canvas.getBoundingClientRect()
    this.mx = e.clientX - r.left
    this.my = e.clientY - r.top
    this.pointerActive = true
  }

  private onUp = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') {
      this.pointerActive = false
      this.mx = this.my = -9999
    }
  }

  async init() {
    try {
      await document.fonts.load(`italic 400 120px Fraunces`, this.text)
    } catch {
      /* fall back to whatever serif is available */
    }
    this.layout()
    this.start()
  }

  private layout() {
    const rect = this.canvas.getBoundingClientRect()
    const w = Math.round(rect.width)
    const h = Math.round(rect.height)
    if (!w || !h || (w === this.w && Math.abs(h - this.h) < 120 && this.groups[0].length)) return
    this.w = w
    this.h = h
    const r = dpr()
    this.canvas.width = Math.round(w * r)
    this.canvas.height = Math.round(h * r)
    this.ctx.setTransform(r, 0, 0, r, 0, 0)

    // sample the letterforms
    const off = document.createElement('canvas')
    off.width = w
    off.height = h
    const o = off.getContext('2d', { willReadFrequently: true })!
    let size = Math.min(w * 0.3, h * (w >= 900 ? 0.27 : 0.3), 260)
    const font = (s: number) => `italic 400 ${s}px Fraunces, Georgia, serif`
    o.font = font(size)
    const measured = o.measureText(this.text).width
    if (measured > w * 0.86) size *= (w * 0.86) / measured
    o.font = font(size)
    this.font = font(size)
    this.textY = h * (w >= 900 ? this.anchorY - 0.07 : this.anchorY)
    o.textAlign = 'center'
    o.textBaseline = 'middle'
    o.fillStyle = '#fff'
    o.fillText(this.text, w / 2, this.textY)
    const data = o.getImageData(0, 0, w, h).data

    const max = w < 700 ? 1150 : 2100
    let gap = Math.max(2, Math.round(size / 42))
    let pts: [number, number][] = []
    for (;;) {
      pts = []
      for (let y = 0; y < h; y += gap)
        for (let x = 0; x < w; x += gap) if (data[(y * w + x) * 4 + 3] > 140) pts.push([x, y])
      if (pts.length <= max || gap > 8) break
      gap++
    }

    const rand = mulberry32(1103)
    this.groups = [[], [], []]
    for (const [x, y] of pts) {
      const c = rand() < 0.7 ? 0 : rand() < 0.65 ? 1 : 2
      const hx = rand() * w
      const hy = rand() * h
      this.groups[c].push({
        x: hx,
        y: hy,
        vx: 0,
        vy: 0,
        hx,
        hy,
        tx: x + (rand() - 0.5) * gap * 0.6,
        ty: y + (rand() - 0.5) * gap * 0.6,
        d: rand() * 0.55,
        s: 0.9 + rand() * (gap * 0.42),
        ph: rand() * Math.PI * 2,
      })
    }
    if (this.reduced) this.drawStatic()
  }

  lock() {
    this.progress = 1
    this.lockedAt = (performance.now() - this.t0) / 1000
    if (this.reduced) this.drawStatic()
  }

  private drawStatic() {
    const { ctx } = this
    ctx.clearRect(0, 0, this.w, this.h)
    const p = this.progress
    if (p >= 1) this.drawName(0.96)
    this.groups.forEach((g, ci) => {
      ctx.fillStyle = `rgb(${PALETTE[ci]})`
      for (const q of g) {
        const x = lerp(q.hx, q.tx, p)
        const y = lerp(q.hy, q.ty, p)
        ctx.globalAlpha = 0.3 + 0.7 * p
        ctx.fillRect(x, y, q.s, q.s)
      }
    })
    ctx.globalAlpha = 1
  }

  /** In reduced-motion mode the hold still works — it just renders discrete frames. */
  setProgressStatic(p: number) {
    this.progress = p
    if (this.reduced) this.drawStatic()
  }

  start() {
    if (this.running || this.reduced) return
    this.running = true
    const loop = () => {
      if (!this.running) return
      if (this.onScreen && !document.hidden) this.frame()
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  private frame() {
    const { ctx, w, h } = this
    const t = (performance.now() - this.t0) / 1000
    ctx.clearRect(0, 0, w, h)
    const R = this.pointerActive ? (w < 700 ? 58 : 80) : 0
    const R2 = R * R
    const locked = this.lockedAt >= 0
    const sweep = locked ? (t - this.lockedAt) * 1.1 : -1
    const sweepX = sweep * (w + 400) - 200
    // once gathered, the name resolves into crisp type; the stars stay on as sparkle
    const solid = locked ? Math.min(1, Math.max(0, (t - this.lockedAt - 0.25) / 1.4)) : 0
    const solidE = solid * solid * (3 - 2 * solid)
    if (solidE > 0) this.drawName(solidE * 0.96)

    for (let ci = 0; ci < 3; ci++) {
      const g = this.groups[ci]
      ctx.fillStyle = `rgb(${PALETTE[ci]})`
      for (const q of g) {
        const pi = easeInOutCubic(clamp((this.progress * 1.55 - q.d) / 1))
        // drifting home position
        const hx = q.hx + Math.sin(t * 0.25 + q.ph) * 26
        const hy = q.hy + Math.cos(t * 0.21 + q.ph) * 22
        // a breath of motion even when locked, so the name feels alive
        const bx = q.tx + Math.sin(t * 1.3 + q.ph) * 0.6
        const by = q.ty + Math.cos(t * 1.1 + q.ph) * 0.6
        const dx = lerp(hx, bx, pi)
        const dy = lerp(hy, by, pi)
        q.vx += (dx - q.x) * 0.075
        q.vy += (dy - q.y) * 0.075
        if (R) {
          const ox = q.x - this.mx
          const oy = q.y - this.my
          const d2 = ox * ox + oy * oy
          if (d2 < R2 && d2 > 0.01) {
            const d = Math.sqrt(d2)
            const f = (1 - d / R) * 6.5
            q.vx += (ox / d) * f
            q.vy += (oy / d) * f
          }
        }
        q.vx *= 0.78
        q.vy *= 0.78
        q.x += q.vx
        q.y += q.vy

        let a = (0.38 + 0.62 * pi) * (1 - solidE * 0.6)
        a *= 0.75 + 0.25 * Math.sin(t * 2 + q.ph)
        if (locked) {
          const ds = Math.abs(q.x - sweepX)
          if (ds < 120) a = Math.min(1, a + (1 - ds / 120) * 0.9)
        }
        ctx.globalAlpha = a
        ctx.fillRect(q.x, q.y, q.s, q.s)
      }
    }
    ctx.globalAlpha = 1
  }

  private drawName(alpha: number) {
    const { ctx } = this
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.font = this.font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#f6f0e4'
    ctx.shadowColor = 'rgba(216,190,142,0.35)'
    ctx.shadowBlur = 24
    ctx.fillText(this.text, this.w / 2, this.textY)
    ctx.restore()
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  destroy() {
    this.stop()
    this.ro.disconnect()
    this.io.disconnect()
    window.removeEventListener('pointermove', this.onMove)
    window.removeEventListener('pointerdown', this.onMove)
    window.removeEventListener('pointerup', this.onUp)
    window.removeEventListener('pointercancel', this.onUp)
  }
}
