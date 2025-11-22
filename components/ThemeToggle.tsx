'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="themeSwitch" style={{ opacity: 0.5 }}>
        <div className="themeSwitchTrack">
          <div className="themeSwitchThumb"></div>
        </div>
      </div>
    )
  }

  // Determine the actual theme being displayed (resolvedTheme accounts for system preference)
  const currentTheme = resolvedTheme || theme
  const isDark = currentTheme === 'dark'

  const handleToggle = () => {
    // Simple 2-state toggle: Light <-> Dark
    // If currently on system, use the resolved theme to determine next state
    if (theme === 'system') {
      // Convert system preference to explicit theme (opposite of current resolved theme)
      setTheme(isDark ? 'light' : 'dark')
    } else {
      // Toggle between light and dark
      setTheme(isDark ? 'light' : 'dark')
    }
  }

  return (
    <button
      className="themeSwitch"
      onClick={handleToggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      type="button"
    >
      <div className={`themeSwitchTrack ${isDark ? 'dark' : 'light'}`}>
        <div className={`themeSwitchThumb ${isDark ? 'dark' : 'light'}`}>
          {isDark ? '🌙' : '☀️'}
        </div>
      </div>
    </button>
  )
}

