'use client'

import { useRef, useState } from 'react'

import { Button } from '@pple-today/web-ui/button'
import { Popover, PopoverAnchor, PopoverContent } from '@pple-today/web-ui/popover'
import { Link } from 'lucide-react'

export const TableCopyId = ({ id }: { id: string }) => {
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
        <Button className="size-8" variant="ghost" size="icon" onClick={copy} aria-label="Copy ID">
          <Link className="size-4" />
        </Button>
      </PopoverAnchor>
      <PopoverContent side="right" className="w-fit text-sm p-2">
        {displayText}
      </PopoverContent>
    </Popover>
  )
}
