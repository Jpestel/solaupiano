const SOLAUPIANO_UMAMI_URL =
  process.env.NEXT_PUBLIC_UMAMI_STATS_URL ||
  'https://stats.toxic-files.com/websites/9ed85026-2476-419e-a514-972d31a95f06'

export default function AdminStatsPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stats du site</h1>
          <p className="mt-1 text-sm text-gray-500">
            Suivi Umami de solaupiano.fr, directement depuis l&apos;administration.
          </p>
        </div>

        <a
          href={SOLAUPIANO_UMAMI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
        >
          Ouvrir en grand
        </a>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Si Umami demande une connexion ici : identifiant <strong>solaupiano</strong>, puis le mot de passe Umami que vous avez défini.
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <iframe
          src={SOLAUPIANO_UMAMI_URL}
          title="Statistiques Umami Sol au piano"
          className="h-[78vh] min-h-[720px] w-full"
        />
      </div>
    </div>
  )
}
