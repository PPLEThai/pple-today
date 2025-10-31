import { Static, t } from 'elysia'

import { ElectionStatus } from './election'

export const ParticipationType = {
  POLL: 'POLL',
  ELECTION: 'ELECTION',
} as const
export type ParticipationType = (typeof ParticipationType)[keyof typeof ParticipationType]

export const UserPollParticipation = t.Object({
  type: t.Literal(ParticipationType.POLL),
  id: t.String({ description: 'The ID of the feed item' }),
  title: t.String({ description: 'The title of the poll' }),
  endAt: t.Date({ description: 'The End Date of the poll' }),
  submittedAt: t.Date({ description: 'The latest submission of the poll' }),
})
export type UserPollParticipation = Static<typeof UserPollParticipation>

export const UserElectionParticipation = t.Object({
  type: t.Literal(ParticipationType.ELECTION),
  id: t.String({ description: 'The ID of the election item' }),
  name: t.String({ description: 'The name of the election' }),
  electionStatus: ElectionStatus,
  submittedAt: t.Date({ description: 'The latest submission of the election' }),
})
export type UserElectionParticipation = Static<typeof UserElectionParticipation>

export const UserRecentParticipation = t.Union([UserPollParticipation, UserElectionParticipation])
export type UserRecentParticipation = Static<typeof UserRecentParticipation>
