import type { SpeechSynthesisSampleRate } from '../../../shared/rpc-contract/speech/speech-synthesis-params'

export type TtsSynthesisRequest = {
  text: string
  voiceId: string | undefined
  sampleRate: SpeechSynthesisSampleRate
  signal: AbortSignal
}

/** Mono little-endian PCM16 at the requested sample rate. */
export type TtsAudio = { pcm: Buffer; voiceId: string }

export type TtsProvider = {
  readonly id: string
  status(): Promise<'ready' | 'unsupported'>
  /** Rejects with an AbortError when aborted. */
  synthesize(request: TtsSynthesisRequest): Promise<TtsAudio>
}

export class TtsAbortError extends Error {
  constructor() {
    super('Speech synthesis was canceled')
    this.name = 'AbortError'
  }
}
