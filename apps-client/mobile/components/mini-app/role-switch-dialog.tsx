import { type EligiblePerson } from '@app/utils/active-role'

import { PersonRolePickerDialog } from './role-person-picker'

/**
 * The บทบาท picker a mini app raises through the session bridge
 * (`pple:role-switch-request`).
 *
 * Unlike the role prompt, nothing is wrong here — the app simply offers the
 * switch — so the picker starts on the person already active, and choosing
 * them again changes nothing. The app is named because the request comes from
 * a page, not from PPLE Today itself: the user should know who is asking.
 */
export function MiniAppRoleSwitchDialog({
  appName,
  eligiblePersons,
  activePersonId,
  isLoading = false,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: {
  /** Null until the app asking is known. */
  appName: string | null
  eligiblePersons: EligiblePerson[]
  activePersonId: number | null
  /** The app is still being resolved: a spinner stands in for the list. */
  isLoading?: boolean
  /** The บทบาท switch behind เปลี่ยนบทบาท is still running. */
  isSubmitting?: boolean
  onCancel: () => void
  /** The person picked — the active one when the user changed nothing. */
  onConfirm: (personId: number | null) => void | Promise<void>
}) {
  return (
    <PersonRolePickerDialog
      title="เปลี่ยนบทบาท"
      description={
        appName != null ? `"${appName}" ขอให้คุณเลือกบทบาทที่จะใช้งาน` : 'เลือกบทบาทที่จะใช้งาน'
      }
      confirmLabel="เปลี่ยนบทบาท"
      eligiblePersons={eligiblePersons}
      preferredPersonId={activePersonId}
      showList
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
