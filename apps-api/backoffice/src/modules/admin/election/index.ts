import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  AdminBulkCreateElectionEligibleVoterBody,
  AdminBulkCreateElectionEligibleVoterParams,
  AdminBulkCreateElectionEligibleVoterResponse,
  AdminCancelElectionParams,
  AdminCancelElectionResponse,
  AdminCountBallotsParams,
  AdminCountBallotsResponse,
  AdminCreateCandidateProfileUploadURLBody,
  AdminCreateCandidateProfileUploadURLResponse,
  AdminCreateElectionBody,
  AdminCreateElectionCandidateBody,
  AdminCreateElectionCandidateParams,
  AdminCreateElectionCandidateResponse,
  AdminCreateElectionEligibleVoterBody,
  AdminCreateElectionEligibleVoterParams,
  AdminCreateElectionEligibleVoterResponse,
  AdminCreateElectionResponse,
  AdminDeleteElectionCandidateParams,
  AdminDeleteElectionCandidateResponse,
  AdminDeleteElectionEligibleVoterBody,
  AdminDeleteElectionEligibleVoterParams,
  AdminDeleteElectionEligibleVoterResponse,
  AdminDeleteElectionParams,
  AdminDeleteElectionResponse,
  AdminGetElectionParams,
  AdminGetElectionResponse,
  AdminListElectionCandidatesParams,
  AdminListElectionCandidatesResponse,
  AdminListElectionEligibleVoterParams,
  AdminListElectionEligibleVoterResponse,
  AdminListElectionQuery,
  AdminListElectionResponse,
  AdminPublishElectionBody,
  AdminPublishElectionParams,
  AdminPublishElectionResponse,
  AdminUpdateElectionBody,
  AdminUpdateElectionCandidateParams,
  AdminUpdateElectionCandidateResponse,
  AdminUpdateElectionKeysBody,
  AdminUpdateElectionKeysParams,
  AdminUpdateElectionKeysResponse,
  AdminUpdateElectionResponse,
  AdminUploadOnlineResultBody,
  AdminUploadOnlineResultParams,
  AdminUploadOnlineResultResponse,
  AdminUploadOnsiteResultBody,
  AdminUploadOnsiteResultParams,
  AdminUploadOnsiteResultResponse,
} from './models'
import { AdminElectionServicePlugin } from './services'

import { AdminAuthGuardPlugin } from '../../../plugins/admin-auth-guard'

