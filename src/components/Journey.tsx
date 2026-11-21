import { useLayoutEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'
import { journey } from '../content/story'
import { mulberry32, starPath } from '../lib/env'
import { SplitWords } from './Split'

const VB = { w: 360, h: 440 }
const NODES = [
  { x: 64, y: 372 },
  { x: 150, y: 296 },
  { x: 92, y: 196 },
  { x: 226, y: 148 },
  { x: 300, y: 62 },
]
// labels sit to whichever side has room
const LABEL_SIDE = [1, 1, 1, 1, 0]

function segPath(a: { x: number; y: number }, b: { x: number; y: number }, bend: number) {
  const mx = (a.x + b.x) / 2 + (b.y - a.y) * bend
  const my = (a.y + b.y) / 2 - (b.x - a.x) * bend
  return `M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}`
}

export function Journey({ reduced }: { reduced: boolean }) {
  const root = useRef<HTMLElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const lines = useRef<(SVGLineElement | null)[]>([])
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  const dust = useMemo(() => {
    const r = mulberry32(7)
    return Array.from({ length: 70 }, () => ({ x: r() * VB.w, y: r() * VB.h, r: 0.4 + r() * 1.1, o: 0.15 + r() * 0.45 }))
  }, [])
  const satellites = useMemo(() => {
    const r = mulberry32(19)
    return NODES.map((n) =>
      Array.from({ length: 3 }, () => {
        const a = r() * Math.PI * 2
        const d = 14 + r() * 16
        return { x: n.x + Math.cos(a) * d, y: n.y + Math.sin(a) * d, r: 0.7 + r() * 0.8 }
      }),
    )
  }, [])

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root)
      const segs = q('.seg') as unknown as SVGPathElement[]
      segs.forEach((p) => {
        const L = p.getTotalLength()
        p.style.strokeDasharray = `${L}`
        p.style.strokeDashoffset = reduced ? '0' : `${L}`
      })
      if (reduced) return

      // header reveal, independent of the scrub
      gsap.from(q('.journey__head .sw__i'), {
        yPercent: 110,
        duration: 1.3,
        ease: 'expo.out',
        stagger: 0.05,
        scrollTrigger: { trigger: root.current, start: 'top 75%' },
      })

      gsap.set(q('.node__halo, .node__core'), { transformOrigin: '50% 50%', transformBox: 'fill-box' })
      gsap.set(q('.node__halo'), { scale: 0, opacity: 0 })
      gsap.set(q('.node__core'), { scale: 0.55, opacity: 0.35 })
      gsap.set(q('.node__label'), { opacity: 0 })
      gsap.set(q('.cap'), { autoAlpha: 0 })
      gsap.set(q('.journey__coda'), { autoAlpha: 0, y: 16 })

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: () => `+=${window.innerHeight * 4.2}`,
          pin: q('.journey__pin')[0],
          scrub: 0.7,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            root.current?.style.setProperty('--prog', self.progress.toFixed(4))
          },
        },
      })
      tlRef.current = tl

      NODES.forEach((_, i) => {
        const at = i * 2
        tl.addLabel(`n${i}`, at)
        tl.to(q(`.node-${i} .node__halo`), { scale: 1, opacity: 1, duration: 0.6, ease: 'expo.out' }, at)
          .to(q(`.node-${i} .node__core`), { scale: 1, opacity: 1, duration: 0.5, ease: 'expo.out' }, at)
          .to(q(`.node-${i} .node__label`), { opacity: 1, duration: 0.5 }, at + 0.1)
          .fromTo(q(`.cap-${i}`), { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' }, at)
          .fromTo(
            q(`.cap-${i} .sw__i`),
            { yPercent: 105 },
            { yPercent: 0, duration: 0.7, stagger: 0.02, ease: 'power3.out' },
            at,
          )
        if (i > 0) tl.to(q(`.cap-${i - 1}`), { autoAlpha: 0, y: -18, duration: 0.4, ease: 'power2.in' }, at - 0.5)
        if (i < NODES.length - 1) tl.to(segs[i], { strokeDashoffset: 0, duration: 1.2, ease: 'power1.inOut' }, at + 0.7)
      })
      const end = (NODES.length - 1) * 2 + 1.4
      tl.to(q('.cap-4'), { autoAlpha: 0, y: -22, duration: 0.4 }, end)
        .to(q('.journey__coda'), { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' }, end + 0.2)
        .to(q('.journey__constellation'), { scale: 0.92, duration: 1, ease: 'power1.inOut' }, end)
        .to({}, { duration: 0.8 })

    }, root)
    return () => {
      tlRef.current = null
      ctx.revert()
    }
  }, [reduced])

  // pointer threads: faint lines from the finger/cursor to the nearest stars
  useLayoutEffect(() => {
    const el = svg.current
    if (!el) return
    const stage = root.current!.querySelector('.journey__pin') as HTMLElement
    let raf = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const m = el.getScreenCTM()
        if (!m) return
        const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
        const ranked = NODES.map((n, i) => ({ i, d: Math.hypot(n.x - pt.x, n.y - pt.y) })).sort((a, b) => a.d - b.d)
        ranked.forEach(({ i, d }) => {
          const g = el.querySelector(`.node-${i}`) as SVGGElement
          g?.style.setProperty('--near', String(Math.max(0, 1 - d / 120)))
        })
        lines.current.forEach((ln, k) => {
          if (!ln) return
          const r = ranked[k]
          const o = Math.max(0, 1 - r.d / 170)
          ln.setAttribute('x1', String(pt.x))
          ln.setAttribute('y1', String(pt.y))
          ln.setAttribute('x2', String(NODES[r.i].x))
          ln.setAttribute('y2', String(NODES[r.i].y))
          ln.style.opacity = String(o * 0.55)
        })
      })
    }
    const onLeave = () => lines.current.forEach((ln) => ln && (ln.style.opacity = '0'))
    stage.addEventListener('pointermove', onMove, { passive: true })
    stage.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      stage.removeEventListener('pointermove', onMove)
      stage.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  const goTo = (i: number) => {
    const tl = tlRef.current
    if (!tl?.scrollTrigger) return
    const st = tl.scrollTrigger
    const t = Math.min(tl.duration(), tl.labels[`n${i}`] + 0.75)
    const y = st.start + (st.end - st.start) * (t / tl.duration())
    gsap.to(window, { scrollTo: y, duration: 1.3, ease: 'power2.inOut' })
  }

  return (
    <section className={`journey ${reduced ? 'is-static' : ''}`} ref={root} data-scene="II" aria-label={journey.heading}>
      <div className="journey__pin">
        <header className="journey__head">
          <p className="mono kicker">{journey.kicker}</p>
          <h2 className="journey__title">
            <SplitWords text={journey.heading} />
          </h2>
        </header>

        <div className="journey__sky">
          <svg
            ref={svg}
            className="journey__constellation"
            viewBox={`0 0 ${VB.w} ${VB.h}`}
            role="group"
            aria-label="A constellation of five stars, one for each part of the story"
          >
            <defs>
              <radialGradient id="halo">
                <stop offset="0" stopColor="#D8BE8E" stopOpacity="0.55" />
                <stop offset="1" stopColor="#D8BE8E" stopOpacity="0" />
              </radialGradient>
            </defs>
            {dust.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#F4EEE3" opacity={d.o} />
            ))}
            {[0, 1].map((k) => (
              <line key={k} ref={(el) => void (lines.current[k] = el)} className="thread" />
            ))}
            {NODES.slice(0, -1).map((n, i) => (
              <path key={i} className="seg" d={segPath(n, NODES[i + 1], i % 2 ? -0.12 : 0.12)} />
            ))}
            {satellites.flat().map((s, i) => (
              <circle key={`s${i}`} cx={s.x} cy={s.y} r={s.r} className="satellite" />
            ))}
            {NODES.map((n, i) => (
              <g
                key={i}
                className={`node node-${i}`}
                transform={`translate(${n.x} ${n.y})`}
                tabIndex={0}
                role="button"
                aria-label={`${journey.chapters[i].label}: ${journey.chapters[i].title}`}
                onClick={() => goTo(i)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), goTo(i))}
                data-cursor="return"
              >
                <circle r="34" className="node__hit" />
                <circle r={i === 4 ? 40 : 30} className="node__halo" fill="url(#halo)" />
                <path d={starPath(i === 4 ? 13 : 9)} className="node__core" />
                <text
                  className="node__label"
                  x={LABEL_SIDE[i] * 19}
                  y={i === 4 ? 30 : 4}
                  textAnchor={i === 4 ? 'middle' : LABEL_SIDE[i] > 0 ? 'start' : 'end'}
                >
                  {journey.chapters[i].label.toUpperCase()}
                </text>
              </g>
            ))}
          </svg>
        </div>

        <div className="journey__captions" aria-live="polite">
          {journey.chapters.map((c, i) => (
            <article key={i} className={`cap cap-${i}`}>
              <p className="mono cap__n">
                {String(i + 1).padStart(2, '0')} <span>/ 05</span>
              </p>
              <h3 className="cap__title">
                <SplitWords text={c.title} />
              </h3>
              <p className="cap__body">{c.body}</p>
            </article>
          ))}
          <p className="journey__coda">{journey.coda}</p>
        </div>

        <div className="journey__rail mono" aria-hidden="true">
          <span>2023</span>
          <i>
            <b />
          </i>
          <span>Today</span>
        </div>
        <p className="journey__hint mono">{journey.hint}</p>
      </div>
    </section>
  )
}
