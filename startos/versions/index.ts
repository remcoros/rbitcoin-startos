import { VersionGraph } from '@start9labs/start-sdk'
import { current } from './current'
import { v_0_9_99_2 } from './v0.9.99_2'

export const versionGraph = VersionGraph.of({
  current,
  other: [v_0_9_99_2],
})
