/** Returns the `data` chunk of a RIFF/WAVE file; `say` may write extra chunks before it. */
export function readWavePcmData(file: Buffer): Buffer {
  if (
    file.length < 12 ||
    file.toString('ascii', 0, 4) !== 'RIFF' ||
    file.toString('ascii', 8, 12) !== 'WAVE'
  ) {
    throw new Error('Speech output is not a WAVE file')
  }
  let offset = 12
  while (offset + 8 <= file.length) {
    const id = file.toString('ascii', offset, offset + 4)
    const size = file.readUInt32LE(offset + 4)
    const start = offset + 8
    if (id === 'data') {
      return file.subarray(start, Math.min(start + size, file.length))
    }
    // RIFF chunks are padded to an even length.
    offset = start + size + (size % 2)
  }
  throw new Error('Speech output has no audio data')
}
