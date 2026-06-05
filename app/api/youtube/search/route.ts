import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface YtResult { videoId: string; title: string; channel: string; thumbnail: string; url: string }

// Extrait le 1er objet JSON équilibré après un marqueur dans du HTML.
function extractJsonAfter(html: string, marker: string): string | null {
  const i = html.indexOf(marker)
  if (i === -1) return null
  const start = html.indexOf('{', i)
  if (start === -1) return null
  let depth = 0, inStr = false, esc = false
  for (let j = start; j < html.length; j++) {
    const ch = html[j]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
    } else if (ch === '"') inStr = true
    else if (ch === '{') depth++
    else if (ch === '}') { depth--; if (depth === 0) return html.slice(start, j + 1) }
  }
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function collectVideoRenderers(obj: any, out: any[]) {
  if (!obj || typeof obj !== 'object') return
  if (obj.videoRenderer) out.push(obj.videoRenderer)
  for (const k of Object.keys(obj)) collectVideoRenderers(obj[k], out)
}

async function searchViaApi(q: string, key: string): Promise<YtResult[]> {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=6&q=${encodeURIComponent(q)}&key=${key}`
  const r = await fetch(url)
  if (!r.ok) return []
  const d = await r.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (d.items || []).map((it: any) => ({
    videoId: it.id.videoId,
    title: it.snippet.title,
    channel: it.snippet.channelTitle,
    thumbnail: it.snippet.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${it.id.videoId}/mqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=${it.id.videoId}`,
  }))
}

async function searchViaScrape(q: string): Promise<YtResult[]> {
  const r = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&hl=fr`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      'Accept-Language': 'fr-FR,fr;q=0.9',
      Cookie: 'CONSENT=YES+1',
    },
  })
  if (!r.ok) return []
  const html = await r.text()
  const json = extractJsonAfter(html, 'ytInitialData')
  if (!json) return []
  let data: unknown
  try { data = JSON.parse(json) } catch { return [] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vids: any[] = []
  collectVideoRenderers(data, vids)
  const seen = new Set<string>()
  const out: YtResult[] = []
  for (const v of vids) {
    if (!v.videoId || seen.has(v.videoId)) continue
    seen.add(v.videoId)
    out.push({
      videoId: v.videoId,
      title: v.title?.runs?.[0]?.text || v.title?.simpleText || '',
      channel: v.ownerText?.runs?.[0]?.text || v.longBylineText?.runs?.[0]?.text || '',
      thumbnail: v.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${v.videoId}`,
    })
    if (out.length >= 6) break
  }
  return out
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const q = (req.nextUrl.searchParams.get('q') || '').trim()
  if (!q) return NextResponse.json({ results: [] })

  try {
    const key = process.env.YOUTUBE_API_KEY
    const results = key ? await searchViaApi(q, key) : await searchViaScrape(q)
    return NextResponse.json({ results })
  } catch (e) {
    console.error('youtube search', e)
    return NextResponse.json({ results: [] })
  }
}
