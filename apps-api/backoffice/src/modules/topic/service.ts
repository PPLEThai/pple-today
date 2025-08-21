import Elysia from 'elysia'
import { TopicRepository, TopicRepostoryPlugin } from './repository'

export class TopicService {
  constructor(private readonly topicRepository: TopicRepository) {}
}

export const TopicServicePlugin = new Elysia({ name: 'TopicService' })
  .use(TopicRepostoryPlugin)
  .decorate(({ topicRepository }) => ({
    topicService: new TopicService(topicRepository),
  }))
