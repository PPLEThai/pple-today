import { toast } from '@pple-today/ui/toast'
import { type QueryClient, useQueryClient } from '@tanstack/react-query'
import { TriangleAlertIcon } from 'lucide-react-native'

import { useActiveRole, useSwitchRoleMutation } from '@app/libs/auth'

/**
 * The บทบาท switch behind the role prompt's เข้าใช้งาน, shared by the prompt on
 * opening a mini app and the one a bridge request raises inside it.
 *
 * `refreshLists` decides how the role-scoped app lists are refreshed afterwards:
 * the opening prompt resets them (nothing is on screen yet), while the bridge
 * must keep the current list in place — dropping it would put the screen back
 * into its loading state and tear down the WebView the request came from.
 */
export function useSwitchToPerson(refreshLists: (queryClient: QueryClient) => Promise<unknown>) {
  const queryClient = useQueryClient()
  const activeRoleQuery = useActiveRole()
  const switchRoleMutation = useSwitchRoleMutation()

  /**
   * Switches to `personId` unless it is already active (or `null`: enter as
   * they are). Resolves `false` when the switch failed — the user has been
   * told, and the prompt should stay up for another try.
   */
  const switchToPerson = async (personId: number | null): Promise<boolean> => {
    const activePersonId = activeRoleQuery.data?.activePersonId ?? null
    if (personId == null || personId === activePersonId) return true

    try {
      await switchRoleMutation.mutateAsync({ pplePersonId: personId })
    } catch {
      toast.error({ text1: 'เปลี่ยนบทบาทไม่สำเร็จ', icon: TriangleAlertIcon })
      return false
    }
    // The app grid is role-scoped, and the user may have just switched into a
    // person this app is listed for — drop the list they came in with.
    await refreshLists(queryClient)
    return true
  }

  return {
    switchToPerson,
    isSwitching: switchRoleMutation.isPending,
    /** Whether the active-role query has answered — the lists below are empty until then. */
    hasActiveRole: activeRoleQuery.data != null,
    eligiblePersons: activeRoleQuery.data?.eligiblePersons ?? [],
    activePersonId: activeRoleQuery.data?.activePersonId ?? null,
  }
}
