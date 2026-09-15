import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  durationMs?: number
  format: (n: number) => string
  className?: string
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function AnimatedNumber({ value, durationMs = 600, format, className }: Props) {
  const [display, setDisplay] = useState<number>(value)
  const fromRef = useRef<number>(value)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (prefersReducedMotion() || value === fromRef.current) {
      fromRef.current = value
      setDisplay(value)
      return
    }
    const from = fromRef.current
    const to = value
    startRef.current = null
    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts
      const elapsed = ts - startRef.current
      const t = Math.min(elapsed / durationMs, 1)
      const v = from + (to - from) * easeOutCubic(t)
      setDisplay(v)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = to
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      fromRef.current = value
    }
  }, [value, durationMs])

  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {format(display)}
    </span>
  )
}
