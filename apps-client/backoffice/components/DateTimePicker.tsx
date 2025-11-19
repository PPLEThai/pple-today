'use client'

import * as React from 'react'

import { Button } from '@pple-today/web-ui/button'
import { Calendar } from '@pple-today/web-ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@pple-today/web-ui/popover'
import { ScrollArea, ScrollBar } from '@pple-today/web-ui/scroll-area'
import { cn } from '@pple-today/web-ui/utils'
import { CalendarIcon } from 'lucide-react'
import dayjs from 'utils/date'

interface DatetimePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export const DateTimePicker = React.forwardRef<HTMLButtonElement, DatetimePickerProps>(
  ({ value, onChange, placeholder = 'กรุณาเลือกวันที่', className, disabled }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false)

    const hours = Array.from({ length: 24 }, (_, i) => i)
    const handleDateSelect = (selectedDate: Date | undefined) => {
      if (selectedDate && onChange) {
        onChange(selectedDate)
      }
    }

    const handleTimeChange = (type: 'hour' | 'minute', newValue: string) => {
      if (value) {
        const newDate = new Date(value)
        if (type === 'hour') {
          newDate.setHours(parseInt(newValue) % 24)
        } else if (type === 'minute') {
          newDate.setMinutes(parseInt(newValue))
        }
        onChange && onChange(newDate)
      }
    }

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            className={cn(
              'justify-start font-normal items-center text-sm gap-2',
              !value && 'text-muted-foreground font-light',
              className
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? (
              dayjs(value).locale('th').format('DD/MM/BBBB HH:mm')
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <div className="sm:flex">
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleDateSelect}
              className="w-full"
            />
            <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
              <ScrollArea className="w-64 sm:w-auto">
                <div className="flex sm:flex-col p-2">
                  {hours.map((hour) => (
                    <Button
                      key={hour}
                      size="icon"
                      variant={value && value.getHours() % 24 === hour % 24 ? 'default' : 'ghost'}
                      className="sm:w-full shrink-0 aspect-square"
                      onClick={() => handleTimeChange('hour', hour.toString())}
                    >
                      {hour.toString().padStart(2, '0')}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="sm:hidden" />
              </ScrollArea>
              <ScrollArea className="w-64 sm:w-auto">
                <div className="flex sm:flex-col p-2">
                  {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                    <Button
                      key={minute}
                      size="icon"
                      variant={value && value.getMinutes() === minute ? 'default' : 'ghost'}
                      className="sm:w-full shrink-0 aspect-square"
                      onClick={() => handleTimeChange('minute', minute.toString())}
                    >
                      {minute.toString().padStart(2, '0')}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="sm:hidden" />
              </ScrollArea>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  }
)

DateTimePicker.displayName = 'DateTimePicker'
