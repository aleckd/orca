import { ipcMain } from 'electron'
import {
  SPEECH_SYNTHESIS_DEFAULT_SAMPLE_RATE,
  SPEECH_VOICE_PREVIEW_MAX_TEXT_LENGTH,
  type SpeechVoicePreviewResult
} from '../../shared/rpc-contract/speech/speech-synthesis-params'
import { getSpeechTtsService } from '../speech/speech-runtime-service'

async function previewVoice(text: unknown): Promise<SpeechVoicePreviewResult> {
  if (
    typeof text !== 'string' ||
    !text.trim() ||
    text.length > SPEECH_VOICE_PREVIEW_MAX_TEXT_LENGTH
  ) {
    return { status: 'failed', code: 'tts_failed' }
  }
  // One owner for every preview, so a second click replaces the first.
  const result = await getSpeechTtsService().synthesize(
    { text, sampleRate: SPEECH_SYNTHESIS_DEFAULT_SAMPLE_RATE },
    'desktop-voice-preview'
  )
  return result.status === 'ok'
    ? { status: 'ok', sampleRate: result.sampleRate, pcm: new Uint8Array(result.pcm) }
    : { status: 'failed', code: result.code }
}

export function registerSpeechVoicePreviewHandlers(): void {
  ipcMain.handle('speech:previewSpeechVoice', (_event, text: unknown) => previewVoice(text))
}
