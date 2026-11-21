import { dpr, mulberry32 } from './env'

/**
 * The persistent night sky behind scenes I–III.
 * Three depth layers react to pointer (desktop) / device tilt-free drag (touch) and to scroll.
 * Pauses itself when the tab is hidden or when the canvas is faded out.
 */

type Star = { x: number; y: number; z: number; r: number; tw: number; ph: number; c: number }
type Meteor = { x: number; y: number; vx: number; vy: number; life: number }

const COLORS = ['244,238,227', '216,190,142', '169,156,203']

export class Sky {
  private ctx: CanvasRenderingContext2D
  private stars: Star[] = []
  private meteor: Meteor | null = null
  private raf = 0
  private w = 0
  private h = 0
  private px = 0
  private py = 0
  private tx = 0
  private ty = 0
  private last = 0
  private nextMeteor = 6
  private running = false
  private reduced: boolean
  visible = true

  constructor(private canvas: HTMLCanvasElement, reduced: boolean) {
    this.ctx = canvas.getContext('2d', { alpha: true })!
    this.reduced = reduced
    this.resize()
    window.addEventListener('resize', this.resize)
    window.addEventListener('pointermove', this.onPointer, { passive: true })
    document.addEventListener('visibilitychange', this.onVis)
  }

  private onVis = () => {
    if (document.hidden) this.stop()
    else this.start()
  }

  private onPointer = (e: PointerEvent) => {
    this.tx = (e.clientX / this.w - 0.5) * 2
    this.ty = (e.clientY / this.h - 0.5) * 2
  }

  private resize = () => {
    const w = window.innerWidth
    // use the large viewport so the URL bar collapsing on mobile doesn't trigger a re-seed
    const h = Math.max(window.innerHeight, document.documentElement.clientHeight)
    if (Math.abs(w - this.w) < 2 && Math.abs(h - this.h) < 120 && this.stars.length) return
    this.w = w
    this.h = h
    const r = dpr()
    this.canvas.width = Math.round(w * r)
    this.canvas.height = Math.round(h * r)
    this.ctx.setTransform(r, 0, 0, r, 0, 0)
    const rand = mulberry32(2023)
    const count = Math.round(Math.min(320, Math.max(120, (w * h) / 4200)))
    this.stars = Array.from({ length: count }, () => {
      const z = rand()
      return {
        x: rand() * w,
        y: rand() * h,
        z,
        r: 0.35 + z * z * 1.35,
        tw: 0.4 + rand() * 1.6,
        ph: rand() * Math.PI * 2,
        c: rand() < 0.78 ? 0 : rand() < 0.6 ? 1 : 2,
      }
    })
    if (this.reduced) this.draw(0, 0)
  }

  start() {
    if (this.running || this.reduced) {
      if (this.reduced) this.draw(0, 0)
      return
    }
    this.running = true
    this.last = performance.now()
    const loop = (now: number) => {
      if (!this.running) return
      const dt = Math.min(0.05, (now - this.last) / 1000)
      this.last = now
      if (this.visible) this.draw(now / 1000, dt)
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  private draw(t: number, dt: number) {
    const { ctx, w, h } = this
    this.px += (this.tx - this.px) * 0.04
    this.py += (this.ty - this.py) * 0.04
    const scroll = window.scrollY
    ctx.clearRect(0, 0, w, h)

    for (const s of this.stars) {
      const depth = 0.15 + s.z
      let x = s.x - this.px * 18 * depth
      let y = s.y - this.py * 12 * depth - scroll * 0.06 * depth
      y = ((y % h) + h) % h
      x = ((x % w) + w) % w
      const a = this.reduced ? 0.6 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.tw + s.ph)) * (0.4 + s.z * 0.6)
      ctx.fillStyle = `rgba(${COLORS[s.c]},${a.toFixed(3)})`
      if (s.r > 1.25) {
        // the brightest few get a soft halo
        ctx.globalAlpha = 0.12 * a
        ctx.beginPath()
        ctx.arc(x, y, s.r * 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }
      ctx.fillRect(x - s.r / 2, y - s.r / 2, s.r, s.r)
    }

    if (this.reduced) return
    // an occasional shooting star — rare enough to feel like a small gift
    this.nextMeteor -= dt
    if (!this.meteor && this.nextMeteor <= 0) {
      const fromLeft = Math.random() < 0.5
      this.meteor = {
        x: fromLeft ? Math.random() * w * 0.5 : w * 0.5 + Math.random() * w * 0.5,
        y: Math.random() * h * 0.4,
        vx: (fromLeft ? 1 : -1) * (520 + Math.random() * 260),
        vy: 200 + Math.random() * 120,
        life: 1,
      }
      this.nextMeteor = 9 + Math.random() * 12
    }
    const m = this.meteor
    if (m) {
      m.x += m.vx * dt
      m.y += m.vy * dt
      m.life -= dt * 1.1
      const len = 0.09
      const g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * len, m.y - m.vy * len)
      g.addColorStop(0, `rgba(244,238,227,${Math.max(0, m.life) * 0.9})`)
      g.addColorStop(1, 'rgba(244,238,227,0)')
      ctx.strokeStyle = g
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(m.x, m.y)
      ctx.lineTo(m.x - m.vx * len, m.y - m.vy * len)
      ctx.stroke()
      if (m.life <= 0) this.meteor = null
    }
  }

  destroy() {
    this.stop()
    window.removeEventListener('resize', this.resize)
    window.removeEventListener('pointermove', this.onPointer)
    document.removeEventListener('visibilitychange', this.onVis)
  }
}
