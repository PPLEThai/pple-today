import { describe, expect, test } from 'vitest'

import {
  activePersonLabel,
  activeRoleInfoFromUserInfo,
  type EligiblePerson,
  personRowCopy,
} from './active-role'

const person = (
  overrides: Partial<EligiblePerson> & Pick<EligiblePerson, 'id' | 'role'>
): EligiblePerson => ({
  roleLabel: overrides.role,
  supervisorFullName: null,
  supervisorRoleLabel: null,
  ...overrides,
})

describe('personRowCopy', () => {
  test('prefers the SSO role_label over the local map', () => {
    expect(
      personRowCopy(person({ id: 1, role: 'mp', roleLabel: 'สมาชิกสภาผู้แทนราษฎร' })).primary
    ).toBe('สมาชิกสภาผู้แทนราษฎร')
  })

  test('falls back to the local label when SSO does not send one', () => {
    expect(personRowCopy(person({ id: 1, role: 'mp', roleLabel: '' })).primary).toBe('สส.')
  })

  test('two delegates are distinguished by supervisor name · supervisor role', () => {
    expect(
      personRowCopy(
        person({
          id: 11,
          role: 'delegate',
          roleLabel: 'ปฎิบัติงานแทน',
          supervisorFullName: 'สมชาย ใจดี',
          supervisorRoleLabel: 'สส.',
        })
      )
    ).toEqual({ primary: 'ปฎิบัติงานแทน', secondary: 'สมชาย ใจดี · สส.' })
    expect(
      personRowCopy(
        person({
          id: 12,
          role: 'delegate',
          roleLabel: 'ปฎิบัติงานแทน',
          supervisorFullName: 'สมหญิง รักดี',
          supervisorRoleLabel: 'ทีมจังหวัด',
        })
      )
    ).toEqual({ primary: 'ปฎิบัติงานแทน', secondary: 'สมหญิง รักดี · ทีมจังหวัด' })
  })

  test('a delegate with only a supervisor name still shows that name', () => {
    expect(
      personRowCopy(
        person({
          id: 11,
          role: 'delegate',
          roleLabel: 'ปฎิบัติงานแทน',
          supervisorFullName: 'สมชาย ใจดี',
        })
      ).secondary
    ).toBe('สมชาย ใจดี')
  })

  test('a non-delegate row has no supervisor line, even if those fields arrive', () => {
    expect(
      personRowCopy(
        person({
          id: 1,
          role: 'mp',
          roleLabel: 'สส.',
          supervisorFullName: 'should not show',
          supervisorRoleLabel: 'สส.',
        })
      ).secondary
    ).toBeNull()
  })
})

describe('activePersonLabel', () => {
  test("the compact แอป-page trigger is the current person's role_label only", () => {
    expect(
      activePersonLabel({
        activePersonId: 12,
        activeRole: 'delegate',
        eligiblePersons: [
          person({
            id: 11,
            role: 'delegate',
            roleLabel: 'ปฎิบัติงานแทน',
            supervisorFullName: 'สมชาย ใจดี',
            supervisorRoleLabel: 'สส.',
          }),
          person({
            id: 12,
            role: 'delegate',
            roleLabel: 'ปฎิบัติงานแทน',
            supervisorFullName: 'สมหญิง รักดี',
            supervisorRoleLabel: 'ทีมจังหวัด',
          }),
        ],
      })
    ).toBe('ปฎิบัติงานแทน')
  })
})

describe('activeRoleInfoFromUserInfo', () => {
  test('reads eligiblePersons and the current person id, not eligibleRoles', () => {
    expect(
      activeRoleInfoFromUserInfo({
        ad: {
          actualPpleUser: { id: 12, role: 'delegate' },
          eligibleRoles: ['delegate'],
          eligiblePersons: [
            {
              id: 11,
              role: 'delegate',
              role_label: 'ปฎิบัติงานแทน',
              role_description: 'must never become copy',
              supervisor_full_name: 'สมชาย ใจดี',
              supervisor_role_label: 'สส.',
            },
            {
              id: 12,
              role: 'delegate',
              role_label: 'ปฎิบัติงานแทน',
              role_description: 'must never become copy',
              supervisor_full_name: 'สมหญิง รักดี',
              supervisor_role_label: 'ทีมจังหวัด',
            },
          ],
        },
      })
    ).toEqual({
      activePersonId: 12,
      activeRole: 'delegate',
      eligiblePersons: [
        {
          id: 11,
          role: 'delegate',
          roleLabel: 'ปฎิบัติงานแทน',
          supervisorFullName: 'สมชาย ใจดี',
          supervisorRoleLabel: 'สส.',
        },
        {
          id: 12,
          role: 'delegate',
          roleLabel: 'ปฎิบัติงานแทน',
          supervisorFullName: 'สมหญิง รักดี',
          supervisorRoleLabel: 'ทีมจังหวัด',
        },
      ],
    })
  })

  test('fills a missing role_label from the local map so a new SSO role still has a name', () => {
    expect(
      activeRoleInfoFromUserInfo({
        ad: {
          actualPpleUser: { id: 1, role: 'mp' },
          eligiblePersons: [{ id: 1, role: 'mp', role_label: null }],
        },
      }).eligiblePersons[0]?.roleLabel
    ).toBe('สส.')
  })

  test('an account with no AD block has no people to pick', () => {
    expect(activeRoleInfoFromUserInfo({})).toEqual({
      activePersonId: null,
      activeRole: null,
      eligiblePersons: [],
    })
  })
})
