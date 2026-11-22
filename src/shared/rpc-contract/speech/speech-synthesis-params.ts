export const SPEECH_SYNTHESIS_SAMPLE_RATES = [16_000, 24_000] as const

export type SpeechSynthesisSampleRate = (typeof SPEECH_SYNTHESIS_SAMPLE_RATES)[number]

export const SPEECH_SYNTHESIS_DEFAULT_SAMPLE_RATE: SpeechSynthesisSampleRate = 24_000

export type SpeechSynthesisErrorCode = 'tts_unavailable' | 'tts_failed' | 'tts_canceled'

// One sentence of sample text is enough to hear a voice; longer requests aren't previews.
export const SPEECH_VOICE_PREVIEW_MAX_TEXT_LENGTH = 300

export type SpeechVoicePreviewResult =
  | { status: 'ok'; sampleRate: SpeechSynthesisSampleRate; pcm: Uint8Array }
  | { status: 'failed'; code: SpeechSynthesisErrorCode }
