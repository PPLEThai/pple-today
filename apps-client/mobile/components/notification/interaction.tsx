import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@pple-today/ui/alert-dialog'
import { Button } from '@pple-today/ui/button'
import { Checkbox } from '@pple-today/ui/checkbox'
import { Icon } from '@pple-today/ui/icon'
import { Input } from '@pple-today/ui/input'
import { RadioGroup, RadioGroupItem } from '@pple-today/ui/radio-group'
import { Text } from '@pple-today/ui/text'
import { Textarea } from '@pple-today/ui/textarea'
import { toast } from '@pple-today/ui/toast'
import type { UseMutationResult } from '@tanstack/react-query'
import {
  CalendarCheckIcon,
  CalendarXIcon,
  CheckIcon,
  CircleHelpIcon,
  ClockIcon,
  FlagIcon,
  HeartIcon,
  type LucideIcon,
  SendIcon,
  StarIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  UserCheckIcon,
  UserXIcon,
  XIcon,
} from 'lucide-react-native'

import type { NotificationInteraction as NotificationInteractionDto } from '@api/backoffice/app'
import { Spinner } from '@app/components/spinner'
import { reactQueryClient } from '@app/libs/api-client'
import {
  type FormValues,
  initialValues,
  type InteractionAction,
  interactionBlockedMessage,
  type InteractionField,
  interactionFromConflict,
  type InteractionIconName,
  type InteractionValues,
  isActionValid,
  isFieldRequiredFor,
  messageForClosed,
  normaliseValues,
  resolveActionStyle,
  resolveIconName,
  responseErrorCode,
  responseErrorMessage,
  shouldStackActions,
  summariseResponse,
  toggleOption,
  validateField,
} from '@app/libs/notification-interaction'

/** Bundled lucide icon for each allowlisted name. Mirrors the spec's icon table. */
const ICONS: Record<InteractionIconName, LucideIcon> = {
  check: CheckIcon,
  x: XIcon,
  'thumbs-up': ThumbsUpIcon,
  'thumbs-down': ThumbsDownIcon,
  'calendar-check': CalendarCheckIcon,
  'calendar-x': CalendarXIcon,
  clock: ClockIcon,
  send: SendIcon,
  heart: HeartIcon,
  star: StarIcon,
  flag: FlagIcon,
  'user-check': UserCheckIcon,
  'user-x': UserXIcon,
  help: CircleHelpIcon,
}

type SubmitVariables = {
  pathParams: { id: string }
  body: { actionId: string; values?: InteractionValues }
}
type SubmitMutation = UseMutationResult<
  { interaction: NotificationInteractionDto },
  unknown,
  SubmitVariables
>

// TODO(#515): remove cast once the `POST /notifications/:id/response` server route
// lands and is part of ApplicationApiSchema; call reactQueryClient.useMutation directly.
const useRespondMutation = reactQueryClient.useMutation as unknown as (
  method: 'post',
  path: '/notifications/:id/response'
) => SubmitMutation

type Props = {
  notificationId: string
  interaction: NotificationInteractionDto
  /**
   * An action the user already chose elsewhere (a tray action that needs the
   * app). Its fields show their errors straight away, and its confirm dialog
   * opens when it is ready to send.
   */
  pendingActionId?: string
  /** The server accepted the answer, or reported one already recorded (409). */
  onResponded?: (interaction: NotificationInteractionDto) => void
  /** The cached notification is out of date (410, or a 409 without a body). */
  onStale?: () => void
}

/**
 * The form for an interactive notification, built from the server's spec.
 * See docs/interactive-notifications.md, "Mobile client — in-app form".
 */
