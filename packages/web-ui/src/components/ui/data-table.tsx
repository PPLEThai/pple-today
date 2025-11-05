'use client'

import { ReactNode } from 'react'

import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table'

interface DataTableProps<TData> {
  columns: {
    [K in keyof TData]: ColumnDef<TData, TData[K]>
  }[keyof TData][]
  data: TData[]
  isQuerying?: boolean
  headerExtension?: ReactNode
  footerExtension?: ReactNode
}

export function DataTable<TData>({
  columns,
  data,
  isQuerying,
  headerExtension,
  footerExtension,
}: DataTableProps<TData>) {
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
    <div className="w-full">
      {headerExtension}
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
      {footerExtension}
    </div>
  )
}
