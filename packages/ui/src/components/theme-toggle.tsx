import { Button } from './ui/button'

import { setAndroidNavigationBar } from '../lib/android-navigation-bar'
import { MoonStar } from '../lib/icons/MoonStar'
import { Sun } from '../lib/icons/Sun'
import { useColorScheme } from '../lib/useColorScheme'

export function ThemeToggle() {
  const { isDarkColorScheme, setColorScheme } = useColorScheme()

  function toggleColorScheme() {
    const newTheme = isDarkColorScheme ? 'light' : 'dark'
    setColorScheme(newTheme)
    setAndroidNavigationBar(newTheme)
  }

  return (
    <Button onPress={toggleColorScheme} size="icon" variant="ghost">
      {isDarkColorScheme ? (
        <MoonStar size={23} strokeWidth={1.25} className="text-foreground" />
      ) : (
        <Sun size={24} strokeWidth={1.25} className="text-foreground" />
      )}
    </Button>
  )
}
