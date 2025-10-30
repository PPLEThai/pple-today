'use client'

import { useRef, useState } from 'react'

import { Button } from '@pple-today/web-ui/button'
import { Popover, PopoverAnchor, PopoverContent } from '@pple-today/web-ui/popover'

export const FeedDetailCopyId = ({ id, label }: { id: string; label?: string }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [displayText, setDisplayText] = useState('คัดลอก ID แล้ว')
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const popupPopover = () => {
    clearInterval(timeoutRef.current)
    setIsPopoverOpen(true)
    timeoutRef.current = setTimeout(() => {
      setIsPopoverOpen(false)
      setDisplayText('คัดลอก ID แล้ว')
    }, 1000)
  }

  const copy = async () => {
    try {
      await window.navigator.clipboard.writeText(id)
    } catch {
      setDisplayText('คัดลอก ID ไม่สําเร็จ')
    } finally {
      popupPopover()
    }
  }

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverAnchor asChild>
        <Button className="p-0 h-auto min-w-0" variant="link" onClick={copy}>
          <span className="w-full truncate">{label ?? id}</span>
        </Button>
      </PopoverAnchor>
      <PopoverContent side="right" className="w-fit text-sm p-2">
        {displayText}
      </PopoverContent>
    </Popover>
  )
}
