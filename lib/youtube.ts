/**
 * Liens YouTube horodatés : lire un instant, en fabriquer un, et construire les
 * deux formes de lien utiles.
 *
 * ⚠️ Différence importante entre les deux formes :
 *  - le lien « regarder » (youtube.com/watch, youtu.be) honore le DÉBUT (`t`)
 *    mais ignore la fin : YouTube ne sait pas arrêter une lecture sur une page
 *    de vidéo normale ;
 *  - le lien « lecteur intégré » (youtube.com/embed) honore le début ET la fin
 *    (`start` / `end`).
 * C'est pourquoi un extrait borné ne peut être garanti que dans un lecteur
 * intégré — celui de Sol au piano, par exemple.
 */

export type YoutubeTimes = { start: number | null; end: number | null }

/** Identifiant d'une vidéo, quelle que soit la forme du lien (watch, youtu.be, shorts, embed, live). */
export function youtubeVideoId(url: string): string | null {
  const raw = (url || '').trim()
  if (!raw) return null
  // Un identifiant collé seul (11 caractères) est accepté tel quel.
  if (/^[\w-]{11}$/.test(raw)) return raw
  try {
    const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
    const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '')
    if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null
    if (host !== 'youtube.com' && host !== 'music.youtube.com') return null
    for (const prefix of ['/shorts/', '/embed/', '/live/', '/v/']) {
      if (u.pathname.startsWith(prefix)) return u.pathname.slice(prefix.length).split('/')[0] || null
    }
    return u.searchParams.get('v')
  } catch {
    return null
  }
}

/**
 * Lit un instant écrit comme on le dit : « 223 », « 3:43 », « 3m43s »,
 * « 3mn43 », « 1h02m03s », « 1:02:03 ». Renvoie des secondes, ou null.
 */
export function parseTimeToSeconds(input: string): number | null {
  const raw = (input || '').trim().toLowerCase().replace(/\s+/g, '')
  if (!raw) return null

  if (/^\d+$/.test(raw)) return Number(raw)

  if (raw.includes(':')) {
    const parts = raw.split(':')
    if (parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null
    const nums = parts.map(Number)
    while (nums.length < 3) nums.unshift(0)
    return nums[0] * 3600 + nums[1] * 60 + nums[2]
  }

  const m = raw.match(/^(?:(\d+)h)?(?:(\d+)(?:mn|min|m))?(\d+)?s?$/)
  if (!m) return null
  const [, h, min, trailing] = m
  if (h === undefined && min === undefined && trailing === undefined) return null

  // « 1h30 » veut dire 1 h 30 min, pas 1 h 30 s : sans minutes explicites,
  // un nombre qui suit des heures se lit en minutes.
  const trailingIsMinutes = h !== undefined && min === undefined
  const hours = Number(h || 0)
  const minutes = Number(min || 0) + (trailingIsMinutes ? Number(trailing || 0) : 0)
  const seconds = trailingIsMinutes ? 0 : Number(trailing || 0)
  return hours * 3600 + minutes * 60 + seconds
}

/** 223 → « 3:43 » ; 3723 → « 1:02:03 ». */
export function formatSeconds(total: number): string {
  const t = Math.max(0, Math.floor(total))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** Début et fin déjà inscrits dans un lien (`t`, `start`, `end`). */
export function youtubeTimes(url: string): YoutubeTimes {
  try {
    const u = new URL((url || '').trim())
    const read = (key: string) => {
      const v = u.searchParams.get(key)
      return v ? parseTimeToSeconds(v) : null
    }
    // `t` accepte aussi la forme « 3m43s » et peut se trouver dans le fragment
    // (#t=1m30s), historiquement utilisé par YouTube.
    const fromHash = u.hash.startsWith('#t=') ? parseTimeToSeconds(u.hash.slice(3)) : null
    return { start: read('t') ?? read('start') ?? fromHash, end: read('end') }
  } catch {
    return { start: null, end: null }
  }
}

/** Lien à partager : s'ouvre sur YouTube au bon endroit (la fin y est ignorée). */
export function buildYoutubeWatchUrl(videoId: string, times: Partial<YoutubeTimes> = {}): string {
  const base = `https://www.youtube.com/watch?v=${videoId}`
  return times.start ? `${base}&t=${Math.round(times.start)}` : base
}

/** Lien du lecteur intégré : honore le début ET la fin. */
export function buildYoutubeEmbedUrl(
  videoId: string,
  times: Partial<YoutubeTimes> = {},
  options: { autoplay?: boolean } = {},
): string {
  const params = new URLSearchParams({ rel: '0' })
  if (options.autoplay) params.set('autoplay', '1')
  if (times.start) params.set('start', String(Math.round(times.start)))
  if (times.end) params.set('end', String(Math.round(times.end)))
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`
}
