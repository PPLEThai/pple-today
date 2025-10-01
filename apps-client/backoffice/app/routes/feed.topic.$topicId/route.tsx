import { Route } from '../feed.topic.$topicId/+types/route'

export default function HashtagEditPage({ params }: Route.LoaderArgs) {
  return <div>{params.topicId}</div>
}
