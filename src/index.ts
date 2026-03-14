import dotenv from 'dotenv'
import { AtpAgent } from '@atproto/api'
import FeedGenerator from './server'
import { handler as myBangersHandler } from './feeds/my-bangers'

const run = async () => {
  dotenv.config()
  const hostname = maybeStr(process.env.FEEDGEN_HOSTNAME) ?? 'example.com'
  const serviceDid =
    maybeStr(process.env.FEEDGEN_SERVICE_DID) ?? `did:web:${hostname}`
  const server = FeedGenerator.create({
    port: maybeInt(process.env.FEEDGEN_PORT) ?? 3000,
    listenhost: maybeStr(process.env.FEEDGEN_LISTENHOST) ?? '0.0.0.0',
    sqliteLocation: maybeStr(process.env.FEEDGEN_SQLITE_LOCATION) ?? ':memory:',
    subscriptionEndpoint:
      maybeStr(process.env.FEEDGEN_SUBSCRIPTION_ENDPOINT) ??
      'wss://bsky.network',
    publisherDid:
      maybeStr(process.env.FEEDGEN_PUBLISHER_DID) ?? 'did:example:alice',
    subscriptionReconnectDelay:
      maybeInt(process.env.FEEDGEN_SUBSCRIPTION_RECONNECT_DELAY) ?? 3000,
    hostname,
    serviceDid,
  })
  await server.start()
  console.log(
    `🤖 running feed generator at http://${server.cfg.listenhost}:${server.cfg.port}`,
  )

  // Pre-warm cache for publisher DID 30s after startup (gives network time to stabilize)
  const publisherDid = maybeStr(process.env.FEEDGEN_PUBLISHER_DID) ?? 'did:example:alice'
  setTimeout(async () => {
    console.log('Background cache warmup starting for:', publisherDid)
    const agent = new AtpAgent({ service: 'https://public.api.bsky.app' })
    try {
      const result = await myBangersHandler({ agent, did: publisherDid, limit: 30 })
      console.log('Background cache warmup complete:', result.feed.length, 'posts cached')
    } catch (err) {
      console.log('Background cache warmup failed (non-fatal):', (err as Error).message)
    }
  }, 30 * 1000)
}

const maybeStr = (val?: string) => {
  if (!val) return undefined
  return val
}

const maybeInt = (val?: string) => {
  if (!val) return undefined
  const int = parseInt(val, 10)
  if (isNaN(int)) return undefined
  return int
}

run()
