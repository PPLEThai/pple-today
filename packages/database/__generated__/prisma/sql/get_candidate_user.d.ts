import * as $runtime from "../runtime/client"

/**
 * @param text
 */
export const get_candidate_user: (text: string) => $runtime.TypedSql<get_candidate_user.Parameters, get_candidate_user.Result>

export namespace get_candidate_user {
  export type Parameters = [text: string]
  export type Result = {
    id: string
    name: string
    profileImagePath: string | null
    responsibleArea: string | null
  }
}
