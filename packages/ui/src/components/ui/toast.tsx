import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast, { ToastConfig, ToastConfigParams, ToastShowParams } from 'react-native-toast-message'

import { cva } from 'class-variance-authority'
import { LucideIcon, XIcon } from 'lucide-react-native'

import { Button } from './button'
import { Icon } from './icon'
import { Text } from './text'

interface ToastAdditionalProps {
  icon?: LucideIcon | null
  action?: null | ((props: ToastConfigParams<any>) => React.ReactNode)
}

const toastVariants = cva(
  'flex flex-row items-center gap-4 rounded-2xl border border-base-outline-default px-4 py-3 shadow-lg',
  {
    variants: {
      type: {
        success: 'bg-base-primary-default',
        error: 'bg-system-danger-default',
      },
    },
    defaultVariants: {
      type: 'success',
    },
  }
)

function ToastBody(props: ToastConfigParams<ToastAdditionalProps>) {
  const type = props.type as ToastType
  return (
    <View className={toastVariants({ type })}>
      {props.props.icon ? (
        <Icon icon={props.props.icon} className="text-white" size={26} strokeWidth={2} />
      ) : null}
      <View className="flex flex-col gap-1">
        {props.text1 && (
          <Text className="text-sm text-white font-heading-semibold">{props.text1}</Text>
        )}
        {props.text2 && (
          <Text className="text-sm text-white font-heading-regular">{props.text2}</Text>
        )}
      </View>
      {props.props.action === null ? null : typeof props.props.action === 'function' ? (
        props.props.action(props)
      ) : (
        <Button variant="link" size="icon" className="h-6 w-6" onPress={() => props.hide()}>
          <Icon icon={XIcon} className="text-white" />
        </Button>
      )}
    </View>
  )
}

type ToastType = 'success' | 'error'
const config: ToastConfig = {
  success: ToastBody,
  error: ToastBody,
} satisfies Record<ToastType, ToastConfig[ToastType]>

export const Toaster = () => {
  const insets = useSafeAreaInsets()
  return <Toast config={config} topOffset={insets.top + 20} />
}

interface Toast {
  (props: ToastProps): void
  error: (props: ToastProps) => void
}
interface ToastProps extends ToastShowParams, ToastAdditionalProps {}
export const toast: Toast = ({ icon, action, ...props }) => {
  Toast.show({ ...props, type: 'success', props: { icon, action } })
}

toast.error = ({ icon, action, ...props }) => {
  Toast.show({ ...props, type: 'error', props: { icon, action } })
}
