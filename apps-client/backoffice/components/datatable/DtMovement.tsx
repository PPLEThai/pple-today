import { Button } from '@pple-today/web-ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pple-today/web-ui/select'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface DtMovementProps {
  length?: number
  count?: number
  isQuerying?: boolean
  isMutating?: boolean

  queryLimit?: number
  setQueryLimit?: React.Dispatch<React.SetStateAction<number>>
  queryPage?: number
  setQueryPage?: React.Dispatch<React.SetStateAction<number>>
}

export const DtMovement = ({
  length,
  count,
  isQuerying,
  isMutating,

  queryLimit,
  setQueryLimit,
  queryPage,
  setQueryPage,
}: DtMovementProps) => {
  const hasPageLimiter = queryLimit !== undefined && setQueryLimit !== undefined
  const hasPaginator = queryPage !== undefined && setQueryPage !== undefined

  const totalPage =
    count !== undefined && queryLimit !== undefined ? Math.ceil(count / queryLimit) : 1

  return (
    <div className="flex items-center justify-between mt-4">
      <div className="text-base-text-medium flex-1 min-w-0 text-sm truncate font-light">
        <span>
          {isQuerying
            ? 'Querying Data...'
            : count !== undefined
              ? `Showing ${length} of ${count} records`
              : `Showing ${length} records`}{' '}
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
  )
}
