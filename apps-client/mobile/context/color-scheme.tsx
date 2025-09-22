import React from 'react'

interface ColorSchemeContextValue {
  colorScheme: 'light' | 'dark'
  setColorScheme: (scheme: 'light' | 'dark') => void
}

const ColorSchemeContext = React.createContext<ColorSchemeContextValue | null>(null)

interface ColorSchemeProviderProps {
  children: React.ReactNode
}
export function ColorSchemeProvider({ children }: ColorSchemeProviderProps) {
  const [colorScheme, setColorScheme] = React.useState<'light' | 'dark'>('light')
  return (
    <ColorSchemeContext.Provider value={{ colorScheme, setColorScheme }}>
      {children}
    </ColorSchemeContext.Provider>
  )
}

export function useColorScheme() {
  const context = React.useContext(ColorSchemeContext)
  if (!context) {
    throw new Error('useColorScheme must be used within a ColorSchemeProvider')
  }
  return context
}