export function NotificationInteraction({
  notificationId,
  interaction,
  pendingActionId,
  onResponded,
  onStale,
}: Props) {
  const mutation = useRespondMutation('post', '/notifications/:id/response')

  // What the server told us this session, which can be newer than `interaction`.
  const [answered, setAnswered] = useState<NotificationInteractionDto | null>(null)
  const [closedMessage, setClosedMessage] = useState<string | null>(null)

  const current = answered ?? interaction
  const fields = current.fields
  const actions = current.actions

  const [values, setValues] = useState<FormValues>(() => initialValues(fields))
  // Fields the user has interacted with. Actions are disabled until valid, so
  // there is no failed press to key the "after first attempt" errors off; a
  // touched field (or the pending action's fields) is the attempt.
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [attemptedActionId, setAttemptedActionId] = useState<string | null>(pendingActionId ?? null)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<InteractionAction | null>(null)

  // Guards re-entry: two presses in one tick both read the render-time state.
  const isSubmittingRef = useRef(false)

  const submit = useCallback(
    (action: InteractionAction) => {
      if (isSubmittingRef.current) return
      isSubmittingRef.current = true
      setSubmitting(action.id)
      mutation.mutate(
        {
          pathParams: { id: notificationId },
          body: { actionId: action.id, values: normaliseValues(fields, values) },
        },
        {
          onSuccess: (data) => {
            setAnswered(data.interaction)
            onResponded?.(data.interaction)
            toast({ text1: 'ส่งคำตอบแล้ว' })
          },
          onError: (error) => {
            const code = responseErrorCode(error)
            if (code === 'NOTIFICATION_ALREADY_RESPONDED') {
              // Answered on another device or from the tray: not an error to the user.
              const existing = interactionFromConflict(error)
              if (existing) {
                setAnswered(existing)
                onResponded?.(existing)
              } else {
                onStale?.()
              }
              return
            }
            if (code === 'NOTIFICATION_INTERACTION_CLOSED') {
              setClosedMessage(messageForClosed(current.state))
              onStale?.()
              return
            }
            console.error('Failed to respond to notification', JSON.stringify(error))
            toast.error({ text1: responseErrorMessage(error) })
          },
          onSettled: () => {
            isSubmittingRef.current = false
            setSubmitting(null)
          },
        }
      )
    },
    [mutation, notificationId, fields, values, onResponded, onStale, current.state]
  )

  const press = useCallback(
    (action: InteractionAction) => {
      if (isSubmittingRef.current) return
      if (!isActionValid(fields, action, values)) {
        setAttemptedActionId(action.id)
        return
      }
      if (action.confirm) {
        setConfirming(action)
        return
      }
      submit(action)
    },
    [fields, values, submit]
  )

  // A tray action that opens the app lands here with that action pending: open
  // its confirm dialog if it is ready, otherwise the errors on its fields guide
  // the user. Runs once per pending id.
  const handledPendingRef = useRef<string | null>(null)
  useEffect(() => {
    if (!pendingActionId || handledPendingRef.current === pendingActionId) return
    if (current.state !== 'OPEN' || current.v !== 1) return
    handledPendingRef.current = pendingActionId
    const action = actions.find((a) => a.id === pendingActionId)
    if (!action) return
    setAttemptedActionId(action.id)
    if (action.confirm && isActionValid(fields, action, values)) setConfirming(action)
  }, [pendingActionId, current.state, current.v, actions, fields, values])

  if (closedMessage) return <StatusMessage text={closedMessage} />

  if (current.state === 'RESPONDED' && current.response) {
    return <ResponseSummary interaction={current} />
  }

  const blocked = interactionBlockedMessage(current)
  if (blocked) return <StatusMessage text={blocked} />

  const attemptedAction = actions.find((a) => a.id === attemptedActionId)
  const stacked = shouldStackActions(actions)
  const busy = submitting !== null

  return (
    <View className="flex flex-col gap-4 rounded-2xl border border-base-outline-default bg-base-bg-white p-4">
      {fields.map((field) => {
        const required = attemptedAction
          ? isFieldRequiredFor(field, attemptedAction)
          : field.required
        const showError = touched[field.id] || attemptedAction !== undefined
        const error = showError ? validateField(field, values[field.id], required) : null
        return (
          <FieldInput
            key={field.id}
            field={field}
            value={values[field.id]}
            error={error}
            disabled={busy}
            onChange={(next) => {
              setValues((prev) => ({ ...prev, [field.id]: next }))
              setTouched((prev) => ({ ...prev, [field.id]: true }))
            }}
          />
        )
      })}
      <View className={stacked ? 'flex flex-col gap-2' : 'flex flex-row gap-2'}>
        {actions.map((action, index) => {
          const style = resolveActionStyle(action, index)
          const iconName = resolveIconName(action.icon)
          return (
            <Button
              key={action.id}
              variant={style}
              className={stacked ? undefined : 'flex-1'}
              disabled={busy || !isActionValid(fields, action, values)}
              onPress={() => press(action)}
              aria-label={action.label}
            >
              {submitting === action.id ? (
                <Spinner />
              ) : iconName ? (
                <Icon icon={ICONS[iconName]} />
              ) : null}
              <Text>{action.label}</Text>
            </Button>
          )
        })}
      </View>
      <AlertDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null)
        }}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirming?.confirm?.title}</AlertDialogTitle>
            {confirming?.confirm?.message ? (
              <AlertDialogDescription>{confirming.confirm.message}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>ยกเลิก</Text>
            </AlertDialogCancel>
            <Button
              variant={
                confirming &&
                resolveActionStyle(confirming, actions.indexOf(confirming)) === 'destructive'
                  ? 'destructive'
                  : 'primary'
              }
              onPress={() => {
                const action = confirming
                setConfirming(null)
                if (action) submit(action)
              }}
            >
              <Text>{confirming?.label}</Text>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  )
}

