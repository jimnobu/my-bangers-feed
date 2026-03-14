import { AtpAgent } from '@atproto/api'

export const rkey = process.env.MY_BANGERS_RKEY || 'my-bangers'
export const displayName = 'My Bangers'
export const description =
  'Your most popular posts, ranked by engagement.'

type FeedItem = {
  post: string
}

export async function handler (opts: {
  agent: AtpAgent
  did: string      // viewer DID
  limit: number
  cursor?: string
}): Promise<{ cursor?: string; feed: FeedItem[] }> {
  const { agent, did, limit } = opts

  // Fetch all of the viewer's posts by paginating until exhausted
  const allItems: Array<{ uri: string; score: number }> = []
  let fetchCursor: string | undefined

  while (true) {
    const res = await agent.app.bsky.feed.getAuthorFeed({
      actor: did,
      cursor: fetchCursor,
      limit: 100,
      filter: 'posts_no_replies',
    })

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

  // Sort by score descending and take top N
  allItems.sort((a, b) => b.score - a.score)
  const selected = allItems.slice(0, limit)

  const feed: FeedItem[] = selected.map(({ uri }) => ({ post: uri }))
  return { feed, cursor: undefined }
}
