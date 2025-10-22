import { Button } from '@pple-today/web-ui/button'
import { cn } from '@pple-today/web-ui/utils'
import { Eye, EyeOff } from 'lucide-react'
import {
  UpdateFeedItemCommentPrivacyBody,
  UpdateFeedItemCommentPrivacyParams,
} from 'node_modules/@api/backoffice/src/modules/admin/feed/models'
import { getRelativeTime } from 'utils/date'

import { FeedItemComment } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

interface FeedDetailCommentsProps {
  feedItemComment: FeedItemComment
  invalidate?: () => void
}

export const FeedDetailComments = ({ feedItemComment, invalidate }: FeedDetailCommentsProps) => {
  const mutation = reactQueryClient.useMutation('patch', '/admin/feeds/comments/:id')

  const setCommentPrivacy = (
    body: UpdateFeedItemCommentPrivacyBody,
    params: UpdateFeedItemCommentPrivacyParams
  ) => {
    if (mutation.isPending) return

    mutation.mutateAsync(
      { pathParams: params, body },
      {
        onSuccess: () => {
          invalidate?.()
        },
      }
    )
  }

  return (
    <div className="flex items-start gap-2">
      <img
        className="size-8 shrink-0 rounded-full"
        src={feedItemComment.author.profileImage ?? '/images/placeholder.svg'}
        alt=""
        width={32}
        height={32}
        loading="lazy"
        decoding="async"
      />
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div
          className={cn(
            'flex items-start gap-1 py-2 px-3 bg-base-bg-white border border-base-outline-default rounded-2xl',
            feedItemComment.isPrivate && 'bg-base-bg-medium border-base-outline-medium'
          )}
        >
          <div className="flex-1 min-w-0 flex flex-col gap-1 text-base-text-high">
            <span className="text-xs font-semibold">{feedItemComment.author.name}</span>
            <p className="font-serif text-sm">{feedItemComment.content}</p>
          </div>
          {feedItemComment.isPrivate ? (
            <Button
              className="w-9 h-9"
              variant="secondary"
              size="icon"
              onClick={() => setCommentPrivacy({ isPrivate: false }, { id: feedItemComment.id })}
            >
              <span className="sr-only">แสดง</span>
              <Eye size={20} />
            </Button>
          ) : (
            <Button
              className="w-9 h-9"
              variant="secondary"
              size="icon"
              onClick={() => setCommentPrivacy({ isPrivate: true }, { id: feedItemComment.id })}
            >
              <span className="sr-only">ซ่อน</span>
              <EyeOff size={20} />
            </Button>
          )}
        </div>
        <span className="text-xs text-base-text-medium">
          {getRelativeTime(new Date(feedItemComment.createdAt))}
        </span>
      </div>
    </div>
  )
}
