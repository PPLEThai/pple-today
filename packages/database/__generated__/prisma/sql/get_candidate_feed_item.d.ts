import * as $runtime from "../runtime/client"

/**
 * @param text
 */
export const get_candidate_feed_item: (text: string) => $runtime.TypedSql<get_candidate_feed_item.Parameters, get_candidate_feed_item.Result>

export namespace get_candidate_feed_item {
  export type Parameters = [text: string]
  export type Result = {
    feed_item_id: string | null
    score: number | null
  }
}
