'use client'

import { ReactNode } from 'react'

import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from 'lucide-react'

import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { MultiSelect } from './multi-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table'

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

interface DataTableProps<TData> {
  columns: {
    [K in keyof TData]: ColumnDef<TData, TData[K]>
  }[keyof TData][]
  data: TData[]
  count?: number
  isQuerying?: boolean
  isMutating?: boolean

  queryLimit?: number
  setQueryLimit?: React.Dispatch<React.SetStateAction<number>>
  queryPage?: number
  setQueryPage?: React.Dispatch<React.SetStateAction<number>>

  filter?: (TextFilter | EnumFilter)[]
  filterExtension?: ReactNode
}

export function DataTable<TData>({
  columns,
  data,
  count,
  isQuerying,
  isMutating,

  queryLimit,
  setQueryLimit,
  queryPage,
  setQueryPage,

  filter = [],
  filterExtension,
}: DataTableProps<TData>) {
  const hasPageLimiter = queryLimit !== undefined && setQueryLimit !== undefined
  const hasPaginator = queryPage !== undefined && setQueryPage !== undefined

  const totalPage =
    count !== undefined && queryLimit !== undefined ? Math.ceil(count / queryLimit) : 1

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualFiltering: true,
    defaultColumn: {
      size: -1,
      minSize: 32,
    },
  })

  return (
    <>
      {filter && filter.length > 0 && (
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
                      setQueryPage?.(1)
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
                    setQueryPage?.(1)
                  }}
                />
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-base-text-high select-none" />
              </div>
            )
          })}
          {filterExtension && <div className="ml-auto">{filterExtension}</div>}
        </div>
      )}
      <div className="w-full">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-base-bg-light">
                  {headerGroup.headers.map((header) => {
                    const headerSize = header.getSize()
                    return (
                      <TableHead
                        key={header.id}
                        style={{ width: headerSize <= 32 ? undefined : `${headerSize}px` }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isQuerying === true ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center h-[168px]">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center h-[168px]">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="text-base-text-medium flex-1 min-w-0 text-sm truncate font-light">
            <span>
              {isQuerying
                ? 'Querying Data...'
                : count !== undefined
                  ? `Showing ${data.length} of ${count} records`
                  : `Showing ${data.length} records`}{' '}
            </span>
            {isMutating && <span>(Saving changes...)</span>}
          </div>
          {(hasPageLimiter || hasPaginator) && (
            <div className="flex items-center space-x-6 lg:space-x-8">
              {hasPageLimiter && (
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-base-text-high">Rows per page</p>
                  <Select
                    value={`${queryLimit}`}
                    onValueChange={(value) => {
                      setQueryLimit(Number(value))
                    }}
                  >
                    <SelectTrigger className="h-9 w-[72px]">
                      <SelectValue placeholder={queryLimit} />
                    </SelectTrigger>
                    <SelectContent side="top">
                      {[10, 20, 30, 40, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {hasPaginator && (
                <>
                  <div className="flex items-center justify-center text-sm font-medium text-base-text-high">
                    Page {queryPage} of {totalPage}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="hidden size-8 lg:flex"
                      onClick={() => setQueryPage(1)}
                      disabled={queryPage <= 1}
                    >
                      <span className="sr-only">Go to first page</span>
                      <ChevronsLeft className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      onClick={() => setQueryPage((page) => page - 1)}
                      disabled={queryPage <= 1}
                    >
                      <span className="sr-only">Go to previous page</span>
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      onClick={() => setQueryPage((page) => page + 1)}
                      disabled={queryPage >= totalPage}
                    >
                      <span className="sr-only">Go to next page</span>
                      <ChevronRight className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="hidden size-8 lg:flex"
                      onClick={() => setQueryPage(totalPage)}
                      disabled={queryPage >= totalPage}
                    >
                      <span className="sr-only">Go to last page</span>
                      <ChevronsRight className="size-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
