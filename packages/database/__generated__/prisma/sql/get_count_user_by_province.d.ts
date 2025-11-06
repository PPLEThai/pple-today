import * as $runtime from "../runtime/client"

/**
 */
export const get_count_user_by_province: () => $runtime.TypedSql<get_count_user_by_province.Parameters, get_count_user_by_province.Result>

export namespace get_count_user_by_province {
  export type Parameters = []
  export type Result = {
    province: string | null
    count: bigint | null
  }
}
