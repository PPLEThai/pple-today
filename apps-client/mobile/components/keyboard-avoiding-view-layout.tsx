import { Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export function KeyboardAvoidingViewLayout({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets()
  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0} // Adjust for header on iOS
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>{children}</TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  )
}
