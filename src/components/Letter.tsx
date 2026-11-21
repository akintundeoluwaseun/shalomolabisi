import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { m } from 'motion/react'
import { letter } from '../content/story'
import { vibrate } from '../lib/env'
import { SplitChars, SplitWords, Star } from './Split'

type State = 'sealed' | 'opening' | 'open'

/** Irregular wax blob, generated once. */
const WAX = (() => {
  const pts: string[] = []
  const n = 22
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const r = 46 + Math.sin(i * 2.7) * 2.6 + Math.cos(i * 5.1) * 1.8
    pts.push(`${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`)
  }
  return `M${pts.join(' L')}Z`
})()

function Seal() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <radialGradient id="wax" cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#6c4f80" />
          <stop offset="0.55" stopColor="#3e2b4d" />
          <stop offset="1" stopColor="#24182e" />
        </radialGradient>
      </defs>
      <path d={WAX} fill="url(#wax)" />
      <circle cx="50" cy="50" r="31" fill="none" stroke="rgba(244,238,227,.22)" strokeWidth="1.2" />
      <circle cx="50" cy="50" r="27" fill="rgba(0,0,0,.14)" />
      <path
        transform="translate(50 50)"
        d="M0 -17 C3 -3 3 -3 17 0 C3 3 3 3 0 17 C-3 3 -3 3 -17 0 C-3 -3 -3 -3 0 -17Z"
        fill="#d8be8e"
        opacity=".85"
      />
      <ellipse cx="36" cy="30" rx="12" ry="6" fill="rgba(255,255,255,.12)" transform="rotate(-30 36 30)" />
    </svg>
  )
}

