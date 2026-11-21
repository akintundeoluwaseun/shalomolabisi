import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { m } from 'motion/react'
import { celebration, recipient } from '../content/story'
import { Garden } from '../lib/garden'
import { vibrate } from '../lib/env'
import { SplitChars, SplitWords, Star } from './Split'

const PALETTES = [
  ['169,156,203', '180,143,85', '94,86,137'],
  ['216,190,142', '94,86,137', '62,43,77'],
  ['94,86,137', '216,190,142', '180,143,85'],
  ['180,143,85', '169,156,203', '62,43,77'],
]

export function Celebration({
  reduced,
  dawn,
  onDawn,
}: {
  reduced: boolean
  dawn: boolean
  onDawn: () => void
}) {
  const root = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const garden = useRef<Garden | null>(null)
  const bursts = useRef<HTMLDivElement>(null)
  const [lit, setLit] = useState(true)

  useEffect(() => {
    const g = new Garden(canvas.current!, reduced)
    garden.current = g
    return () => g.destroy()
  }, [reduced])

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      if (reduced) return
      gsap.from('.wish .sw__i', {
        yPercent: 110,
        stagger: 0.05,
        duration: 1.4,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.wish', start: 'top 70%' },
      })
      gsap.from('.flame-btn, .wish__hint', {
        opacity: 0,
        y: 20,
        duration: 1.4,
        stagger: 0.2,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.wish', start: 'top 60%' },
      })
    }, root)
    return () => ctx.revert()
  }, [reduced])

  const blowOut = () => {
    if (!lit) return
    setLit(false)
    vibrate(20)
    const q = gsap.utils.selector(root)
    const btn = q('.flame-btn')[0] as HTMLElement
    const stage = q('.cele__stage')[0] as HTMLElement
    const br = btn.getBoundingClientRect()
    const sr = stage.getBoundingClientRect()
    const fx = ((br.left + br.width / 2 - sr.left) / sr.width) * 100
    const fy = ((br.top + br.height * 0.35 - sr.top) / sr.height) * 100

    const g = garden.current!
    const w = sr.width
    const h = sr.height
    const small = w < 700
    const plantMain = () => {
      g.plant({ x: 0.5, y: small ? 0.3 : 0.4, radius: Math.min(w * 0.46, h * 0.3, 330), seed: 21, palette: PALETTES[0], speed: 14, alpha: 0.46 })
      g.plant({ x: small ? 0.06 : 0.1, y: 0.9, radius: Math.min(w, h) * 0.2, seed: 5, palette: PALETTES[1], speed: 8, alpha: 0.38 })
      g.plant({ x: small ? 0.96 : 0.9, y: small ? 0.06 : 0.12, radius: Math.min(w, h) * 0.16, seed: 9, palette: PALETTES[2], speed: 8, alpha: 0.38 })
    }

    const finish = () => {
      onDawn()
      requestAnimationFrame(() => ScrollTrigger.refresh())
    }

    if (reduced) {
      gsap.set(q('.dawn'), { clipPath: 'circle(150% at 50% 50%)', autoAlpha: 1 })
      gsap.set(q('.dawn .sc__i, .dawn .sw__i'), { yPercent: 0 })
      gsap.set(q('.dawn__date, .dawn__wish, .dawn__hint, .dawn__eyebrow'), { autoAlpha: 1 })
      plantMain()
      finish()
      return
    }

    const tl = gsap.timeline()
    tl.to(q('.flame__body'), { scaleY: 0.1, scaleX: 0.6, opacity: 0, duration: 0.35, ease: 'power2.in', transformOrigin: '50% 100%' })
      .to(q('.flame__glow'), { opacity: 0, scale: 0.4, duration: 0.6, ease: 'power2.out', transformOrigin: '50% 50%' }, 0)
      .fromTo(
        q('.smoke path'),
        { strokeDashoffset: 120, opacity: 0.7 },
        { strokeDashoffset: 0, opacity: 0, y: -40, duration: 2, stagger: 0.12, ease: 'power1.out' },
        0.15,
      )
      .to(q('.wish__copy, .wish__hint'), { opacity: 0, y: -12, duration: 0.6, ease: 'power2.in' }, 0.4)
      .set(q('.dawn'), { autoAlpha: 1, clipPath: `circle(0% at ${fx}% ${fy}%)` }, 1.1)
      .to(q('.dawn'), { clipPath: `circle(150% at ${fx}% ${fy}%)`, duration: 1.8, ease: 'power3.inOut' }, 1.1)
      .add(() => {
        plantMain()
        finish()
      }, 1.6)
      .fromTo(q('.dawn__eyebrow'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: 'expo.out' }, 2.1)
      .fromTo(
        q('.dawn__name .sc__i'),
        { yPercent: 120, rotate: 6 },
        { yPercent: 0, rotate: 0, duration: 1.6, stagger: 0.05, ease: 'expo.out', clearProps: 'transform' },
        2.2,
      )
      .fromTo(q('.dawn__date, .dawn__wish'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1.4, ease: 'expo.out' }, 3.0)
      .fromTo(q('.dawn__hint'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 }, 3.8)
      .fromTo(q('.dawn__star'), { scale: 0, rotate: -90 }, { scale: 1, rotate: 0, duration: 1.6, ease: 'expo.out' }, 2.0)
  }

  // after dawn: every tap plants a bloom, with a small radial burst of light
  const plant = (e: React.PointerEvent) => {
    if (!dawn) return
    if ((e.target as HTMLElement).closest('button, a')) return
    const g = garden.current
    const stage = e.currentTarget as HTMLElement
    const r = stage.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    if (g && g.count < 40) {
      g.plant({
        x,
        y,
        radius: 34 + Math.random() * 46,
        seed: Math.floor(Math.random() * 1e6),
        palette: PALETTES[g.count % PALETTES.length],
        speed: 9,
        alpha: 0.5,
      })
    }
    if (reduced || !bursts.current) return
    const b = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    b.setAttribute('viewBox', '-50 -50 100 100')
    b.classList.add('burst')
    b.style.left = `${e.clientX - r.left}px`
    b.style.top = `${e.clientY - r.top}px`
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      l.setAttribute('x1', String(Math.cos(a) * 12))
      l.setAttribute('y1', String(Math.sin(a) * 12))
      l.setAttribute('x2', String(Math.cos(a) * (i % 2 ? 30 : 42)))
      l.setAttribute('y2', String(Math.sin(a) * (i % 2 ? 30 : 42)))
      b.appendChild(l)
    }
    bursts.current.appendChild(b)
    gsap.fromTo(
      b,
      { scale: 0.3, opacity: 1, rotate: Math.random() * 30 },
      { scale: 1.3, opacity: 0, duration: 1.1, ease: 'expo.out', onComplete: () => b.remove() },
    )
  }

  const toLetter = () => {
    const el = document.querySelector('.letter') as HTMLElement
    gsap.to(window, { scrollTo: { y: el, offsetY: 0 }, duration: reduced ? 0 : 1.6, ease: 'power2.inOut' })
  }
  const restart = () => {
    window.scrollTo(0, 0)
    window.location.reload()
  }

  return (
    <section className={`cele ${dawn ? 'is-dawn' : ''}`} ref={root} data-scene="IV" aria-label="Celebration">
      <div className="cele__stage" onPointerDown={plant}>
        {/* night: the wish */}
        <div className="wish">
          <p className="mono kicker">{celebration.kicker}</p>
          <div className="wish__copy">
            <p className="wish__line">
              <SplitWords text={celebration.preWish} />
            </p>
            <p className="wish__line wish__line--em">
              <SplitWords text={celebration.preWishB} />
            </p>
          </div>
          <m.button
            className="flame-btn"
            onClick={blowOut}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            aria-label="Blow out the flame"
            data-cursor="make a wish"
            disabled={!lit}
          >
            <svg viewBox="0 0 120 220" aria-hidden="true">
              <defs>
                <radialGradient id="fglow">
                  <stop offset="0" stopColor="#ffd9a0" stopOpacity=".55" />
                  <stop offset="1" stopColor="#ffd9a0" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="fbody" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0" stopColor="#b48f55" />
                  <stop offset=".45" stopColor="#f2c98a" />
                  <stop offset="1" stopColor="#fff3df" />
                </linearGradient>
              </defs>
              <circle className="flame__glow" cx="60" cy="70" r="58" fill="url(#fglow)" />
              <g className="flame__body">
                <path className="flame__outer" d="M60 18 C74 46 84 62 82 82 C80 100 70 110 60 110 C50 110 40 100 38 82 C36 62 46 46 60 18Z" fill="url(#fbody)" />
                <path className="flame__inner" d="M60 58 C66 72 70 80 69 90 C68 99 64 104 60 104 C56 104 52 99 51 90 C50 80 54 72 60 58Z" fill="#fffaf0" />
              </g>
              <g className="smoke" fill="none" stroke="rgba(244,238,227,.5)" strokeWidth="1.2" strokeLinecap="round">
                <path d="M60 104 C54 88 68 74 58 58 C50 46 64 34 58 20" strokeDasharray="120" strokeDashoffset="120" />
                <path d="M61 104 C70 90 52 78 64 62 C72 50 56 40 64 26" strokeDasharray="120" strokeDashoffset="120" />
              </g>
              <line x1="60" y1="108" x2="60" y2="122" stroke="#1b2142" strokeWidth="2" strokeLinecap="round" />
              <rect x="52" y="120" width="16" height="96" rx="1" fill="rgba(244,238,227,.9)" />
              <rect x="52" y="120" width="5" height="96" fill="rgba(216,190,142,.35)" />
            </svg>
          </m.button>
          <p className="wish__hint mono">{celebration.flameHint}</p>
        </div>

        {/* dawn: the celebration */}
        <div className="dawn" aria-hidden={!dawn}>
          <canvas ref={canvas} className="dawn__garden" aria-hidden="true" />
          <div className="dawn__bursts" ref={bursts} aria-hidden="true" />
          <div className="dawn__type">
            <Star size={18} className="dawn__star" />
            <p className="dawn__eyebrow">{celebration.eyebrow}</p>
            <h2 className="dawn__name" aria-label={`${recipient.full}.`}>
              {celebration.nameLines.map((l) => (
                <span className="dawn__line" key={l}>
                  <SplitChars text={l} />
                </span>
              ))}
            </h2>
            <p className="dawn__date mono">{celebration.date}</p>
            <p className="dawn__wish">{celebration.wish}</p>
          </div>
          <p className="dawn__hint mono">{celebration.gardenHint}</p>
        </div>
      </div>

      {dawn && (
        <footer className="finale">
          <Star size={26} className="finale__star" />
          <p className="finale__close">{celebration.closing}</p>
          <p className="finale__colophon mono">{celebration.colophon}</p>
          <div className="finale__actions">
            <button className="link mono" onClick={toLetter} data-cursor="read">
              {celebration.again}
            </button>
            <span aria-hidden="true">·</span>
            <button className="link mono" onClick={restart} data-cursor="again">
              {celebration.restart}
            </button>
          </div>
        </footer>
      )}
    </section>
  )
}
