"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"

const WORDS = ["Software", "AI", "Platform", "Product"] as const
const INTERVAL_MS = 5000

type TransitionKind = "fade" | "crossBlur"

interface RotatingWordProps {
  className?: string
}

export function RotatingWord({ className }: RotatingWordProps) {
  const [index, setIndex] = useState(0)
  const [prevIndex, setPrevIndex] = useState(0)
  const [transition, setTransition] = useState<TransitionKind>("fade")
  const [animKey, setAnimKey] = useState(0)
  const isFirstChange = useRef(true)
  const measurerRef = useRef<HTMLSpanElement | null>(null)
  const [widths, setWidths] = useState<number[]>([])

  useLayoutEffect(() => {
    const measure = () => {
      const node = measurerRef.current
      if (!node) return
      const items = Array.from(node.children) as HTMLElement[]
      setWidths(items.map((el) => el.getBoundingClientRect().width))
    }
    measure()
    if (typeof document !== "undefined" && "fonts" in document) {
      void (document as Document & { fonts: FontFaceSet }).fonts.ready.then(measure)
    }
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      const nextTransition: TransitionKind = isFirstChange.current
        ? "fade"
        : Math.random() < 0.5
          ? "fade"
          : "crossBlur"
      isFirstChange.current = false
      setPrevIndex((_) => index)
      setIndex((i) => (i + 1) % WORDS.length)
      setTransition(nextTransition)
      setAnimKey((k) => k + 1)
    }, INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [index])

  const measuredWidth = widths[index]
  const widthStyle = measuredWidth ? `${Math.ceil(measuredWidth)}px` : undefined
  const hasStarted = animKey > 0
  const inAnimClass =
    transition === "fade" ? "rotating-word-in--fade" : "rotating-word-in--blur"
  const outAnimClass =
    transition === "fade" ? "rotating-word-out--fade" : "rotating-word-out--blur"

  return (
    <>
      <span
        ref={measurerRef}
        aria-hidden
        className={`rotating-word-measurer ${className ?? ""}`}
      >
        {WORDS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </span>
      <span
        className={`rotating-word ${className ?? ""}`}
        style={{ width: widthStyle }}
        aria-live="polite"
      >
        <span className="rotating-word-ruler">{WORDS[index]}</span>
        {hasStarted && (
          <span
            key={`out-${animKey}`}
            aria-hidden
            className={`rotating-word-layer ${outAnimClass}`}
          >
            {WORDS[prevIndex]}
          </span>
        )}
        <span
          key={`in-${animKey}`}
          className={`rotating-word-layer ${hasStarted ? inAnimClass : ""}`}
        >
          {WORDS[index]}
        </span>
      </span>
    </>
  )
}
