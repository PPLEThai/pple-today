import * as $runtime from "../runtime/client"

/**
 * @param text
 */
export const get_candidate_topic: (text: string) => $runtime.TypedSql<get_candidate_topic.Parameters, get_candidate_topic.Result>

export namespace get_candidate_topic {
  export type Parameters = [text: string]
  export type Result = {
    id: string
    name: string
    description: string | null
    bannerImagePath: string | null
    hashTagId: string | null
    hashTagName: string | null
  }
}
