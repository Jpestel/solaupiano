// Extraction de l'audio d'un fichier vidéo, 100 % dans le navigateur.
// Décodage via Web Audio (decodeAudioData) puis export WAV (natif) ou MP3 (lamejs).
// lamejs est chargé dynamiquement (au moment de l'encodage MP3) pour ne pas l'inclure
// au rendu serveur ni dans le bundle initial.

/** Décode la piste audio d'un fichier (vidéo ou audio) en AudioBuffer (PCM). */
export async function decodeAudioFromFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Ctx: typeof AudioContext = window.AudioContext || (window as any).webkitAudioContext
  const ctx = new Ctx()
  try {
    // slice(0) : certaines implémentations « détachent » le buffer d'origine
    return await ctx.decodeAudioData(arrayBuffer.slice(0))
  } finally {
    try { await ctx.close() } catch { /* ignore */ }
  }
}

function floatTo16(sample: number): number {
  const s = Math.max(-1, Math.min(1, sample))
  return s < 0 ? s * 0x8000 : s * 0x7fff
}

/** Convertit un AudioBuffer en WAV PCM 16 bits (Blob). */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numCh = Math.min(buffer.numberOfChannels, 2)
  const sampleRate = buffer.sampleRate
  const len = buffer.length
  const bytesPerSample = 2
  const blockAlign = numCh * bytesPerSample
  const dataSize = len * blockAlign
  const out = new ArrayBuffer(44 + dataSize)
  const view = new DataView(out)

  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)) }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, numCh, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, dataSize, true)

  const channels: Float32Array[] = []
  for (let c = 0; c < numCh; c++) channels.push(buffer.getChannelData(c))

  let offset = 44
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < numCh; c++) {
      view.setInt16(offset, floatTo16(channels[c][i]), true)
      offset += 2
    }
  }
  return new Blob([out], { type: 'audio/wav' })
}

/** Convertit un AudioBuffer en MP3 (Blob). onProgress: 0→1. Cède la main pour ne pas figer l'UI. */
export async function audioBufferToMp3(
  buffer: AudioBuffer,
  kbps = 192,
  onProgress?: (p: number) => void,
): Promise<Blob> {
  const numCh = Math.min(buffer.numberOfChannels, 2)
  const sampleRate = buffer.sampleRate
  const len = buffer.length

  const left = new Int16Array(len)
  const l = buffer.getChannelData(0)
  for (let i = 0; i < len; i++) left[i] = floatTo16(l[i])

  let right: Int16Array | null = null
  if (numCh === 2) {
    right = new Int16Array(len)
    const r = buffer.getChannelData(1)
    for (let i = 0; i < len; i++) right[i] = floatTo16(r[i])
  }

  const { Mp3Encoder } = await import('@breezystack/lamejs')
  const enc = new Mp3Encoder(numCh, sampleRate, kbps)
  const blockSize = 1152
  const chunks: Uint8Array[] = []

  for (let i = 0; i < len; i += blockSize) {
    const lChunk = left.subarray(i, i + blockSize)
    const buf = right
      ? enc.encodeBuffer(lChunk, right.subarray(i, i + blockSize))
      : enc.encodeBuffer(lChunk)
    if (buf.length > 0) chunks.push(new Uint8Array(buf))
    if (i % (blockSize * 200) === 0) {
      onProgress?.(i / len)
      await new Promise((r) => setTimeout(r, 0)) // laisse respirer l'UI
    }
  }
  const end = enc.flush()
  if (end.length > 0) chunks.push(new Uint8Array(end))
  onProgress?.(1)

  return new Blob(chunks as BlobPart[], { type: 'audio/mpeg' })
}

export function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '') || 'audio'
}
