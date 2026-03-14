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

  // Pre-warm cache for publisher DID — retries every 2 min until it succeeds
  const publisherDid = maybeStr(process.env.FEEDGEN_PUBLISHER_DID) ?? 'did:example:alice'
  const warmup = async () => {
    const agent = new AtpAgent({ service: 'https://public.api.bsky.app' })
    while (true) {
      try {
        console.log('Background cache warmup attempt for:', publisherDid)
        const result = await myBangersHandler({ agent, did: publisherDid, limit: 30 })
        if (result.feed.length > 0) {
          console.log('Background cache warmup complete:', result.feed.length, 'posts cached')
          break
        }
        console.log('Warmup returned 0 posts, retrying in 2 min')
      } catch (err) {
        console.log('Warmup fetch error, retrying in 2 min:', (err as Error).message)
      }
      await new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000))
    }
  }
  setTimeout(warmup, 30 * 1000)
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
