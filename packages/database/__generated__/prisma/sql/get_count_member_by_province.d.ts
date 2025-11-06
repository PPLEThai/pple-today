import * as $runtime from "../runtime/client"

/**
 * @param _text
 */
export const get_count_member_by_province: (_text: string[]) => $runtime.TypedSql<get_count_member_by_province.Parameters, get_count_member_by_province.Result>

export namespace get_count_member_by_province {
  export type Parameters = [_text: string[]]
  export type Result = {
    province: string | null
    count: bigint | null
  }
}