function StatusMessage({ text }: { text: string }) {
  return (
    <View className="rounded-2xl border border-base-outline-default bg-base-bg-default p-4">
      <Text className="text-sm font-heading-medium text-base-text-medium">{text}</Text>
    </View>
  )
}

function ResponseSummary({ interaction }: { interaction: NotificationInteractionDto }) {
  const summary = summariseResponse(interaction)
  if (!summary) return null
  return (
    <View className="flex flex-col gap-2 rounded-2xl border border-base-outline-default bg-base-bg-default p-4">
      <Text className="text-sm font-heading-semibold text-base-text-high">{summary.headline}</Text>
      {summary.lines.map((line) => (
        <View key={line.label} className="flex flex-col">
          <Text className="text-xs font-heading-regular text-base-text-medium">{line.label}</Text>
          <Text className="text-sm font-body-regular text-base-text-high">{line.value}</Text>
        </View>
      ))}
    </View>
  )
}

type FieldInputProps = {
  field: InteractionField
  value: string | string[] | undefined
  error: string | null
  disabled: boolean
  onChange: (value: string | string[]) => void
}

function FieldInput({ field, value, error, disabled, onChange }: FieldInputProps) {
  return (
    <View className="flex flex-col gap-2">
      <Text className="text-sm font-heading-semibold text-base-text-high">
        {field.label}
        {field.required ? <Text className="text-base-danger-default"> *</Text> : null}
      </Text>
      {field.description ? (
        <Text className="text-xs font-body-regular text-base-text-medium">{field.description}</Text>
      ) : null}
      {field.type === 'text' ? (
        field.multiline ? (
          <Textarea
            value={typeof value === 'string' ? value : ''}
            onChangeText={onChange}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            editable={!disabled}
            aria-invalid={!!error}
          />
        ) : (
          <Input
            value={typeof value === 'string' ? value : ''}
            onChangeText={onChange}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            editable={!disabled}
            aria-invalid={!!error}
          />
        )
      ) : field.type === 'radio' ? (
        <RadioGroup
          value={typeof value === 'string' ? value : ''}
          onValueChange={onChange}
          className="gap-3"
        >
          {field.options.map((option) => (
            <Pressable
              key={option.id}
              className="flex flex-row items-center gap-3"
              disabled={disabled}
              onPress={() => onChange(option.id)}
            >
              <RadioGroupItem value={option.id} disabled={disabled} aria-label={option.label} />
              <Text className="flex-1 text-sm font-body-regular text-base-text-high">
                {option.label}
              </Text>
            </Pressable>
          ))}
        </RadioGroup>
      ) : (
        <View className="flex flex-col gap-3">
          {field.options.map((option) => {
            const picked = Array.isArray(value) ? value : []
            const checked = picked.includes(option.id)
            return (
              <Pressable
                key={option.id}
                className="flex flex-row items-center gap-3"
                disabled={disabled}
                onPress={() => onChange(toggleOption(field, picked, option.id))}
              >
                <Checkbox
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={() => onChange(toggleOption(field, picked, option.id))}
                  aria-label={option.label}
                />
                <Text className="flex-1 text-sm font-body-regular text-base-text-high">
                  {option.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      )}
      {error ? (
        <Text className="text-xs font-body-regular text-base-danger-default">{error}</Text>
      ) : null}
    </View>
  )
}
