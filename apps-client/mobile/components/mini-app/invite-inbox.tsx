import { useCallback, useRef, useState } from 'react'
import { View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { toast } from '@pple-today/ui/toast'
import { H2, H3 } from '@pple-today/ui/typography'
import { QueryClient, useQueryClient } from '@tanstack/react-query'
import { MailOpenIcon } from 'lucide-react-native'

import { reactQueryClient } from '@app/libs/api-client'
import { useSession } from '@app/libs/auth'
import {
  inviteErrorMessage,
  isStaleInviteError,
  sortInvitesByNewestFirst,
} from '@app/utils/mini-app-invite'

/**
 * Refetch both lists an invitation touches.
 *
 * They always move together: answering removes the card, and accepting adds
 * the Beta app to the grid. Refetching both is what makes an accepted app
 * appear without restarting the app, so the pull-to-refresh on the แอป tab
 * shares this rather than keeping its own copy of the pair.
 */
export function refreshMiniAppLists(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: reactQueryClient.getQueryKey('/mini-app/invites'),
    }),
    queryClient.resetQueries({
      queryKey: reactQueryClient.getQueryKey('/mini-app'),
    }),
  ])
}

type InviteResponse = 'ACCEPT' | 'DECLINE'

/**
 * The invitee's side of a Beta invitation.
 *
 * A Builder can invite up to twenty testers by phone number; until the tester
 * accepts here, the app is not listed for them — the invitation is the consent
 * step, not the access itself, which is why the push notification that
 * announces it deliberately carries no deep link into the app.
 *
 * The section renders nothing at all when there is nothing to answer, so it
 * costs the ordinary user no space on the แอป tab.
 */
export function MiniAppInviteInbox() {
  const session = useSession()
  const queryClient = useQueryClient()

  const invitesQuery = reactQueryClient.useQuery('/mini-app/invites', {}, { enabled: !!session })

  const acceptMutation = reactQueryClient.useMutation('post', '/mini-app/invites/:miniAppId/accept')
  const declineMutation = reactQueryClient.useMutation(
    'post',
    '/mini-app/invites/:miniAppId/decline'
  )

  // Which invitation is in flight, and which way it was answered. The mutation
  // hooks' own `isPending` is per-hook, not per-card, so it would freeze every
  // card at once when a user answers one of several invitations.
  const [responding, setResponding] = useState<{
    miniAppId: string
    response: InviteResponse
  } | null>(null)

  // The state above drives rendering; this guards re-entry. Two presses landing
  // in the same tick both read the render-time state, so the state alone would
  // let a double-tap through.
  const isRespondingRef = useRef(false)

  const respond = useCallback(
    (miniAppId: string, miniAppName: string, response: InviteResponse) => {
      if (isRespondingRef.current) {
        return
      }

      isRespondingRef.current = true
      setResponding({ miniAppId, response })

      const mutation = response === 'ACCEPT' ? acceptMutation : declineMutation

      mutation.mutate(
        { pathParams: { miniAppId } },
        {
          onSuccess: () => {
            // Confirm before refetching: the answer is already recorded, and
            // making the user wait on two list refreshes to learn that would
            // make a successful tap feel like a stalled one.
            toast({
              text1:
                response === 'ACCEPT'
                  ? `เพิ่ม “${miniAppName}” ในรายการแอปของคุณแล้ว`
                  : 'ปฏิเสธคำเชิญแล้ว',
            })

            refreshMiniAppLists(queryClient)
          },
          onError: (error) => {
            console.error('Failed to respond to mini app invite', JSON.stringify(error))
            toast.error({ text1: inviteErrorMessage(error) })

            // Only refetch when the card is known to be stale — the Builder
            // withdrew the invitation, or it was answered on another device.
            // Refetching on *any* failure would mean a tap made offline clears
            // the cached mini-app list and then cannot refill it, emptying the
            // user's whole app grid.
            if (isStaleInviteError(error)) {
              refreshMiniAppLists(queryClient)
            }
          },
          onSettled: () => {
            isRespondingRef.current = false
            setResponding(null)
          },
        }
      )
    },
    [acceptMutation, declineMutation, queryClient]
  )

  const invites = sortInvitesByNewestFirst(invitesQuery.data ?? [])

  // Nothing to answer is the overwhelmingly common case, and a loading or
  // failed invite list must never push the app grid down or replace it: the
  // grid is what the user came to this tab for.
  if (invites.length === 0) {
    return null
  }

  return (
    <View className="flex flex-col px-4">
      <View className="flex flex-row gap-2 items-center">
        <Icon icon={MailOpenIcon} size={32} className="text-base-primary-default" />
        <H2 className="text-2xl font-heading-semibold text-base-text-high">คำเชิญทดลองใช้แอป</H2>
      </View>
      <View className="flex flex-col gap-2 mt-2">
        {invites.map((invite) => (
          <MiniAppInviteCard
            key={invite.miniAppId}
            miniAppName={invite.miniAppName}
            disabled={responding !== null}
            respondingWith={responding?.miniAppId === invite.miniAppId ? responding.response : null}
            onAccept={() => respond(invite.miniAppId, invite.miniAppName, 'ACCEPT')}
            onDecline={() => respond(invite.miniAppId, invite.miniAppName, 'DECLINE')}
          />
        ))}
      </View>
    </View>
  )
}

interface MiniAppInviteCardProps {
  miniAppName: string
  /** Every card is disabled while any one of them is being answered. */
  disabled: boolean
  /** How *this* card is being answered, if it is — so progress names the button the user actually pressed. */
  respondingWith: InviteResponse | null
  onAccept: () => void
  onDecline: () => void
}

const RESPONDING_LABEL = 'กำลังดำเนินการ...'

function MiniAppInviteCard({
  miniAppName,
  disabled,
  respondingWith,
  onAccept,
  onDecline,
}: MiniAppInviteCardProps) {
  return (
    <View className="w-full bg-base-bg-white border border-base-outline-default rounded-2xl flex flex-col gap-3 p-4">
      <View className="flex flex-col gap-1">
        <H3 className="text-base font-heading-semibold text-base-text-high">
          คุณถูกเชิญให้ทดลองใช้ “{miniAppName}”
        </H3>
        <Text className="text-sm font-heading-regular text-base-text-medium">
          แอปนี้อยู่ระหว่างทดลองใช้ หากตอบรับ แอปจะปรากฏในรายการแอปของคุณ
        </Text>
      </View>
      <View className="flex flex-row gap-2">
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          disabled={disabled}
          onPress={onAccept}
          aria-label={`ตอบรับคำเชิญทดลองใช้ ${miniAppName}`}
        >
          <Text>{respondingWith === 'ACCEPT' ? RESPONDING_LABEL : 'ตอบรับ'}</Text>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={disabled}
          onPress={onDecline}
          aria-label={`ปฏิเสธคำเชิญทดลองใช้ ${miniAppName}`}
        >
          <Text>{respondingWith === 'DECLINE' ? RESPONDING_LABEL : 'ปฏิเสธ'}</Text>
        </Button>
      </View>
    </View>
  )
}
