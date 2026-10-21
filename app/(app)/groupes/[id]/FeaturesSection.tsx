import { GROUP_FEATURES, type FeatureFlags } from '@/lib/features'
import { formatBytes } from '@/lib/plans'

/**
 * Stockage et fonctionnalités d'un groupe. Remplace l'ancienne section « Plan » :
 * Sol au piano est gratuit, on ne montre donc ni plan, ni prix, ni abonnement —
 * seulement ce que le groupe peut faire.
 */
export function FeaturesSection({
  storageUsedBytes,
  storageLimitGb,
  storageGroupCount,
  storageHasOverride,
  features,
}: {
  storageUsedBytes: number
  storageLimitGb: number
  storageGroupCount: number
  storageHasOverride: boolean
  features: FeatureFlags
}) {
  const limitBytes = storageLimitGb * 1024 * 1024 * 1024
  const pct = limitBytes > 0 ? Math.min(100, (Number(storageUsedBytes) / limitBytes) * 100) : 0
  const actives = GROUP_FEATURES.filter((f) => features[f.flag])
  const inactives = GROUP_FEATURES.filter((f) => !features[f.flag])

  return (
    <div className="mb-4 space-y-3">
      {/* Stockage */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">Stockage</span>
            {storageHasOverride ? (
              <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                🛡️ Quota individuel
              </span>
            ) : storageGroupCount > 1 ? (
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                Partagé entre {storageGroupCount} groupes
              </span>
            ) : null}
          </div>
          <span className="text-sm text-gray-500">
            {formatBytes(Number(storageUsedBytes))} / {formatBytes(limitBytes)}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all ${
              pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-400' : 'bg-indigo-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {pct > 90 && (
          <p className="mt-2 text-xs font-medium text-red-600">
            ⚠️ Espace presque plein — libérez de la place, ou écrivez à l&apos;éditeur pour l&apos;augmenter.
          </p>
        )}
        {!storageHasOverride && storageGroupCount > 1 && (
          <p className="mt-2 text-[11px] text-gray-400">
            Cet espace est partagé entre tous vos groupes. {formatBytes(Number(storageUsedBytes))} utilisés au total.
          </p>
        )}
      </div>

      {/* Fonctionnalités */}
      <details className="group rounded-xl border border-gray-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5">
          <span className="text-sm font-semibold text-gray-700">
            Fonctionnalités du groupe
            <span className="ml-2 text-xs font-normal text-gray-400">
              {actives.length} active{actives.length > 1 ? 's' : ''} sur {GROUP_FEATURES.length}
            </span>
          </span>
          <span className="text-xs text-gray-400 transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="border-t border-gray-100 px-5 pb-4 pt-3">
          <ul className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {actives.map((f) => (
              <li key={f.key} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="text-base leading-none">{f.icon}</span>
                <span className="flex-1">{f.label}</span>
                <span className="text-xs font-semibold text-emerald-600">✓</span>
              </li>
            ))}
            {inactives.map((f) => (
              <li key={f.key} className="flex items-center gap-2 text-sm text-gray-400">
                <span className="text-base leading-none opacity-50">{f.icon}</span>
                <span className="flex-1">{f.label}</span>
                <span className="text-[11px]">non activée</span>
              </li>
            ))}
          </ul>
          {inactives.length > 0 && (
            <p className="mt-3 text-xs text-gray-400">
              Une fonctionnalité « non activée » peut l&apos;être pour votre groupe : écrivez à l&apos;éditeur.
            </p>
          )}
        </div>
      </details>
    </div>
  )
}
