import { useCallback, useEffect, useState } from 'react'
import gsap from 'gsap'
import { LazyMotion, domAnimation } from 'motion/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import { prefersReducedMotion } from './lib/env'
import { Chrome, Cursor, Grain, SkyLayer } from './components/Atmosphere'
import { Opening } from './components/Opening'
import { Journey } from './components/Journey'
import { Letter } from './components/Letter'
import { Celebration } from './components/Celebration'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)
ScrollTrigger.config({ ignoreMobileResize: true })

export default function App() {
  const [reduced, setReduced] = useState(prefersReducedMotion)
  const [entered, setEntered] = useState(false)
  const [dawn, setDawn] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const fn = () => setReduced(mq.matches)
    mq.addEventListener('change', fn)
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    return () => mq.removeEventListener('change', fn)
  }, [])

  // the page is held still until the visitor gathers the stars
  useEffect(() => {
    document.documentElement.classList.toggle('is-locked', !entered)
    if (entered) requestAnimationFrame(() => ScrollTrigger.refresh())
  }, [entered])

  useEffect(() => {
    document.documentElement.classList.toggle('is-dawn', dawn)
  }, [dawn])

  const onEnter = useCallback(() => setEntered(true), [])
  const onDawn = useCallback(() => setDawn(true), [])

  return (
    <LazyMotion features={domAnimation} strict>
      <SkyLayer reduced={reduced} dawn={dawn} />
      <Grain />
      <Chrome entered={entered} />
      <Cursor />
      <main>
        <Opening reduced={reduced} onEnter={onEnter} />
        <Journey reduced={reduced} />
        <Letter reduced={reduced} />
        <Celebration reduced={reduced} dawn={dawn} onDawn={onDawn} />
      </main>
    </LazyMotion>
  )
}
