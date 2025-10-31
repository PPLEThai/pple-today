import { Election } from '@pple-today/database/prisma'

import { ElectionInfo, ElectionStatus } from '../dtos'

export function getElectionStatus(election: Election, now: Date): ElectionStatus {
  if (!election.publishDate) {
    return 'DRAFT'
  } else if (now < election.openVoting) {
    return 'NOT_OPENED_VOTE'
  } else if (now < election.closeVoting) {
    return 'OPEN_VOTE'
  } else if (!election.startResult || now < election.startResult) {
    return 'CLOSED_VOTE'
  } else {
    return 'RESULT_ANNOUNCE'
  }
}

export function convertToElectionInfo(election: Election, now: Date): ElectionInfo {
  return {
    id: election.id,
    name: election.name,
    description: election.description,
    location: election.location,
    locationMapUrl: election.locationMapUrl,
    province: election.province,
    district: election.district,
    status: getElectionStatus(election, now),
    type: election.type,
    mode: election.mode,
    isCancelled: election.isCancelled,
    encryptionPublicKey: election.encryptionPublicKey,
    publishDate: election.publishDate,
    openRegister: election.openRegister,
    closeRegister: election.closeRegister,
    openVoting: election.openVoting,
    closeVoting: election.closeVoting,
    startResult: election.startResult,
    endResult: election.endResult,
    createdAt: election.createdAt,
    updatedAt: election.updatedAt,
  }
}
