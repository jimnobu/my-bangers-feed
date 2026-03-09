import { AtpAgent } from '@atproto/api'

export const rkey = process.env.MY_BANGERS_RKEY || 'my-bangers'
export const displayName = 'My Bangers'
export const description =
  'Your reposts, ranked by popularity (reposts + likes).'

type FeedItem = {
  uri: string
  cid: string
}

export async function handler (opts: {
  agent: AtpAgent
  did: string      // viewer DID as a plain string
  limit: number
  cursor?: string
}): Promise<{ cursor?: string; feed: FeedItem[] }> {
  const { agent, did, limit, cursor } = opts

  // 1) Fetch the viewer's own feed including reposts
  const res = await agent.app.bsky.feed.getAuthorFeed({
    actor: did,
    cursor,
    limit: 100,
    filter: 'posts_with_replies',
  })

  // 2) Keep only items that are reposts
  const repostItems = res.data.feed.filter(
    (item) =>
      item.reason &&
      item.reason.$type === 'app.bsky.feed.defs#reasonRepost'
  )

  if (repostItems.length === 0) {
    return { feed: [], cursor: undefined }
  }

  // 3) Get URIs of the original posts
  const uris = repostItems.map((item) => item.post.uri)

  // 4) Fetch those posts and score them by engagement
  const postsRes = await agent.app.bsky.feed.getPosts({ uris })

  const scored = postsRes.data.posts.map((post) => {
    const reposts = post.repostCount ?? 0
    const likes = post.likeCount ?? 0
    const score = reposts * 3 + likes
    return { post, score }
  })

  // 5) Sort by score descending and take top N
  scored.sort((a, b) => b.score - a.score)
  const selected = scored.slice(0, limit)

  // 6) Return in skeleton format
  const feed: FeedItem[] = selected.map(({ post }) => ({
    uri: post.uri,
    cid: post.cid,
  }))

  return { feed, cursor: undefined }
}
