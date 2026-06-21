import Link from 'next/link'

const SOLAUPIANO_UMAMI_URL =
  process.env.NEXT_PUBLIC_UMAMI_STATS_URL ||
  'https://stats.toxic-files.com/websites/9ed85026-2476-419e-a514-972d31a95f06'

export default function AdminStatsFullPage() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gray-950">
      <header className="flex flex-col gap-3 border-b border-white/10 bg-gray-950 px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300">Stats Umami</p>
          <h1 className="text-lg font-bold">Sol au piano</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/stats"
            className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
          >
            Retour aux stats
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
          >
            Admin Sol au piano
          </Link>
        </div>
      </header>

      <iframe
        src={SOLAUPIANO_UMAMI_URL}
        title="Statistiques Umami Sol au piano en plein écran"
        className="min-h-0 flex-1 border-0 bg-white"
      />
    </div>
  )
}
