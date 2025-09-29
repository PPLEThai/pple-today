import React, { useEffect, useRef } from 'react'

import { usePathname } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

interface StatusBarContextValue {
  statusBarColor: 'light' | 'dark'
  setStatusBarColor: (scheme: 'light' | 'dark') => void
}

const StatusBarContext = React.createContext<StatusBarContextValue | null>(null)

interface StatusBarProviderProps {
  children: React.ReactNode
}
export function StatusBarProvider({ children }: StatusBarProviderProps) {
  const [statusBarColor, setStatusBarColor] = React.useState<'light' | 'dark'>('dark')
  return (
    <StatusBarContext.Provider value={{ statusBarColor, setStatusBarColor }}>
      <StatusBar style={statusBarColor} />
      {children}
    </StatusBarContext.Provider>
  )
}

function useStatusBar() {
  const context = React.useContext(StatusBarContext)
  if (!context) {
    throw new Error('useStatusBar must be used within a StatusBarProvider')
  }
  return context
}

export function useLightStatusBar() {
  const { setStatusBarColor } = useStatusBar()
  const pathname = usePathname()
  const firstPathname = useRef(pathname)
  useEffect(() => {
    if (firstPathname.current === pathname) {
      setStatusBarColor('light')
    } else {
      setStatusBarColor('dark')
    }
    return () => {
      setStatusBarColor('dark')
    }
  }, [pathname, setStatusBarColor])
}
