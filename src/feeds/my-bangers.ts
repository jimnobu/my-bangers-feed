import { AtpAgent } from '@atproto/api'

export const rkey = process.env.MY_BANGERS_RKEY || 'my-bangers'
export const displayName = 'My Bangers'
export const description =
  'Your most popular posts, ranked by engagement.'

type FeedItem = {
  post: string
}

// In-memory cache: DID -> { items, fetchedAt }
const cache = new Map<string, {
  items: Array<{ uri: string; score: number }>
  fetchedAt: number
}>()

const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function handler (opts: {
  agent: AtpAgent
  did: string      // viewer DID
  limit: number
  cursor?: string
}): Promise<{ cursor?: string; feed: FeedItem[] }> {
  const { agent, did, limit } = opts

  // Check cache first
  const cached = cache.get(did)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    console.log(`Cache hit for ${did}: ${cached.items.length} posts`)
    const selected = cached.items.slice(0, limit)
    const feed: FeedItem[] = selected.map(({ uri }) => ({ post: uri }))
    return { feed, cursor: undefined }
  }

  // Fetch all of the viewer's posts by paginating until exhausted
  const allItems: Array<{ uri: string; score: number }> = []
  let fetchCursor: string | undefined
  let retries = 0

  while (true) {
    let res
    try {
      res = await agent.app.bsky.feed.getAuthorFeed({
        actor: did,
        cursor: fetchCursor,
        limit: 100,
        filter: 'posts_with_replies',
      })
    } catch (err) {
      // Retry once on network errors (cold start timeouts)
      if (retries < 2) {
        retries++
        console.log(`Retry ${retries} after fetch error, waiting 30s`)
        await sleep(30000)
        continue
      }
      console.error('Failed to fetch author feed after retries:', (err as Error).message)
      break
    }

    for (const item of res.data.feed) {
      // Skip reposts of other people's posts
      if (item.reason) continue

      const reposts = item.post.repostCount ?? 0
      const likes = item.post.likeCount ?? 0
      const score = reposts * 3 + likes

      // Only include posts with some engagement
      if (score > 0) {
        allItems.push({ uri: item.post.uri, score })
      }
    }

    fetchCursor = res.data.cursor
    if (!fetchCursor || res.data.feed.length === 0) break
  }

  console.log(`Fetched ${allItems.length} posts with engagement for ${did}`)

  // Sort by score descending
  allItems.sort((a, b) => b.score - a.score)

  // Cache the sorted results (only if we got data)
  if (allItems.length > 0) {
    cache.set(did, { items: allItems, fetchedAt: Date.now() })
    console.log(`Cached ${allItems.length} posts for ${did}`)
  }

  const selected = allItems.slice(0, limit)
  const feed: FeedItem[] = selected.map(({ uri }) => ({ post: uri }))
  return { feed, cursor: undefined }
}
