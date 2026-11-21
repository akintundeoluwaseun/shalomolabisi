import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { m } from 'motion/react'
import { NameField } from '../lib/nameField'
import { vibrate } from '../lib/env'
import { opening, recipient } from '../content/story'
import { SplitWords, Star } from './Split'

type Phase = 'idle' | 'holding' | 'hint' | 'done'
const RING = 2 * Math.PI * 44

export function Opening({ reduced, onEnter }: { reduced: boolean; onEnter: () => void }) {
  const root = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const ring = useRef<SVGCircleElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const field = useRef<NameField | null>(null)
  const holding = useRef(false)
  const pressedAt = useRef(0)
  const done = useRef(false)
  const [phase, setPhase] = useState<Phase>('idle')

  // stardust + hold loop
  useEffect(() => {
    const f = new NameField(canvas.current!, recipient.first, reduced)
    field.current = f
    f.init()
    const HOLD = reduced ? 0.9 : 1.7
    let p = 0
    let last = performance.now()
    let raf = 0
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!done.current) {
        const prev = p
        p = Math.max(0, Math.min(1, p + (holding.current ? dt / HOLD : -dt / 0.9)))
        if (p !== prev) {
          if (reduced) f.setProgressStatic(Math.round(p * 4) / 4)
          else f.progress = p
          ring.current?.setAttribute('stroke-dashoffset', String(RING * (1 - p)))
          btn.current?.style.setProperty('--p', p.toFixed(3))
        }
        if (p >= 1) complete()
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      f.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  // leaving the opening: the name lifts away and the copy dissolves as the journey arrives
  useLayoutEffect(() => {
    if (phase !== 'done' || reduced) return
    const ctx = gsap.context(() => {
      const st = { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 0.6 }
      gsap.to('.opening__dust', { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: st })
      gsap.to('.opening__lower', { y: -90, opacity: 0, ease: 'none', scrollTrigger: { ...st, end: '60% top' } })
      gsap.to('.opening__meta', { opacity: 0, ease: 'none', scrollTrigger: { ...st, end: '30% top' } })
    }, root)
    return () => ctx.revert()
  }, [phase, reduced])

  // intro choreography — quick, no loader
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      if (reduced) return
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
      tl.from('.opening__meta > *', { y: 14, opacity: 0, duration: 1.2, stagger: 0.12 }, 0.2)
        .from('.invite', { y: 24, opacity: 0, duration: 1.4 }, 0.5)
        .from('.invite__ring-track', { attr: { 'stroke-dashoffset': RING }, duration: 1.8, ease: 'power2.inOut' }, 0.5)
    }, root)
    return () => ctx.revert()
  }, [reduced])

  function complete() {
    if (done.current) return
    done.current = true
    holding.current = false
    field.current?.lock()
    vibrate(18)
    setPhase('done')
    onEnter()
    const q = gsap.utils.selector(root)
    if (reduced) {
      gsap.set(q('.invite'), { autoAlpha: 0 })
      gsap.set(q('.opening__lines, .opening__cue'), { autoAlpha: 1 })
      gsap.set(q('.opening__lines .sw__i'), { yPercent: 0 })
      return
    }
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
    tl.to(q('.invite'), { y: 18, autoAlpha: 0, duration: 0.6, ease: 'power2.in' })
      .set(q('.opening__lines'), { autoAlpha: 1 })
      .fromTo(q('.opening__lines .sw__i'), { yPercent: 110 }, { yPercent: 0, duration: 1.4, stagger: 0.045 }, '+=0.1')
      .fromTo(q('.opening__cue'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 1 }, '-=0.6')
  }

  const startHold = () => {
    if (done.current) return
    holding.current = true
    pressedAt.current = performance.now()
    setPhase('holding')
  }
  const endHold = () => {
    if (done.current || !holding.current) return
    holding.current = false
    setPhase(performance.now() - pressedAt.current < 350 ? 'hint' : 'idle')
  }

  const label =
    phase === 'holding' ? opening.inviteHolding : phase === 'hint' ? opening.inviteTapHint : opening.invite

  return (
    <section className="opening" ref={root} data-scene="I" aria-label="Opening">
      <canvas ref={canvas} className="opening__dust" aria-hidden="true" />
      <h1 className="sr-only">For {recipient.full} — a birthday experience</h1>

      <div className="opening__meta">
        <span className="mono">{opening.kicker}</span>
        <span className="mono">{opening.since}</span>
      </div>

      <div className="opening__lower">
        <m.button
          ref={btn}
          className={`invite ${phase === 'holding' ? 'is-holding' : ''}`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            startHold()
          }}
          onPointerUp={endHold}
          onPointerCancel={endHold}
          onLostPointerCapture={endHold}
          onKeyDown={(e) => {
            if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
              e.preventDefault()
              startHold()
            }
          }}
          onKeyUp={(e) => {
            if (e.key === ' ' || e.key === 'Enter') endHold()
          }}
          onContextMenu={(e) => e.preventDefault()}
          whileHover={{ scale: 1.03 }}
          animate={{ scale: phase === 'holding' ? 0.94 : 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          aria-label={`${opening.invite}. Press and hold to enter.`}
          data-cursor="hold"
        >
          <span className="invite__orb">
            <svg className="invite__rings" viewBox="0 0 100 100" aria-hidden="true">
              <circle className="invite__ring-track" cx="50" cy="50" r="44" strokeDasharray={RING} strokeDashoffset={0} />
              <circle
                ref={ring}
                className="invite__ring"
                cx="50"
                cy="50"
                r="44"
                strokeDasharray={RING}
                strokeDashoffset={RING}
              />
            </svg>
            <Star size={22} className="invite__star" />
          </span>
          <span className="invite__label mono" aria-live="polite">
            {label}
          </span>
        </m.button>
        <button className="sr-only sr-only--focusable" onClick={complete}>
          Enter without holding
        </button>

        <div className="opening__lines" aria-hidden={phase !== 'done'}>
          <p className="opening__lineA">
            <SplitWords text={opening.lineA} />
          </p>
          <p className="opening__lineB">
            <SplitWords text={opening.lineB} />
          </p>
        </div>
        <div className="opening__cue mono" aria-hidden="true">
          <span>{opening.scrollCue}</span>
          <i />
        </div>
      </div>
    </section>
  )
}
