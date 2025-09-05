import Elysia from 'elysia'

import { ElectionRepository, ElectionRepositoryPlugin } from './repostiory'

export class ElectionService {
  constructor(private readonly electionRepository: ElectionRepository) {}
}

export const ElectionServicePlugin = new Elysia()
  .use(ElectionRepositoryPlugin)
  .decorate(({ electionRepository }) => ({
    electionService: new ElectionService(electionRepository),
  }))
