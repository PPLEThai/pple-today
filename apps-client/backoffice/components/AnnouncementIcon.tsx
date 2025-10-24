import { ComponentProps, useId } from 'react'

export const ANNOUNCEMENT_TYPE_LONG_DISPLAY_TEXT = {
  OFFICIAL: 'ประกาศจากรัฐบาล',
  PARTY_COMMUNICATE: 'ประกาศจากทางพรรค',
  INTERNAL: 'ประกาศสำหรับสมาชิกพรรค',
}

export const AnnouncementIcon = ({
  announcementType,
  ...props
}: { announcementType: 'OFFICIAL' | 'PARTY_COMMUNICATE' | 'INTERNAL' } & ComponentProps<'svg'>) => {
  const maskId = useId()

  if (announcementType === 'OFFICIAL')
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 32 32" {...props}>
        <rect width="32" height="32" fill="#E11D48" rx="16" />
        <path
          stroke="#fff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.333"
          d="M10 22.667h12M12 20v-4.666M14.667 20v-4.666M17.333 20v-4.666M20 20v-4.666m-4-6l5.333 3.333H10.667L16 9.334z"
        />
      </svg>
    )
  if (announcementType === 'PARTY_COMMUNICATE')
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 32 32" {...props}>
        <rect width="32" height="32" fill="#F04C06" rx="16" />
        <g fill="#fff" clipPath={`url(#${maskId})`}>
          <path d="M8.253 9.143h2.59l4.641 8.04-1.547 2.68L8 9.581l.253-.438zM15.748 23l-1.295-2.241 4.642-8.04h3.095L16.253 23h-.505zM24.001 9.582l-1.295 2.242h-9.284l-1.547-2.68H23.75l.252.438z" />
        </g>
        <defs>
          <clipPath id={maskId}>
            <path fill="#fff" d="M0 0h16v13.858H0z" transform="translate(8 9.143)" />
          </clipPath>
        </defs>
      </svg>
    )
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 32 32" {...props}>
      <rect width="32" height="32" fill="#002B49" rx="16" />
      <g fill="#FF6A13" clipPath={`url(#${maskId})`}>
        <path d="M8.253 9.143h2.59l4.641 8.04-1.547 2.68L8 9.581l.253-.438zM15.748 23l-1.295-2.241 4.642-8.04h3.095L16.253 23h-.505zM24.001 9.582l-1.295 2.242h-9.284l-1.547-2.68H23.75l.252.438z" />
      </g>
      <defs>
        <clipPath id={maskId}>
          <path fill="#fff" d="M0 0h16v13.858H0z" transform="translate(8 9.143)" />
        </clipPath>
      </defs>
    </svg>
  )
}
