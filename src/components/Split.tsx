import { Fragment, memo } from 'react'

/** Splits text into masked words so GSAP can lift each one out of its own line. */
export const SplitWords = memo(function SplitWords({ text, className }: { text: string; className?: string }) {
  const words = text.split(' ')
  return (
    <span className={className} aria-label={text}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="sw" aria-hidden="true">
            <span className="sw__i">{w}</span>
          </span>
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </span>
  )
})

/** Splits text into masked characters for display type. */
export const SplitChars = memo(function SplitChars({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className} aria-label={text}>
      {Array.from(text).map((c, i) => (
        <span className="sc" key={i} aria-hidden="true">
          <span className="sc__i">{c === ' ' ? ' ' : c}</span>
        </span>
      ))}
    </span>
  )
})

export function Star({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="-10 -10 20 20" aria-hidden="true">
      <path d="M0 -10 C1.8 -1.8 1.8 -1.8 10 0 C1.8 1.8 1.8 1.8 0 10 C-1.8 1.8 -1.8 1.8 -10 0 C-1.8 -1.8 -1.8 -1.8 0 -10Z" fill="currentColor" />
    </svg>
  )
}
