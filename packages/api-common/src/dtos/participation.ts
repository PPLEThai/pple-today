import { Static, t } from 'elysia'

import { ElectionStatus } from './election'

export const ParticipationType = {
  POLL: 'POLL',
  ELECTION: 'ELECTION',
} as const
export type ParticipationType = (typeof ParticipationType)[keyof typeof ParticipationType]

export const UserPollParticipation = t.Object({
  id: t.String({ description: 'The ID of the poll answer' }),
  feedItemId: t.String({ description: 'The ID of the feed item' }),
  type: t.Literal(ParticipationType.POLL),
  title: t.String({ description: 'The title of the poll' }),
  endAt: t.Date({ description: 'The End Date of the poll' }),
  submittedAt: t.Date({ description: 'The latest submission of the poll' }),
})
export type UserPollParticipation = Static<typeof UserPollParticipation>

export const UserElectionParticipation = t.Object({
  electionId: t.String({ description: 'The ID of the election' }),
  type: t.Literal(ParticipationType.ELECTION),
  name: t.String({ description: 'The name of the election' }),
  electionStatus: ElectionStatus,
  submittedAt: t.Date({ description: 'The latest submission of the election' }),
})
export type UserElectionParticipation = Static<typeof UserElectionParticipation>

export const UserRecentParticipation = t.Union([UserPollParticipation, UserElectionParticipation])
export type UserRecentParticipation = Static<typeof UserRecentParticipation>
