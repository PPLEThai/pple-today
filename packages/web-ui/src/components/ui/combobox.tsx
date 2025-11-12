'use client'

import * as React from 'react'

import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'

import { Button } from './button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

import { cn } from '../../libs/utils'

interface ComboBoxProps {
  value?: string
  onChange?: (value: string) => void
  options?: { value: string; label: string }[]
  placeholder?: string
  inputPlaceholder?: string
  disabled?: boolean
}

export function ComboBox(props: ComboBoxProps) {
  const { onChange, options, value, placeholder, inputPlaceholder, disabled } = props
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          disabled={disabled}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between text-sm"
        >
          <p className={!value ? 'text-muted-foreground' : ''}>
            {value ? options?.find((framework) => framework.value === value)?.label : placeholder}
          </p>
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command className="p-0.5">
          <CommandInput className="p-2" placeholder={inputPlaceholder} />
          <CommandList>
            <CommandEmpty className="font-sans">No option found.</CommandEmpty>
            <CommandGroup>
              {options?.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onChange?.(currentValue === value ? '' : currentValue)
                    setOpen(false)
                  }}
                >
                  <CheckIcon
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="font-sans font-light">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
