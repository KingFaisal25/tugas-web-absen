import React, { createContext, useContext, useEffect, useState } from 'react'

type AccessibilityContextType = {
  highContrast: boolean
  toggleHighContrast: () => void
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null)

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [highContrast, setHighContrast] = useState(false)
  useEffect(() => {
    const root = document.documentElement
    if (highContrast) root.classList.add('hc')
    else root.classList.remove('hc')
  }, [highContrast])
  const toggleHighContrast = () => setHighContrast(v => !v)
  return <AccessibilityContext.Provider value={{ highContrast, toggleHighContrast }}>{children}</AccessibilityContext.Provider>
}

export const useAccessibility = () => {
  const ctx = useContext(AccessibilityContext)
  if (!ctx) throw new Error('AccessibilityContext')
  return ctx
}
