import React, { forwardRef, Fragment } from 'react'

import BottomSheet, {
  BottomSheetBackdrop as BSBackdrop,
  BottomSheetHandle as BSHandle,
  BottomSheetModal as BSModal,
  BottomSheetModal as BSModalType,
  BottomSheetModalProvider,
  BottomSheetScrollView as BSScrollView,
  BottomSheetView as BSView,
} from '@gorhom/bottom-sheet'
import { cssInterop } from 'nativewind'

import { BottomSheetProps, BSHandleProps } from './types'

const BottomSheetTrigger = Fragment

type BottomSheetModal = BSModalType

const BottomSheetModal = forwardRef<
  BSModal,
  BottomSheetProps & { children: React.ReactNode; isOpen?: boolean }
>(function BottomSheetModal({ children, ...rest }: BottomSheetProps, ref) {
  return (
    <BSModal
      ref={ref}
      backdropComponent={(props) => (
        <BSBackdrop disappearsOnIndex={-1} appearsOnIndex={0} {...props} />
      )}
      {...rest}
    >
      {children}
    </BSModal>
  )
})

const BottomSheetView = cssInterop(BSView, {
  className: 'style',
})

const BottomSheetScrollView: React.ComponentType<any> = cssInterop(BSScrollView, {
  className: 'style',
  contentContainerClassName: 'contentContainerStyle',
})

const BottomSheetHandle: React.FC<BSHandleProps> = BSHandle

export {
  BottomSheet,
  BottomSheetHandle,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetScrollView,
  BottomSheetTrigger,
  BottomSheetView,
}
