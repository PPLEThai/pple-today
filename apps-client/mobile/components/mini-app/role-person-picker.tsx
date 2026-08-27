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

import { type EligiblePerson, personRowCopy } from '@app/utils/active-role'

/**
 * Radio list of eligible people, keyed by `pple_person.id`.
 *
 * Listed inline rather than in a Select: a Select opens through the same portal
 * host a dialog is already using, and on iOS its dropdown lands under the dialog
 * layer where no tap can reach it. Two `delegate` rows must stay two options,
 * distinguished by supervisor, even though `role` is the same.
 */
export function EligiblePersonRadioList({
  persons,
  value,
  onValueChange,
  disabled = false,
}: {
  persons: EligiblePerson[]
  value: string | null
  onValueChange: (id: string) => void
  disabled?: boolean
}) {
  return (
    <View className="flex flex-col gap-2">
      <Text className="font-heading-regular text-base-text-medium">บทบาท:</Text>
      <ScrollView className="max-h-48">
        <RadioGroupPrimitive.Root
          className="flex flex-col"
          value={value ?? ''}
          onValueChange={onValueChange}
          disabled={disabled}
        >
          {persons.map((person) => {
            const { primary, secondary } = personRowCopy(person)
            return (
              <RadioGroupPrimitive.Item
                key={String(person.id)}
                value={String(person.id)}
                aria-label={secondary ? `${primary} ${secondary}` : primary}
                // The whole row is the tap target, not just the dot.
                className="py-3 flex flex-row gap-3 items-center"
              >
                <View className="aspect-square h-5 w-5 rounded-full justify-center items-center border border-primary">
                  <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
                    <View className="aspect-square h-[10px] w-[10px] bg-primary rounded-full" />
                  </RadioGroupPrimitive.Indicator>
                </View>
                <View className="flex-1 flex flex-col">
                  <Text className="font-heading-regular text-base-text-high">{primary}</Text>
                  {secondary ? (
                    <Text className="font-heading-regular text-sm text-base-text-medium">
                      {secondary}
                    </Text>
                  ) : null}
                </View>
              </RadioGroupPrimitive.Item>
            )
          })}
        </RadioGroupPrimitive.Root>
      </ScrollView>
    </View>
  )
}

/**
 * Shared บทบาท picker dialog: radio list + ยกเลิก / confirm.
 *
 * Confirm commits; tapping a radio does not. The dialog stays up while the
 * switch is in flight so a second confirm (or Android back) cannot orphan it.
 */
export function PersonRolePickerDialog({
  title,
  description,
  confirmLabel,
  eligiblePersons,
  preferredPersonId,
  showList,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: {
  title: string
  description?: string
  confirmLabel: string
  eligiblePersons: EligiblePerson[]
  preferredPersonId: number | null
  showList: boolean
  isSubmitting?: boolean
  onCancel: () => void
  onConfirm: (personId: number | null) => void | Promise<void>
}) {
  // Null until the user picks: the default follows `preferredPersonId`, which
  // the active-role query fills in a moment after this dialog can first appear.
  const [chosenId, setChosenId] = React.useState<string | null>(null)
  const selectedId = chosenId ?? (preferredPersonId != null ? String(preferredPersonId) : null)

  // Parent `isSubmitting` drops when switch-role returns, but the caller may
  // still be refreshing lists. Lock here until `onConfirm` settles so a second
  // tap in that gap cannot switch twice.
  const confirmLockedRef = React.useRef(false)
  const [confirmLocked, setConfirmLocked] = React.useState(false)
  const busy = isSubmitting || confirmLocked

  return (
    <AlertDialog
      open
      onOpenChange={(next) => {
        // The only route to `false` left is dismissal (Android back), which is
        // a cancel — the footer buttons are plain buttons for exactly this
        // reason. Ignored mid-switch so a stray dismissal cannot orphan it.
        if (!next && !busy) onCancel()
      }}
    >
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        {showList && (
          <EligiblePersonRadioList
            persons={eligiblePersons}
            value={selectedId}
            onValueChange={setChosenId}
            disabled={busy}
          />
        )}
        {/* Plain buttons rather than AlertDialogAction/Cancel: both of those
            close the dialog through `onOpenChange`, which here means "the user
            gave up" — confirming has to keep the dialog up while the บทบาท is
            switched. */}
        <AlertDialogFooter>
          <Button variant="outline" onPress={onCancel} disabled={busy}>
            <Text>ยกเลิก</Text>
          </Button>
          <Button
            onPress={async () => {
              if (busy || confirmLockedRef.current) return
              confirmLockedRef.current = true
              setConfirmLocked(true)
              try {
                await onConfirm(selectedId != null ? Number(selectedId) : null)
              } finally {
                confirmLockedRef.current = false
                setConfirmLocked(false)
              }
            }}
            disabled={busy}
          >
            <Text>{confirmLabel}</Text>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
