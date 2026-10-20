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
  isSubmitting = false,
  onCancel,
  onConfirm,
}: {
  appName: string
  eligiblePersons: EligiblePerson[]
  activePersonId: number | null
  /** The บทบาท switch behind เปลี่ยนบทบาท is still running. */
  isSubmitting?: boolean
  onCancel: () => void
  /** The person picked — the active one when the user changed nothing. */
  onConfirm: (personId: number | null) => void | Promise<void>
}) {
  return (
    <PersonRolePickerDialog
      title="เปลี่ยนบทบาท"
      description={`"${appName}" ขอให้คุณเลือกบทบาทที่จะใช้งาน`}
      confirmLabel="เปลี่ยนบทบาท"
      eligiblePersons={eligiblePersons}
      preferredPersonId={activePersonId}
      showList
      isSubmitting={isSubmitting}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
