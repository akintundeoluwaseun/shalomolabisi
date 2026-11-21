import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Sky } from '../lib/sky'
import { isFinePointer } from '../lib/env'

/** The persistent night sky. Fades away at dawn. */
export function SkyLayer({ reduced, dawn }: { reduced: boolean; dawn: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const sky = useRef<Sky | null>(null)
  useEffect(() => {
    const s = new Sky(ref.current!, reduced)
    sky.current = s
    s.start()
    return () => s.destroy()
  }, [reduced])
  useEffect(() => {
    if (!dawn || !ref.current) return
    gsap.to(ref.current, {
      opacity: 0,
      duration: 1.6,
      ease: 'power2.inOut',
      onComplete: () => sky.current?.stop(),
    })
  }, [dawn])
  return <canvas ref={ref} className="sky" aria-hidden="true" />
}

/** Film grain from a tiny generated tile — gives the flat colours some tooth. */
export function Grain() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 140
    const x = c.getContext('2d')!
    const img = x.createImageData(140, 140)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v
      img.data[i + 3] = 255
    }
    x.putImageData(img, 0, 0)
    ref.current!.style.backgroundImage = `url(${c.toDataURL()})`
  }, [])
  return <div ref={ref} className="grain" aria-hidden="true" />
}

const SCENES = ['I', 'II', 'III', 'IV']

/** Fixed editorial chrome: title and scene counter. Not a navigation. */
export function Chrome({ entered }: { entered: boolean }) {
  const counter = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const triggers = gsap.utils.toArray<HTMLElement>('[data-scene]').map((el) =>
      ScrollTrigger.create({
        trigger: el,
        start: 'top 55%',
        end: 'bottom 55%',
        onToggle: (self) => {
          if (self.isActive && counter.current) counter.current.textContent = `${el.dataset.scene} / IV`
        },
      }),
    )
    return () => triggers.forEach((t) => t.kill())
  }, [])

  return (
    <div className={`chrome ${entered ? 'is-in' : ''}`}>
      <span className="chrome__title mono">For Shalom</span>
      <span className="chrome__count mono" ref={counter} aria-hidden="true">
        {SCENES[0]} / IV
      </span>
    </div>
  )
}

/** Desktop-only cursor: a dot plus a ring that opens up and names the action under it. */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)
  const [enabled] = useState(isFinePointer)

  useEffect(() => {
    if (!enabled) return
    document.documentElement.classList.add('has-cursor')
    let x = innerWidth / 2,
      y = innerHeight / 2,
      rx = x,
      ry = y,
      raf = 0,
      seen = false
    const move = (e: PointerEvent) => {
      x = e.clientX
      y = e.clientY
      if (!seen) {
        seen = true
        rx = x
        ry = y
        dot.current!.style.opacity = ring.current!.style.opacity = '1'
      }
      const t = (e.target as HTMLElement).closest?.('[data-cursor]') as HTMLElement | null
      ring.current!.classList.toggle('is-active', !!t)
      label.current!.textContent = t?.dataset.cursor ?? ''
    }
    const down = () => ring.current!.classList.add('is-down')
    const up = () => ring.current!.classList.remove('is-down')
    const leave = () => {
      seen = false
      dot.current!.style.opacity = ring.current!.style.opacity = '0'
    }
    const loop = () => {
      rx += (x - rx) * 0.16
      ry += (y - ry) * 0.16
      dot.current!.style.transform = `translate3d(${x}px,${y}px,0)`
      ring.current!.style.transform = `translate3d(${rx}px,${ry}px,0)`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      document.documentElement.removeEventListener('pointerleave', leave)
      document.documentElement.classList.remove('has-cursor')
    }
  }, [enabled])

  if (!enabled) return null
  return (
    <>
      <div className="cursor-dot" ref={dot} aria-hidden="true" />
      <div className="cursor-ring" ref={ring} aria-hidden="true">
        <span ref={label} className="mono" />
      </div>
    </>
  )
}
