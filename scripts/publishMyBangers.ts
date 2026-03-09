import 'dotenv/config'
import { AtpAgent } from '@atproto/api'
import { rkey, displayName, description } from '../src/feeds/my-bangers'

async function main () {
  const agent = new AtpAgent({ service: 'https://bsky.social' })

  await agent.login({
    identifier: process.env.FEEDGEN_HANDLE!,
    password: process.env.FEEDGEN_PASSWORD!,
  })

  const did = process.env.FEEDGEN_PUBLISHER_DID!
  const now = new Date().toISOString()

  const record = {
    did,
    displayName,
    description,
    createdAt: now,
  }

  const res = await agent.com.atproto.repo.putRecord({
    repo: did,
    collection: 'app.bsky.feed.generator',
    rkey,
    record,
  })

  console.log('Published My Bangers feed record successfully')
  console.log(JSON.stringify(res, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