export const AdminElectionController = new Elysia({
  prefix: '/elections',
  tags: ['Admin Elections'],
})
  .use([AdminAuthGuardPlugin, AdminElectionServicePlugin])
  .post(
    '/',
    async ({ body, status, adminElectionService }) => {
      const result = await adminElectionService.createElection(body)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(201, result.value)
    },
    {
      detail: {
        summary: 'Create Election',
        description: 'Create Election',
      },
      requiredLocalUser: true,
      body: AdminCreateElectionBody,
      response: {
        201: AdminCreateElectionResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.FORBIDDEN,
          InternalErrorCode.BAD_REQUEST,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .get(
    '/',
    async ({ query, status, adminElectionService }) => {
      const elections = await adminElectionService.listElections(query)
      if (elections.isErr()) {
        return mapErrorCodeToResponse(elections.error, status)
      }
      return status(200, elections.value)
    },
    {
      detail: {
        summary: 'List Elections',
        description: 'List Elections',
      },
      requiredLocalUser: true,
      query: AdminListElectionQuery,
      response: {
        200: AdminListElectionResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.FORBIDDEN,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .get(
    '/:electionId',
    async ({ params, status, adminElectionService }) => {
      const result = await adminElectionService.getElection(params.electionId)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, result.value)
    },
    {
      detail: {
        summary: 'Get Election Detail',
        description: 'Get Election Detail',
      },
      requiredLocalUser: true,
      params: AdminGetElectionParams,
      response: {
        200: AdminGetElectionResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.FORBIDDEN,
          InternalErrorCode.ELECTION_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .put(
    '/:electionId',
    async ({ status, adminElectionService, params, body }) => {
      const result = await adminElectionService.updateElection(params.electionId, body)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, result.value)
    },
    {
      detail: {
        summary: 'Update Election',
        description: 'Update Election',
      },
      requiredLocalUser: true,
      params: AdminUpdateElectionKeysParams,
      body: AdminUpdateElectionBody,
      response: {
        200: AdminUpdateElectionResponse,
        ...createErrorSchema(
          InternalErrorCode.INTERNAL_SERVER_ERROR,
          InternalErrorCode.ELECTION_NOT_FOUND,
          InternalErrorCode.BAD_REQUEST,
          InternalErrorCode.ELECTION_ALREADY_PUBLISH,
          InternalErrorCode.ELECTION_IS_CANCELLED
        ),
      },
    }
  )
  .delete(
    '/:electionId',
    async ({ status, adminElectionService, params }) => {
      const result = await adminElectionService.deleteElection(params.electionId)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, {
        message: 'Delete election successfully',
      })
    },
    {
      detail: {
        summary: 'Delete Election',
        description: 'Delete Election',
      },
      params: AdminDeleteElectionParams,
      response: {
        200: AdminDeleteElectionResponse,
        ...createErrorSchema(
          InternalErrorCode.INTERNAL_SERVER_ERROR,
          InternalErrorCode.ELECTION_NOT_FOUND,
          InternalErrorCode.ELECTION_ALREADY_PUBLISH
        ),
      },
    }
  )
  .put(
    '/:electionId/cancel',
    async ({ params, status, adminElectionService }) => {
      const result = await adminElectionService.cancelElection(params.electionId)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, {
        message: 'Cancel Election Successfully',
      })
    },
    {
      detail: {
        summary: 'Cancel Election',
        description: 'Cancel Election',
      },
      requiredLocalUser: true,
      params: AdminCancelElectionParams,
      response: {
        200: AdminCancelElectionResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.FORBIDDEN,
          InternalErrorCode.ELECTION_NOT_FOUND,
          InternalErrorCode.FILE_MOVE_ERROR,
          InternalErrorCode.FILE_ROLLBACK_FAILED,
          InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .put(
    '/:electionId/publish',
    async ({ params, body, adminElectionService, status }) => {
      const result = await adminElectionService.publishElection(params.electionId, body.publishDate)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, {
        message: 'Publish Election Successfully',
      })
    },
    {
      detail: {
        summary: 'Publish Election',
        description: 'Publish Election',
      },
      requiredLocalUser: true,
      params: AdminPublishElectionParams,
      body: AdminPublishElectionBody,
      response: {
        200: AdminPublishElectionResponse,
        ...createErrorSchema(
          InternalErrorCode.INTERNAL_SERVER_ERROR,
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.FORBIDDEN,
          InternalErrorCode.ELECTION_NOT_FOUND,
          InternalErrorCode.ELECTION_ALREADY_PUBLISH,
          InternalErrorCode.ELECTION_IS_CANCELLED
        ),
      },
    }
  )
  .group('/:electionId/candidates', (app) =>
    app
      .get(
        '/',
        async ({ params, status, adminElectionService }) => {
          const result = await adminElectionService.listElectionCandidates(params.electionId)
          if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

          return status(200, result.value)
        },
        {
          detail: {
            summary: 'Get Election Candidates',
            description: 'Get Election Candidates',
          },
          requiredLocalUser: true,
          params: AdminListElectionCandidatesParams,
          response: {
            200: AdminListElectionCandidatesResponse,
            ...createErrorSchema(
              InternalErrorCode.UNAUTHORIZED,
              InternalErrorCode.FORBIDDEN,
              InternalErrorCode.INTERNAL_SERVER_ERROR
            ),
          },
        }
      )
      .post(
        '/upload-url',
        async ({ body, status, adminElectionService }) => {
          const result = await adminElectionService.createCandidateProfileUploadURL(
            body.contentType
          )
          if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

          return status(200, result.value)
        },
        {
          detail: {
            summary: 'Get Candidate Profile Upload URL',
            description: 'Fetch the signed URL to upload candidate profile',
          },
          requiredLocalUser: true,
          body: AdminCreateCandidateProfileUploadURLBody,
          response: {
            200: AdminCreateCandidateProfileUploadURLResponse,
            ...createErrorSchema(
              InternalErrorCode.UNAUTHORIZED,
              InternalErrorCode.FILE_UNSUPPORTED_MIME_TYPE,
              InternalErrorCode.FILE_CREATE_SIGNED_URL_ERROR,
              InternalErrorCode.INTERNAL_SERVER_ERROR
            ),
          },
        }
      )
      .post(
        '/',
        async ({ params, body, status, adminElectionService }) => {
          const result = await adminElectionService.createElectionCandidate(params.electionId, body)
          if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

          return status(201, result.value)
        },
        {
          detail: {
            summary: 'Create Election Candidate',
            description: 'Create Election Candidate',
          },
          requiredLocalUser: true,
          params: AdminCreateElectionCandidateParams,
          body: AdminCreateElectionCandidateBody,
          response: {
            201: AdminCreateElectionCandidateResponse,
            ...createErrorSchema(
              InternalErrorCode.UNAUTHORIZED,
              InternalErrorCode.FORBIDDEN,
              InternalErrorCode.ELECTION_NOT_FOUND,
              InternalErrorCode.ELECTION_ALREADY_PUBLISH,
              InternalErrorCode.ELECTION_DUPLICATE_CANDIDATE,
              InternalErrorCode.ELECTION_IN_VOTE_PERIOD,
              InternalErrorCode.ELECTION_IS_CANCELLED,
              InternalErrorCode.FILE_MOVE_ERROR,
              InternalErrorCode.FILE_ROLLBACK_FAILED,
              InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
              InternalErrorCode.INTERNAL_SERVER_ERROR
            ),
          },
        }
      )
      .put(
        '/:candidateId',
        async ({ params, body, status, adminElectionService }) => {
          const result = await adminElectionService.updateElectionCandidate(
            params.candidateId,
            body
          )
          if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

          return status(200, result.value)
        },
        {
          detail: {
            summary: 'Update Election Candidate',
            description: 'Update Election Candidate',
          },
          requiredLocalUser: true,
          params: AdminUpdateElectionCandidateParams,
          body: AdminCreateElectionCandidateBody,
          response: {
            200: AdminUpdateElectionCandidateResponse,
            ...createErrorSchema(
              InternalErrorCode.UNAUTHORIZED,
              InternalErrorCode.FORBIDDEN,
              InternalErrorCode.ELECTION_NOT_FOUND,
              InternalErrorCode.ELECTION_ALREADY_PUBLISH,
              InternalErrorCode.ELECTION_IS_CANCELLED,
              InternalErrorCode.ELECTION_IN_VOTE_PERIOD,
              InternalErrorCode.ELECTION_CANDIDATE_NOT_FOUND,
              InternalErrorCode.FILE_MOVE_ERROR,
              InternalErrorCode.FILE_ROLLBACK_FAILED,
              InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
              InternalErrorCode.INTERNAL_SERVER_ERROR
            ),
          },
        }
      )
      .delete(
        '/:candidateId',
        async ({ params, status, adminElectionService }) => {
          const result = await adminElectionService.deleteElectionCandidate(params.candidateId)
          if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

          return status(200, { message: 'Delete Election Candidate Successfully' })
        },
        {
          detail: {
            summary: 'Delete Election Candidate',
            description: 'Delete Election Candidate',
          },
          requiredLocalUser: true,
          params: AdminDeleteElectionCandidateParams,
          response: {
            200: AdminDeleteElectionCandidateResponse,
            ...createErrorSchema(
              InternalErrorCode.UNAUTHORIZED,
              InternalErrorCode.FORBIDDEN,
              InternalErrorCode.ELECTION_NOT_FOUND,
              InternalErrorCode.ELECTION_ALREADY_PUBLISH,
              InternalErrorCode.ELECTION_IS_CANCELLED,
              InternalErrorCode.ELECTION_CANDIDATE_NOT_FOUND,
              InternalErrorCode.ELECTION_IN_VOTE_PERIOD,
              InternalErrorCode.FILE_MOVE_ERROR,
              InternalErrorCode.FILE_ROLLBACK_FAILED,
              InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
              InternalErrorCode.INTERNAL_SERVER_ERROR
            ),
          },
        }
      )
  )
  .group('/:electionId/eligible-voters', (app) =>
    app
      .get(
        '/',
        async ({ params, adminElectionService, status }) => {
          const result = await adminElectionService.listElectionEligibleVoters(params.electionId)
          if (result.isErr()) {
            return mapErrorCodeToResponse(result.error, status)
          }

          return status(200, result.value)
        },
        {
          detail: {
            summary: 'List eligible voters',
            description: 'List eligible voters',
          },
          requiredLocalUser: true,
          params: AdminListElectionEligibleVoterParams,
          response: {
            200: AdminListElectionEligibleVoterResponse,
            ...createErrorSchema(
              InternalErrorCode.UNAUTHORIZED,
              InternalErrorCode.INTERNAL_SERVER_ERROR
            ),
          },
        }
      )
      .post(
        '/',
        async ({ params, body, status, adminElectionService }) => {
          const voters =
            body.identifier === 'USER_ID'
              ? {
                  identifier: body.identifier,
                  userIds: [body.userId],
                }
              : {
                  identifier: body.identifier,
                  phoneNumbers: [body.phoneNumber],
                }

          const result = await adminElectionService.bulkCreateElectionEligibleVoters(
            params.electionId,
            voters
          )
          if (result.isErr()) {
            return mapErrorCodeToResponse(result.error, status)
          }

          return status(201, {
            message: 'Create election eligible voter successful',
          })
        },
        {
          detail: {
            summary: 'Create election eligible voter',
            description: 'Create election eligible voter with userId or phoneNumber',
          },
          requiredLocalUser: true,
          params: AdminCreateElectionEligibleVoterParams,
          body: AdminCreateElectionEligibleVoterBody,
          response: {
            201: AdminCreateElectionEligibleVoterResponse,
            ...createErrorSchema(
              InternalErrorCode.UNAUTHORIZED,
              InternalErrorCode.ELECTION_NOT_FOUND,
              InternalErrorCode.ELECTION_IN_VOTE_PERIOD,
              InternalErrorCode.ELECTION_ALREADY_PUBLISH,
              InternalErrorCode.ELECTION_IS_CANCELLED,
              InternalErrorCode.USER_NOT_FOUND,
              InternalErrorCode.ELECTION_INVALID_ELIGIBLE_VOTER_IDENTIFIER,
              InternalErrorCode.INTERNAL_SERVER_ERROR
            ),
          },
        }
      )
      .post(
        '/bulk-create',
        async ({ params, body, status, adminElectionService }) => {
          const result = await adminElectionService.bulkCreateElectionEligibleVoters(
            params.electionId,
            body
          )
          if (result.isErr()) {
            return mapErrorCodeToResponse(result.error, status)
          }

          return status(201, {
            message: 'Bulk create election eligible voters successful',
          })
        },
        {
          detail: {
            summary: 'Bulk create election eligible voter',
            description: 'Bulk create election eligible voter with userIds or phoneNumbers',
          },
          requiredLocalUser: true,
          params: AdminBulkCreateElectionEligibleVoterParams,
          body: AdminBulkCreateElectionEligibleVoterBody,
          response: {
            201: AdminBulkCreateElectionEligibleVoterResponse,
            ...createErrorSchema(
              InternalErrorCode.UNAUTHORIZED,
              InternalErrorCode.ELECTION_NOT_FOUND,
              InternalErrorCode.USER_NOT_FOUND,
              InternalErrorCode.ELECTION_IS_CANCELLED,
              InternalErrorCode.ELECTION_INVALID_ELIGIBLE_VOTER_IDENTIFIER,
              InternalErrorCode.ELECTION_ALREADY_PUBLISH,
              InternalErrorCode.ELECTION_IN_VOTE_PERIOD,
              InternalErrorCode.INTERNAL_SERVER_ERROR
            ),
          },
        }
      )
      .put(
        '/bulk-delete',
        async ({ params, body, status, adminElectionService }) => {
          const result = await adminElectionService.deleteElectionEligibleVoters(
            params.electionId,
            body
          )
          if (result.isErr()) {
            return mapErrorCodeToResponse(result.error, status)
          }

          return status(200, {
            message: 'Delete Successful',
          })
        },
        {
          detail: {
            summary: 'Bulk Delete Eligible voters',
            description: 'Bulk Delete Eligible voters with userIds or phoneNumbers',
          },
          requiredLocalUser: true,
          params: AdminDeleteElectionEligibleVoterParams,
          body: AdminDeleteElectionEligibleVoterBody,
          response: {
            200: AdminDeleteElectionEligibleVoterResponse,
            ...createErrorSchema(
              InternalErrorCode.UNAUTHORIZED,
              InternalErrorCode.BAD_REQUEST,
              InternalErrorCode.ELECTION_NOT_FOUND,
              InternalErrorCode.ELECTION_IN_VOTE_PERIOD,
              InternalErrorCode.ELECTION_ALREADY_PUBLISH,
              InternalErrorCode.ELECTION_IS_CANCELLED,
              InternalErrorCode.ELECTION_INVALID_ELIGIBLE_VOTER_IDENTIFIER,
              InternalErrorCode.INTERNAL_SERVER_ERROR
            ),
          },
        }
      )
  )
  .group('/:electionId/result', (app) =>
    app
      .post(
        '/onsite',
        async ({ params, body, adminElectionService, status }) => {
          const result = await adminElectionService.uploadElectionOnsiteResult(
            params.electionId,
            body
          )
          if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

          return status(200, {
            message: 'Upload Onsite Election Result Successfully',
          })
        },
        {
          detail: {
            summary: 'Upload onsite election result',
            description: 'Upload onsite election result',
          },
          requiredLocalUser: true,
          params: AdminUploadOnsiteResultParams,
          body: AdminUploadOnsiteResultBody,
          response: {
            200: AdminUploadOnsiteResultResponse,
            ...createErrorSchema(
              InternalErrorCode.INTERNAL_SERVER_ERROR,
              InternalErrorCode.UNAUTHORIZED,
              InternalErrorCode.BAD_REQUEST,
              InternalErrorCode.ELECTION_NOT_FOUND,
              InternalErrorCode.ELECTION_CANDIDATE_NOT_FOUND,
              InternalErrorCode.ELECTION_IS_CANCELLED,
              InternalErrorCode.ELECTION_NOT_IN_CLOSED_VOTE_PERIOD,
              InternalErrorCode.ELECTION_VOTES_EXCEED_VOTERS,
              InternalErrorCode.ELECTION_INVALID_TYPE
            ),
          },
        }
      )
      .post(
        '/online',
        async ({ params, body, adminElectionService, status }) => {
          const result = await adminElectionService.uploadElectionOnlineResult(
            params.electionId,
            body.status,
            body.signature,
            body.result
          )
          if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

          return status(200, {
            message: 'Upload Online Election Result Successfully',
          })
        },
        {
          detail: {
            summary: 'Upload online election result',
            description: 'Upload online election result',
          },
          validateBallotCrypto: true,
          params: AdminUploadOnlineResultParams,
          body: AdminUploadOnlineResultBody,
          response: {
            200: AdminUploadOnlineResultResponse,
            ...createErrorSchema(
              InternalErrorCode.INTERNAL_SERVER_ERROR,
              InternalErrorCode.UNAUTHORIZED,
              InternalErrorCode.BAD_REQUEST,
              InternalErrorCode.ELECTION_NOT_FOUND,
              InternalErrorCode.ELECTION_CANDIDATE_NOT_FOUND,
              InternalErrorCode.ELECTION_IS_CANCELLED,
              InternalErrorCode.ELECTION_NOT_IN_CLOSED_VOTE_PERIOD,
              InternalErrorCode.ELECTION_VOTES_EXCEED_VOTERS,
              InternalErrorCode.ELECTION_INVALID_SIGNATURE,
              InternalErrorCode.ELECTION_INVALID_TYPE
            ),
          },
        }
      )
  )
  .group('/:electionId/keys', (app) =>
    app.put(
      '/',
      async ({ params, body, status, adminElectionService }) => {
        const result = await adminElectionService.updateElectionKeys(params.electionId, body)
        if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

        return status(200, {
          message: 'Update Election Keys Successfully',
        })
      },
      {
        detail: {
          summary: 'Update election keys',
          description: 'Update election keys',
        },
        validateBallotCrypto: true,
        params: AdminUpdateElectionKeysParams,
        body: AdminUpdateElectionKeysBody,
        response: {
          200: AdminUpdateElectionKeysResponse,
          ...createErrorSchema(
            InternalErrorCode.INTERNAL_SERVER_ERROR,
            InternalErrorCode.BAD_REQUEST,
            InternalErrorCode.UNAUTHORIZED,
            InternalErrorCode.ELECTION_NOT_FOUND,
            InternalErrorCode.ELECTION_KEY_NOT_IN_PENDING_CREATED_STATUS
          ),
        },
      }
    )
  )
  .group('/:electionId/ballots', (app) =>
    app.post(
      '/count',
      async ({ params, adminElectionService, status }) => {
        const result = await adminElectionService.countBallots(params.electionId)
        if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

        return status(200, {
          message: 'Start counting ballot',
        })
      },
      {
        detail: {
          summary: 'Count ballots',
          description: 'Schedule counting encrypted ballots for election job',
        },
        requiredLocalUser: true,
        params: AdminCountBallotsParams,
        response: {
          200: AdminCountBallotsResponse,
          ...createErrorSchema(
            InternalErrorCode.INTERNAL_SERVER_ERROR,
            InternalErrorCode.BAD_REQUEST,
            InternalErrorCode.ELECTION_NOT_FOUND,
            InternalErrorCode.ELECTION_IS_CANCELLED,
            InternalErrorCode.ELECTION_NOT_IN_CLOSED_VOTE_PERIOD,
            InternalErrorCode.ELECTION_INVALID_TYPE,
            InternalErrorCode.ELECTION_KEY_NOT_READY
          ),
        },
      }
    )
  )
