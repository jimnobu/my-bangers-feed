import { AppContext } from '../config'
import {
  QueryParams,
  OutputSchema as AlgoOutput,
} from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { AtpAgent } from '@atproto/api'
import { AuthRequiredError } from '@atproto/xrpc-server'
import * as whatsAlf from './whats-alf'
import * as myBangers from '../feeds/my-bangers'

type AlgoHandler = (
  ctx: AppContext,
  params: QueryParams,
  requesterDid?: string,
) => Promise<AlgoOutput>

const algos: Record<string, AlgoHandler> = {
  [whatsAlf.shortname]: whatsAlf.handler,
  [myBangers.rkey]: async (_ctx, params, requesterDid) => {
    if (!requesterDid) {
      throw new AuthRequiredError()
    }
    const agent = new AtpAgent({ service: 'https://bsky.social' })
    return myBangers.handler({
      agent,
      did: requesterDid,
      limit: params.limit,
      cursor: params.cursor,
    })
  },
}

export default algos
