import { HeartCrack, HeartHandshake, MessageCircle } from 'lucide-react'

export interface EngagementsProps {
  likes: number
  dislikes: number
  comments: number
}

export const Engagements = ({ likes, dislikes, comments }: EngagementsProps) => {
  return (
    <dl className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        <dt>
          <span className="sr-only">เห็นด้วย</span>
          <HeartHandshake className="size-4" />
        </dt>
        <dd>
          {likes.toLocaleString('th', {
            notation: 'compact',
            compactDisplay: 'short',
          })}
        </dd>
      </div>
      <div className="flex items-center gap-1">
        <dt>
          <span className="sr-only">ไม่เห็นด้วย</span>
          <HeartCrack className="size-4" />
        </dt>
        <dd>
          {dislikes.toLocaleString('th', {
            notation: 'compact',
            compactDisplay: 'short',
          })}
        </dd>
      </div>
      <div className="flex items-center gap-1">
        <dt>
          <span className="sr-only">คอมเมนต์</span>
          <MessageCircle className="size-4" />
        </dt>
        <dd>
          {comments.toLocaleString('th', {
            notation: 'compact',
            compactDisplay: 'short',
          })}
        </dd>
      </div>
    </dl>
  )
}
