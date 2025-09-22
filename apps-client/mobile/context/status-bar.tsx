import React, { useEffect } from 'react'

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
  useEffect(() => {
    setStatusBarColor('light')
    return () => {
      setStatusBarColor('dark')
    }
  }, [setStatusBarColor])
}
