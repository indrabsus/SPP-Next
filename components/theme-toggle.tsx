"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("theme")
    const isDark = saved === "dark"

    setDark(isDark)
    document.documentElement.classList.toggle("dark", isDark)
  }, [])

  const toggleTheme = () => {
    const next = !dark

    setDark(next)
    localStorage.setItem("theme", next ? "dark" : "light")
    document.documentElement.classList.toggle("dark", next)
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium shadow-sm transition
      bg-white text-slate-700 border-slate-200 hover:bg-slate-100
      dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
    >
      {dark ? (
        <>
          <Moon className="w-4 h-4 text-blue-400" />
          <span className="hidden sm:inline">Dark</span>
        </>
      ) : (
        <>
          <Sun className="w-4 h-4 text-yellow-500" />
          <span className="hidden sm:inline">Light</span>
        </>
      )}
    </button>
  )
}