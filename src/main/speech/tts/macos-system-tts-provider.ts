import { runProcess } from '@orca/process-host'
import { randomUUID } from 'node:crypto'
import { readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  TtsAbortError,
  type TtsAudio,
  type TtsProvider,
  type TtsSynthesisRequest
} from './tts-provider'
import { readWavePcmData } from './wave-pcm-data'

const SAY_PATH = '/usr/bin/say'
// A preview sentence takes about a second; this only stops a hung `say`.
const SAY_TIMEOUT_MS = 30_000

async function runSay(args: string[], signal?: AbortSignal): Promise<string> {
  if (signal?.aborted) {
    throw new TtsAbortError()
  }
  const result = await runProcess({ program: SAY_PATH, args, signal, timeoutMs: SAY_TIMEOUT_MS })
  if (signal?.aborted) {
    throw new TtsAbortError()
  }
  if (result.code !== 0) {
    throw new Error(`say exited with code ${result.code}: ${result.stderr.trim()}`)
  }
  return result.stdout
}

export function createMacosSystemTtsProvider(): TtsProvider {
  return {
    id: 'macos-system',
    status: async () => (process.platform === 'darwin' ? 'ready' : 'unsupported'),
    synthesize: async (request: TtsSynthesisRequest): Promise<TtsAudio> => {
      const file = join(tmpdir(), `orca-tts-${randomUUID()}.wav`)
      const args = ['--file-format=WAVE', `--data-format=LEI16@${request.sampleRate}`, '-o', file]
      if (request.voiceId) {
        args.push('-v', request.voiceId)
      }
      // `--` keeps text that starts with a dash from being read as an option.
      args.push('--', request.text)
      try {
        await runSay(args, request.signal)
        const pcm = readWavePcmData(await readFile(file))
        return { pcm, voiceId: request.voiceId ?? 'default' }
      } finally {
        await rm(file, { force: true })
      }
    }
  }
}
