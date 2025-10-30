'use client'

import { ReactNode } from 'react'

import { Input } from '@pple-today/web-ui/input'
import { Label } from '@pple-today/web-ui/label'
import { MultiSelect } from '@pple-today/web-ui/multi-select'
import { Search } from 'lucide-react'

interface TextFilter {
  type: 'text'
  key: string
  label: string
  state: string
  setState: React.Dispatch<React.SetStateAction<string>>
}

interface EnumFilter {
  type: 'enum'
  key: string
  label: string
  options: { value: string; label: string }[]
  state: string[]
  setState: React.Dispatch<React.SetStateAction<string[]>>
}

interface DtFilterProps {
  filter: (TextFilter | EnumFilter)[]
  filterExtension?: ReactNode
  onChange?: () => void
}

export const DtFilter = ({ filter, filterExtension, onChange }: DtFilterProps) => {
  return (
    <div className="flex items-center gap-3">
      {filter.map((item) => {
        if (item.type === 'enum')
          return (
            <div key={item.key} className="relative max-w-96">
              <MultiSelect
                options={item.options}
                defaultValue={item.state}
                onValueChange={(values) => {
                  item.setState(values)
                  onChange?.()
                }}
                placeholder={item.label}
              />
            </div>
          )
        return (
          <div key={item.key} className="relative">
            <Label className="sr-only" htmlFor="search">
              {item.label}
            </Label>
            <Input
              id="search"
              className="pl-9 max-w-96"
              placeholder={item.label}
              value={item.state}
              onChange={(event) => {
                item.setState(event.target.value)
                onChange?.()
              }}
            />
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-base-text-high select-none" />
          </div>
        )
      })}
      {filterExtension && <div className="ml-auto">{filterExtension}</div>}
    </div>
  )
}
