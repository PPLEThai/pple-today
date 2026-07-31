import * as React from 'react'
import { ScrollView, View } from 'react-native'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@pple-today/ui/alert-dialog'
import { Button } from '@pple-today/ui/button'
import { Text } from '@pple-today/ui/text'
import * as RadioGroupPrimitive from '@rn-primitives/radio-group'

import { toRoleLabel, toRoleValue } from '@app/utils/ad-role'
import { preferredRoleForApp } from '@app/utils/mini-app-role-gate'

/**
 * The prompt shown when someone opens a mini app their active บทบาท is not
 * listed for.
 *
 * The role list decides whose app grid shows the app, and the app itself
 * authorises every route it serves — so this is a question, not a refusal. A
 * user with several eligible roles is offered the one that fits before they
 * commit; a user with one role is simply asked to confirm.
 */
export function MiniAppRoleGateDialog({
  appName,
  requiredRoles,
  eligibleRoles,
  activeRole,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: {
  appName: string
  /** Canonical role values the app is listed for. */
  requiredRoles: string[]
  /** Roles this user may switch between, as SSO reports them. */
  eligibleRoles: string[]
  activeRole: string | null
  /** The บทบาท switch behind เข้าใช้งาน is still running. */
  isSubmitting?: boolean
  onCancel: () => void
  /** The role to enter as — `null` when there is nothing to switch to. */
  onConfirm: (role: string | null) => void
}) {
  // Null until the user picks: the default follows `eligibleRoles`, which the
  // active-role query fills in a moment after this dialog can first appear.
  const [chosenRole, setChosenRole] = React.useState<string | null>(null)
  const preferredRole = preferredRoleForApp({ eligibleRoles, requiredRoles, activeRole })
  const selectedRole = chosenRole ?? preferredRole

  const canSwitchRole = eligibleRoles.length > 1

  return (
    <AlertDialog
      open
      onOpenChange={(next) => {
        // The only route to `false` left is dismissal (Android back), which is
        // a cancel — the footer buttons are plain buttons for exactly this
        // reason. Ignored mid-switch so a stray dismissal cannot orphan it.
        if (!next && !isSubmitting) onCancel()
      }}
    >
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{`กำลังเข้าสู่แอปฯ "${appName}"`}</AlertDialogTitle>
          <AlertDialogDescription>
            {canSwitchRole
              ? 'เนื่องจากบทบาทปัจจุบันของท่าน ไม่อยู่ในรายชื่อที่สามารถเข้าใช้งานได้ ท่านต้องการเปลี่ยนบทบาทก่อนเข้าใช้งานหรือไม่'
              : 'เนื่องจากบทบาทของท่าน ไม่อยู่ในรายชื่อที่สามารถเข้าใช้งานได้ ยืนยันที่จะเข้าแอปฯหรือไม่'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {canSwitchRole && (
          <View className="flex flex-col gap-2">
            <Text className="font-heading-regular text-base-text-medium">บทบาท:</Text>
            {/* Listed inline rather than in a Select: a Select opens through the
                same portal host the dialog is already using, and on iOS its
                dropdown lands under the dialog layer where no tap can reach it.
                With a handful of roles the list is the better control anyway. */}
            <ScrollView
              className="max-h-48 rounded-lg border border-input"
              contentContainerClassName="px-3 py-1"
            >
              <RadioGroupPrimitive.Root
                className="flex flex-col"
                value={selectedRole ?? ''}
                onValueChange={setChosenRole}
                disabled={isSubmitting}
              >
                {eligibleRoles.map((role) => {
                  const value = toRoleValue(role)
                  const label = toRoleLabel(role)
                  return (
                    <RadioGroupPrimitive.Item
                      key={value}
                      value={value}
                      aria-label={label}
                      // The whole row is the tap target, not just the dot.
                      className="py-3 flex flex-row gap-3 items-center"
                    >
                      <View className="aspect-square h-5 w-5 rounded-full justify-center items-center border border-primary">
                        <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
                          <View className="aspect-square h-[10px] w-[10px] bg-primary rounded-full" />
                        </RadioGroupPrimitive.Indicator>
                      </View>
                      <Text className="font-heading-regular text-base-text-high">{label}</Text>
                    </RadioGroupPrimitive.Item>
                  )
                })}
              </RadioGroupPrimitive.Root>
            </ScrollView>
          </View>
        )}
        {/* Plain buttons rather than AlertDialogAction/Cancel: both of those
            close the dialog through `onOpenChange`, which here means "the user
            gave up" — confirming has to keep the dialog up while the บทบาท is
            switched. */}
        <AlertDialogFooter>
          <Button variant="outline" onPress={onCancel} disabled={isSubmitting}>
            <Text>ยกเลิก</Text>
          </Button>
          {/* With no role list on screen, the copy only asks them to confirm —
              so nothing is switched behind their back. */}
          <Button
            onPress={() => onConfirm(canSwitchRole ? selectedRole : null)}
            disabled={isSubmitting}
          >
            <Text>เข้าใช้งาน</Text>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
