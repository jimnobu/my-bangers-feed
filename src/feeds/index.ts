import * as myBangers from './my-bangers'

export const feeds = {
  [myBangers.rkey]: myBangers,
}

export type Feed = (typeof feeds)[keyof typeof feeds]

