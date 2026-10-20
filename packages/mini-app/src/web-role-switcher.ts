import { EligiblePerson, SsoMeResponseSchema } from './models'

/**
 * The role switch outside PPLE Today: the SDK talks to PPLE ID itself and draws
 * its own picker, where inside the app the host shows a native one.
 *
 * Both calls use the mini app's own access token — the same token PPLE Today
 * mints for the app — so the browser needs nothing the in-app path does not.
 * PPLE ID must answer these routes with CORS headers for the app's origin.
 */

export async function fetchRoleInfo(oauthUrl: string, accessToken: string) {
  const response = await fetch(new URL('/api/me', oauthUrl), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error(`[PPLE Mini App] Could not load roles (${response.status})`)

  const body = SsoMeResponseSchema.parse(await response.json())
  return {
    activePersonId: body.data.active_pple_person_id ?? null,
    persons: body.data.approved_roles ?? [],
  }
}

export async function switchRoleOnServer(
  oauthUrl: string,
  accessToken: string,
  person: EligiblePerson
) {
  const response = await fetch(new URL('/api/me/switch-role', oauthUrl), {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    // `role` alongside the id: older PPLE ID builds require it.
    body: JSON.stringify({ pple_person_id: person.id, role: person.role }),
  })
  if (!response.ok) throw new Error(`[PPLE Mini App] Could not switch role (${response.status})`)
}

const STYLE = `
  :host { all: initial; }
  .backdrop {
    position: fixed; inset: 0; z-index: 2147483647;
    display: flex; align-items: center; justify-content: center; padding: 16px;
    background: rgba(15, 23, 42, 0.5);
    font-family: 'Anakotmai', 'Noto Sans Thai', system-ui, -apple-system, sans-serif;
  }
  .dialog {
    box-sizing: border-box; width: 100%; max-width: 400px; max-height: calc(100vh - 32px);
    display: flex; flex-direction: column; gap: 16px; padding: 24px;
    border-radius: 16px; background: #fff; color: #0f172a;
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.2);
  }
  h2 { margin: 0; font-size: 20px; font-weight: 700; line-height: 1.3; }
  p { margin: 0; font-size: 14px; color: #475569; line-height: 1.5; }
  .label { font-size: 14px; color: #475569; }
  .list { overflow-y: auto; max-height: 240px; display: flex; flex-direction: column; }
  .row {
    display: flex; align-items: center; gap: 12px; padding: 12px 0; cursor: pointer;
    font-size: 16px; line-height: 1.4;
  }
  .row input { width: 20px; height: 20px; margin: 0; accent-color: #ff6a13; flex: none; }
  .secondary { display: block; font-size: 13px; color: #64748b; }
  .error { font-size: 14px; color: #dc2626; }
  .actions { display: flex; gap: 8px; justify-content: flex-end; }
  button {
    font: inherit; font-size: 16px; padding: 10px 16px; border-radius: 10px;
    border: 1px solid #e2e8f0; background: #fff; color: #0f172a; cursor: pointer;
  }
  button.primary { background: #ff6a13; border-color: #ff6a13; color: #fff; }
  button:disabled { opacity: 0.5; cursor: default; }
  button:focus-visible, .row input:focus-visible { outline: 2px solid #ff6a13; outline-offset: 2px; }
`

// Mirrors the PPLE Today picker row: the role, plus who a delegate acts for.
function rowCopy(person: EligiblePerson) {
  const primary = person.role_label?.trim() || person.role
  if (person.role !== 'delegate' || !person.supervisor_full_name)
    return { primary, secondary: null }

  const secondary = person.supervisor_role_label
    ? `${person.supervisor_full_name} · ${person.supervisor_role_label}`
    : person.supervisor_full_name
  return { primary, secondary }
}

/**
 * Shows the picker and resolves with the chosen person, or `null` on cancel.
 *
 * `onConfirm` runs the switch while the dialog stays up; if it throws, the error
 * is shown and the user can try again or cancel — as the native picker does.
 * Rendered in a shadow root so the host page's CSS cannot reach it, and its CSS
 * cannot leak into the page.
 */
export function showRoleSwitchDialog(options: {
  persons: EligiblePerson[]
  activePersonId: number | null
  onConfirm: (person: EligiblePerson) => Promise<void>
}): Promise<EligiblePerson | null> {
  const { persons, activePersonId, onConfirm } = options

  return new Promise((resolve) => {
    const container = document.createElement('div')
    container.setAttribute('data-pple-mini-app', 'role-switch')
    const root = container.attachShadow({ mode: 'closed' })
    const previousFocus = document.activeElement as HTMLElement | null

    const style = document.createElement('style')
    style.textContent = STYLE

    const backdrop = document.createElement('div')
    backdrop.className = 'backdrop'

    const dialog = document.createElement('div')
    dialog.className = 'dialog'
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-modal', 'true')
    dialog.setAttribute('aria-labelledby', 'pple-role-title')

    const title = document.createElement('h2')
    title.id = 'pple-role-title'
    title.textContent = 'เปลี่ยนบทบาท'

    const description = document.createElement('p')
    description.textContent = 'เลือกบทบาทที่จะใช้งาน'

    const label = document.createElement('div')
    label.className = 'label'
    label.textContent = 'บทบาท:'

    const list = document.createElement('div')
    list.className = 'list'
    list.setAttribute('role', 'radiogroup')

    let selectedId = activePersonId ?? persons[0]?.id ?? null
    const inputs: HTMLInputElement[] = []

    for (const person of persons) {
      const { primary, secondary } = rowCopy(person)
      const row = document.createElement('label')
      row.className = 'row'

      const input = document.createElement('input')
      input.type = 'radio'
      input.name = 'pple-role'
      input.value = String(person.id)
      input.checked = person.id === selectedId
      input.addEventListener('change', () => {
        selectedId = person.id
      })
      inputs.push(input)

      const text = document.createElement('span')
      text.textContent = primary
      if (secondary) {
        const sub = document.createElement('span')
        sub.className = 'secondary'
        sub.textContent = secondary
        text.append(sub)
      }

      row.append(input, text)
      list.append(row)
    }

    const error = document.createElement('div')
    error.className = 'error'
    error.setAttribute('role', 'alert')
    error.hidden = true

    const cancelButton = document.createElement('button')
    cancelButton.type = 'button'
    cancelButton.textContent = 'ยกเลิก'

    const confirmButton = document.createElement('button')
    confirmButton.type = 'button'
    confirmButton.className = 'primary'
    confirmButton.textContent = 'เปลี่ยนบทบาท'

    const actions = document.createElement('div')
    actions.className = 'actions'
    actions.append(cancelButton, confirmButton)

    dialog.append(title, description, label, list, error, actions)
    backdrop.append(dialog)
    root.append(style, backdrop)

    let submitting = false
    const setSubmitting = (value: boolean) => {
      submitting = value
      for (const element of [...inputs, cancelButton, confirmButton]) element.disabled = value
    }

    const close = (result: EligiblePerson | null) => {
      document.removeEventListener('keydown', onKeyDown, true)
      container.remove()
      previousFocus?.focus?.()
      resolve(result)
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !submitting) {
        event.stopPropagation()
        close(null)
      }
    }

    cancelButton.addEventListener('click', () => close(null))
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop && !submitting) close(null)
    })
    confirmButton.addEventListener('click', async () => {
      const person = persons.find((entry) => entry.id === selectedId)
      if (!person) return

      // Picking the current person is not a switch; the caller reports it as
      // unchanged without calling PPLE ID.
      if (person.id === activePersonId) return close(person)

      setSubmitting(true)
      error.hidden = true
      try {
        await onConfirm(person)
        close(person)
      } catch (cause) {
        console.warn('[PPLE Mini App] Role switch failed', cause)
        error.textContent = 'เปลี่ยนบทบาทไม่สำเร็จ'
        error.hidden = false
        setSubmitting(false)
      }
    })

    document.addEventListener('keydown', onKeyDown, true)
    document.body.append(container)
    ;(inputs.find((input) => input.checked) ?? confirmButton).focus()
  })
}
