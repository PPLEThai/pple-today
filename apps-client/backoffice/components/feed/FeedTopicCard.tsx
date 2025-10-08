import { Badge } from '@pple-today/web-ui/badge'
import { Button } from '@pple-today/web-ui/button'
import { cn } from '@pple-today/web-ui/utils'

import { DetailedTopic } from '@api/backoffice/admin'

interface TopicCardProps {
  topic: DetailedTopic
  horizontal?: boolean
  className?: string
}

export function FeedTopicCard(props: TopicCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-2xl overflow-hidden bg-base-bg-dark',
        props.horizontal ? 'h-[243px] w-[350px]' : 'h-[334px] w-[240px]',
        props.className
      )}
    >
      {props.topic.bannerImage?.url && (
        <img
          className="absolute top-0 left-0 right-0 bottom-0"
          src={props.topic.bannerImage.url}
          alt=""
        />
      )}
      {!props.horizontal && (
        <div className="absolute top-0 left-0 right-0 h-[40px] bg-gradient-to-b from-black/45 to-black/0" />
      )}
      <div className="absolute left-0 right-0 bottom-0 h-[204px] bg-gradient-to-b from-black/0 to-black to-60%" />
      <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-base-text-invert font-bold line-clamp-2 text-xl tracking-tight">
            {props.topic.name}
          </h3>
          {props.topic.description && (
            <p className="text-base-text-invert text-xs font-heading-regular line-clamp-4">
              {props.topic.description}
            </p>
          )}
          {props.topic.hashtags.length > 0 && (
            <div className="flex flex-row gap-1 flex-wrap">
              <Badge variant="outline" className="border-base-primary-default pointer-events-none">
                <span className="text-base-text-invert">{props.topic.hashtags[0].name}</span>
              </Badge>
              {props.topic.hashtags.length > 1 && (
                <Badge
                  variant="outline"
                  className="border-base-primary-default pointer-events-none"
                >
                  <span className="text-base-text-invert">
                    + {props.topic.hashtags.length - 1} แฮชแท็ก
                  </span>
                </Badge>
              )}
            </div>
          )}
        </div>
        <Button>ติดตาม</Button>
      </div>
    </div>
  )
}
