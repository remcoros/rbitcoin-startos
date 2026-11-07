import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'rbitcoin',
  title: 'rbitcoin',
  license: 'MIT',
  packageRepo: 'https://github.com/remcoros/rbitcoin-startos',
  upstreamRepo: 'https://github.com/rbitcoin-org/rbitcoin',
  marketingUrl: 'https://github.com/rbitcoin-org/rbitcoin',
  donationUrl: null,
  description: { short, long },
  volumes: ['main', 'startos'],
  images: {
    rbitcoin: {
      source: {
        dockerBuild: {},
      },
      arch: ['x86_64', 'aarch64'],
    },
  },
})
