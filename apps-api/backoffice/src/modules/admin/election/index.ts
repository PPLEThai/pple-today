import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  AdminCancelElectionParams,
  AdminCancelElectionResponse,
  AdminCreateCandidateProfileUploadURLBody,
  AdminCreateCandidateProfileUploadURLResponse,
  AdminCreateElectionCandidateBody,
  AdminCreateElectionCandidateParams,
  AdminCreateElectionCandidateResponse,
  AdminDeleteElectionCandidateParams,
  AdminDeleteElectionCandidateResponse,
  AdminGetElectionParams,
  AdminGetElectionResponse,
  AdminListElectionCandidatesParams,
  AdminListElectionCandidatesResponse,
  AdminListElectionQuery,
  AdminListElectionResponse,
  AdminUpdateElectionCandidateParams,
} from './models'
import { AdminElectionServicePlugin } from './services'

import { AuthGuardPlugin } from '../../../plugins/auth-guard'

export const AdminElectionController = new Elysia({
  prefix: '/elections',
  tags: ['Admin Elections'],
})
  .use(AuthGuardPlugin)
  .use(AdminElectionServicePlugin)
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
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .get(
    '/:electionId/candidates',
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
      const result = await adminElectionService.createCandidateProfileUploadURL(body.contentType)
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
    '/:electionId/candidates',
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
          InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
          InternalErrorCode.FILE_ROLLBACK_FAILED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .put(
    '/:electionId/candidates/:candidateId',
    async ({ params, body, status, adminElectionService }) => {
      const result = await adminElectionService.updateElectionCandidate(params.candidateId, body)
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
        200: AdminCreateElectionCandidateResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.FORBIDDEN,
          InternalErrorCode.ELECTION_NOT_FOUND,
          InternalErrorCode.ELECTION_CANDIDATE_NOT_FOUND,
          InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
          InternalErrorCode.FILE_ROLLBACK_FAILED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .delete(
    '/:electionId/candidates/:candidateId',
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
          InternalErrorCode.ELECTION_CANDIDATE_NOT_FOUND,
          InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
          InternalErrorCode.FILE_ROLLBACK_FAILED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
