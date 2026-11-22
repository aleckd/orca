import type {
  SpeechSynthesisErrorCode,
  SpeechSynthesisSampleRate
} from '../../../shared/rpc-contract/speech/speech-synthesis-params'
import type { TtsProvider } from './tts-provider'

export type TtsResult =
  | { status: 'ok'; pcm: Buffer; sampleRate: SpeechSynthesisSampleRate }
  | { status: 'failed'; code: SpeechSynthesisErrorCode; message?: string }

export class TtsService {
  // One synthesis per owner: a new request replaces the last instead of piling up speech processes.
  private readonly active = new Map<string, AbortController>()

  constructor(private readonly providers: readonly TtsProvider[]) {}

  async synthesize(
    request: { text: string; voiceId?: string; sampleRate: SpeechSynthesisSampleRate },
    owner: string
  ): Promise<TtsResult> {
    const controller = new AbortController()
    this.active.get(owner)?.abort()
    this.active.set(owner, controller)
    try {
      for (const provider of this.providers) {
        if ((await provider.status().catch(() => 'unsupported')) !== 'ready') {
          continue
        }
        // A newer request may have replaced this one while the status check ran.
        if (controller.signal.aborted) {
          return { status: 'failed', code: 'tts_canceled' }
        }
        const audio = await provider.synthesize({
          ...request,
          voiceId: request.voiceId,
          signal: controller.signal
        })
        return controller.signal.aborted
          ? { status: 'failed', code: 'tts_canceled' }
          : { status: 'ok', pcm: audio.pcm, sampleRate: request.sampleRate }
      }
      return { status: 'failed', code: 'tts_unavailable' }
    } catch (error) {
      return controller.signal.aborted
        ? { status: 'failed', code: 'tts_canceled' }
        : { status: 'failed', code: 'tts_failed', message: String(error) }
    } finally {
      if (this.active.get(owner) === controller) {
        this.active.delete(owner)
      }
    }
  }
}
