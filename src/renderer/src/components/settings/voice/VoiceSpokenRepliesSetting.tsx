import { useEffect, useRef, useState } from 'react'
import { Loader2, Play } from 'lucide-react'
import type { SpeechVoicePreviewResult } from '../../../../../shared/rpc-contract/speech/speech-synthesis-params'
import { useTranslate } from '@/i18n/use-translate'
import { isMacUserAgent } from '@/app-shell/platform/user-agent-platform'
import { Button } from '../../ui/button'
import { SettingsRow } from '../form-controls/SettingsFormControls'
import { SettingsGroup } from '../section-layout/SettingsGroup'
import { VOICE_SETTING_ANCHORS } from './voice-pane-search'

function playPcm16(result: Extract<SpeechVoicePreviewResult, { status: 'ok' }>): AudioContext {
  const context = new AudioContext()
  const view = new DataView(result.pcm.buffer, result.pcm.byteOffset, result.pcm.byteLength)
  const frames = Math.floor(result.pcm.byteLength / 2)
  const buffer = context.createBuffer(1, Math.max(frames, 1), result.sampleRate)
  const samples = buffer.getChannelData(0)
  for (let i = 0; i < frames; i++) {
    samples[i] = view.getInt16(i * 2, true) / 32_768
  }
  const source = context.createBufferSource()
  source.buffer = buffer
  source.connect(context.destination)
  source.onended = () => void context.close()
  source.start()
  return context
}

/** Hear the voice replies are read aloud in. Only macOS has a host voice today. */
export function VoiceSpokenRepliesSetting(): React.JSX.Element | null {
  const t = useTranslate()
  const [preview, setPreview] = useState<'idle' | 'running' | 'failed'>('idle')
  const playing = useRef<AudioContext | null>(null)
  const previewSpeechVoice = window.api.speech.previewSpeechVoice

  useEffect(() => () => void playing.current?.close(), [])

  if (!previewSpeechVoice || !isMacUserAgent()) {
    return null
  }

  const runPreview = async (): Promise<void> => {
    setPreview('running')
    void playing.current?.close()
    const result = await previewSpeechVoice(
      t(
        'components.settings.voice.spokenReplies.sample',
        'Your agent finished the build. Two tests need your review.'
      )
    ).catch((): SpeechVoicePreviewResult => ({ status: 'failed', code: 'tts_failed' }))
    if (result.status === 'ok') {
      playing.current = playPcm16(result)
      setPreview('idle')
    } else {
      setPreview(result.code === 'tts_canceled' ? 'idle' : 'failed')
    }
  }

  return (
    <SettingsGroup
      id={VOICE_SETTING_ANCHORS.spokenReplies}
      title={t('components.settings.voice.spokenReplies.title', 'Spoken replies')}
    >
      <SettingsRow
        label={t('components.settings.voice.spokenReplies.voice', 'Voice')}
        description={
          preview === 'failed'
            ? t(
                'components.settings.voice.spokenReplies.previewFailed',
                "Couldn't play the voice. Try again."
              )
            : t(
                'components.settings.voice.spokenReplies.description',
                'The voice Orca uses to read replies aloud.'
              )
        }
        control={
          <Button
            variant="outline"
            size="xs"
            disabled={preview === 'running'}
            onClick={() => void runPreview()}
          >
            {preview === 'running' ? (
              <Loader2 className="animate-spin motion-reduce:animate-none" />
            ) : (
              <Play />
            )}
            {t('components.settings.voice.spokenReplies.preview', 'Preview')}
          </Button>
        }
      />
    </SettingsGroup>
  )
}
