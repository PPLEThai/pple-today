import { type EligiblePerson } from '@app/utils/active-role'
import { preferredPersonForApp } from '@app/utils/mini-app-role-gate'

import { PersonRolePickerDialog } from './role-person-picker'

/**
 * The prompt shown when someone opens a mini app their active บทบาท is not
 * listed for.
 *
 * The role list decides whose app grid shows the app, and the app itself
 * authorises every route it serves — so this is a question, not a refusal. A
 * user with several eligible people is offered the one that fits before they
 * commit; a user with one person is simply asked to confirm.
 */
export function MiniAppRoleGateDialog({
  appName,
  requiredRoles,
  eligiblePersons,
  activePersonId,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: {
  appName: string
  /** Canonical role values the app is listed for. */
  requiredRoles: string[]
  eligiblePersons: EligiblePerson[]
  activePersonId: number | null
  /** The บทบาท switch behind เข้าใช้งาน is still running. */
  isSubmitting?: boolean
  onCancel: () => void
  /** The person to enter as — `null` when there is nothing to switch to. */
  onConfirm: (personId: number | null) => void | Promise<void>
}) {
  const preferredPersonId = preferredPersonForApp({
    eligiblePersons,
    requiredRoles,
    activePersonId,
  })
  const canSwitchPerson = eligiblePersons.length > 1

  return (
    <PersonRolePickerDialog
      title={`กำลังเข้าสู่แอปฯ "${appName}"`}
      description={
        canSwitchPerson
          ? 'เนื่องจากบทบาทปัจจุบันของท่าน ไม่อยู่ในรายชื่อที่สามารถเข้าใช้งานได้ ท่านต้องการเปลี่ยนบทบาทก่อนเข้าใช้งานหรือไม่'
          : 'เนื่องจากบทบาทของท่าน ไม่อยู่ในรายชื่อที่สามารถเข้าใช้งานได้ ยืนยันที่จะเข้าแอปฯหรือไม่'
      }
      confirmLabel="เข้าใช้งาน"
      eligiblePersons={eligiblePersons}
      preferredPersonId={preferredPersonId}
      showList={canSwitchPerson}
      isSubmitting={isSubmitting}
      onCancel={onCancel}
      // With no person list on screen, the copy only asks them to confirm —
      // so nothing is switched behind their back.
      onConfirm={(personId) => onConfirm(canSwitchPerson ? personId : null)}
    />
  )
}
