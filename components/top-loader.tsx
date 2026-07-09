"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

type Listener = () => void

let listeners: Listener[] = []

export function startTopLoader() {
  listeners.forEach((listener) => listener())
}

export function TopLoader() {
  const pathname = usePathname()

  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const start = () => {
      if (intervalRef.current) clearInterval(intervalRef.current)

      setVisible(true)
      setProgress(12)

      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev
          return prev + (90 - prev) * 0.15
        })
      }, 200)
    }

    listeners.push(start)

    return () => {
      listeners = listeners.filter((listener) => listener !== start)
    }
  }, [])

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    setProgress(100)

    const timeout = setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, 300)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
    >
      <div
        className="h-full bg-primary shadow-[0_0_10px_hsl(var(--primary))] transition-[width,opacity] duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  )
}
