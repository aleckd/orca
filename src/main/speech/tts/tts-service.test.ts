import { describe, expect, it } from 'vitest'
import { TtsAbortError, type TtsProvider } from './tts-provider'
import { TtsService } from './tts-service'

describe('TtsService', () => {
  it("replaces an owner's running synthesis without touching other owners", async () => {
    const aborted: string[] = []
    const provider: TtsProvider = {
      id: 'fake',
      status: async () => 'ready',
      synthesize: ({ text, signal }) =>
        new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => {
            aborted.push(text)
            reject(new TtsAbortError())
          })
          if (text === 'second') {
            resolve({ pcm: Buffer.alloc(4), voiceId: 'v' })
          }
        })
    }
    const service = new TtsService([provider])
    const request = (text: string) => ({ text, sampleRate: 24_000 as const })
    const first = service.synthesize(request('first'), 'phone-a')
    const other = service.synthesize(request('other'), 'phone-b')
    const second = service.synthesize(request('second'), 'phone-a')

    expect(await first).toEqual({ status: 'failed', code: 'tts_canceled' })
    expect(await second).toMatchObject({ status: 'ok', sampleRate: 24_000 })
    expect(aborted).not.toContain('other')
    void other
  })
})