export function Letter({ reduced }: { reduced: boolean }) {
  const root = useRef<HTMLElement>(null)
  const [state, setState] = useState<State>('sealed')

  // gentle levitation + reveal of the envelope as it scrolls in
  useLayoutEffect(() => {
    if (state !== 'sealed') return
    const ctx = gsap.context(() => {
      if (reduced) return
      gsap.from('.letter__intro .sw__i', {
        yPercent: 110,
        stagger: 0.05,
        duration: 1.3,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.letter__intro', start: 'top 80%' },
      })
      gsap.from('.env', {
        y: 80,
        opacity: 0,
        duration: 1.6,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.env', start: 'top 88%' },
      })
      gsap.to('.env__float', { y: -8, rotate: 0.6, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1 })
    }, root)
    return () => ctx.revert()
  }, [reduced, state])

  // pointer tilt on the envelope (desktop + touch drag)
  useLayoutEffect(() => {
    if (state !== 'sealed' || reduced) return
    const el = root.current?.querySelector('.env__tilt') as HTMLElement | null
    if (!el) return
    const xTo = gsap.quickTo(el, 'rotationY', { duration: 0.8, ease: 'power3.out' })
    const yTo = gsap.quickTo(el, 'rotationX', { duration: 0.8, ease: 'power3.out' })
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const nx = (e.clientX - (r.left + r.width / 2)) / r.width
      const ny = (e.clientY - (r.top + r.height / 2)) / r.height
      xTo(Math.max(-1, Math.min(1, nx)) * 10)
      yTo(Math.max(-1, Math.min(1, ny)) * -8)
    }
    const reset = () => {
      xTo(0)
      yTo(0)
    }
    const stage = root.current!
    stage.addEventListener('pointermove', move, { passive: true })
    stage.addEventListener('pointerleave', reset)
    return () => {
      stage.removeEventListener('pointermove', move)
      stage.removeEventListener('pointerleave', reset)
    }
  }, [reduced, state])

  const open = () => {
    if (state !== 'sealed') return
    setState('opening')
    vibrate(12)
    const q = gsap.utils.selector(root)
    if (reduced) {
      gsap.to(q('.env'), { opacity: 0, duration: 0.3, onComplete: () => setState('open') })
      return
    }
    gsap.killTweensOf(q('.env__float'))
    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' }, onComplete: () => setState('open') })
    tl.to(q('.env__tilt'), { rotationX: 0, rotationY: 0, duration: 0.4 }, 0)
      .to(q('.seal__half'), { scale: 0.88, duration: 0.14, ease: 'power2.out' }, 0)
      .to(q('.seal__half--l'), { x: -34, y: 10, rotate: -28, opacity: 0, duration: 0.7, ease: 'power3.out' }, 0.16)
      .to(q('.seal__half--r'), { x: 34, y: 14, rotate: 32, opacity: 0, duration: 0.7, ease: 'power3.out' }, 0.16)
      .to(
        q('.env__flap'),
        {
          rotateX: 180,
          transformPerspective: 900,
          duration: 0.95,
          onUpdate() {
            const f = q('.env__flap')[0] as HTMLElement
            if (this.progress() > 0.5) f.classList.add('is-behind')
          },
        },
        0.45,
      )
      .to(q('.env__peek'), { yPercent: -62, duration: 1.1, ease: 'expo.out' }, 1.15)
      .to(q('.env__float'), { y: 40, opacity: 0, scale: 0.97, duration: 0.7, ease: 'power2.in' }, 2.1)
      .to(q('.env'), { height: 0, marginTop: 0, duration: 0.5, ease: 'power2.inOut' }, 2.7)
  }

  // once open: reveal the sheet and pace the reading
  useLayoutEffect(() => {
    if (state !== 'open') return
    const ctx = gsap.context(() => {
      ScrollTrigger.refresh()
      const sheet = root.current!.querySelector('.sheet') as HTMLElement
      const top = sheet.getBoundingClientRect().top + window.scrollY - 24
      if (reduced) {
        window.scrollTo({ top })
        return
      }
      gsap.to(window, { scrollTo: top, duration: 1.2, ease: 'power2.inOut' })
      gsap.fromTo(
        sheet,
        { y: 90, rotate: -1.4, opacity: 0, scale: 0.97 },
        { y: 0, rotate: 0, opacity: 1, scale: 1, duration: 1.6, ease: 'expo.out', clearProps: 'transform' },
      )
      gsap.fromTo(
        '.sheet__salute .sc__i',
        { yPercent: 115, opacity: 0 },
        { yPercent: 0, opacity: 1, stagger: 0.035, duration: 1.2, ease: 'expo.out', delay: 0.5, clearProps: 'transform' },
      )
      gsap.utils.toArray<HTMLElement>('.sheet__reveal').forEach((el) => {
        gsap.fromTo(
          el,
          { y: 22, opacity: 0, clipPath: 'inset(0 0 100% 0)' },
          {
            y: 0,
            opacity: 1,
            clipPath: 'inset(0 0 -20% 0)',
            duration: 1.2,
            ease: 'expo.out',
            clearProps: 'transform,clipPath',
            scrollTrigger: { trigger: el, start: 'top 90%' },
          },
        )
      })
    }, root)
    return () => ctx.revert()
  }, [state, reduced])

  return (
    <section className={`letter is-${state}`} ref={root} data-scene="III" aria-label="A letter for Shalom">
      <header className="letter__intro">
        <p className="mono kicker">
          <SplitWords text={letter.kicker} />
        </p>
      </header>

      {state !== 'open' && (
        <div className="env">
          <div className="env__float">
            <div className="env__tilt">
              <div className="env__back" />
              <div className="env__peek" aria-hidden="true">
                <span className="env__peek-salute">{letter.salutation}</span>
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="env__pocket" />
              <div className="env__flap" />
              <m.button
                className="seal"
                onClick={open}
                whileHover={reduced ? undefined : { scale: 1.06, rotate: -4 }}
                whileTap={reduced ? undefined : { scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 380, damping: 14 }}
                aria-label="Break the seal and open the letter"
                data-cursor="open"
                disabled={state !== 'sealed'}
              >
                <span className="seal__half seal__half--l">
                  <Seal />
                </span>
                <span className="seal__half seal__half--r">
                  <Seal />
                </span>
              </m.button>
            </div>
          </div>
          <p className="env__prompt mono">{letter.prompt}</p>
        </div>
      )}

      {state === 'open' && (
        <article className="sheet">
          <div className="sheet__frame" aria-hidden="true" />
          <header className="sheet__head mono">
            <span>{letter.header}</span>
            <span>{letter.date}</span>
          </header>
          <h2 className="sheet__salute">
            <SplitChars text={letter.salutation} />
          </h2>
          <div className="sheet__body">
            {letter.paragraphs.map((p, i) => (
              <div key={i} className="sheet__reveal">
                <p className={i === 0 ? 'has-drop' : undefined}>{p}</p>
                {i === 3 && (
                  <div className="sheet__orn" aria-hidden="true">
                    <i />
                    <Star size={10} />
                    <i />
                  </div>
                )}
              </div>
            ))}
            <p className="sheet__reveal sheet__bday">{letter.birthdayLine}</p>
            <p className="sheet__reveal sheet__sign">
              {letter.signOff}
              {letter.signature && <span className="sheet__signature">— {letter.signature}</span>}
            </p>
          </div>
        </article>
      )}
    </section>
  )
}
