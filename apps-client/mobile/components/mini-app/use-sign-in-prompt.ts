import { useCallback, useRef, useState } from 'react'

import { usePathname, useRouter } from 'expo-router'

import { useDiscoveryQuery, useSignInInPlaceMutation } from '@app/libs/auth'

/**
 * Asks a signed-out user to sign in, for a mini app that needs a session —
 * whether it was opened by slug or its page asked over the bridge. One prompt
 * at a time: every caller asking while it is up waits on the same answer.
 *
 * `ask()` resolves `true` once signed in, `false` when the user cancels. A
 * failed or abandoned sign-in leaves the dialog up to try again or cancel.
 */
export function useSignInPrompt() {
  const discoveryQuery = useDiscoveryQuery()
  const signIn = useSignInInPlaceMutation()
  const router = useRouter()

  // On Android the sign-in redirect (`pple-today:///loading`) can reach the
  // router and push the loading screen over the mini app. It is popped once
  // sign-in settles, which brings the mini app — still mounted — back.
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  const [isOpen, setIsOpen] = useState(false)
  const resolveRef = useRef<((signedIn: boolean) => void) | null>(null)
  const pendingRef = useRef<Promise<boolean> | null>(null)

  const ask = useCallback(() => {
    if (pendingRef.current) return pendingRef.current
    const pending = new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
    }).finally(() => {
      pendingRef.current = null
    })
    pendingRef.current = pending
    setIsOpen(true)
    return pending
  }, [])

  const finish = useCallback((signedIn: boolean) => {
    setIsOpen(false)
    resolveRef.current?.(signedIn)
    resolveRef.current = null
  }, [])

  const confirm = async () => {
    if (!discoveryQuery.data || signIn.isPending) return
    try {
      await signIn.mutateAsync({ discovery: discoveryQuery.data })
      finish(true)
    } catch {
      // Cancelled in the browser or failed: `login` already logged which.
    } finally {
      if (pathnameRef.current === '/loading' && router.canGoBack()) router.back()
    }
  }

  return {
    ask,
    prompt: isOpen
      ? {
          isSubmitting: signIn.isPending || !discoveryQuery.data,
          onCancel: () => finish(false),
          onConfirm: confirm,
        }
      : null,
  }
}
