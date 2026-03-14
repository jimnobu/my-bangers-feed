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
  [myBangers.rkey]: async (ctx, params, requesterDid) => {
    const did = requesterDid || ctx.cfg.publisherDid
    console.log('My Bangers requested by:', did, requesterDid ? '(authenticated)' : '(fallback to publisher)')
    try {
      const agent = new AtpAgent({ service: 'https://public.api.bsky.app' })
      const result = await myBangers.handler({
        agent,
        did,
        limit: params.limit,
        cursor: params.cursor,
      })
      console.log('My Bangers returning', result.feed.length, 'posts')
      return result
    } catch (err) {
      console.error('My Bangers error:', (err as Error).message)
      // Return empty feed instead of crashing with invalid status code
      return { feed: [] }
    }
  },
}

export default algos
