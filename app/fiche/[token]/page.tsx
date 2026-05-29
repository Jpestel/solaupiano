import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { PrintButton } from './PrintButton'

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs font-medium text-gray-400 w-40 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="mb-8 print:mb-6 print:break-inside-avoid">
      <h2 className="flex items-center gap-2 text-base font-bold text-indigo-800 mb-3 pb-2 border-b-2 border-indigo-100">
        <span>{icon}</span> {title}
      </h2>
      {children}
    </div>
  )
}

export default async function PublicFichePage({ params }: { params: { token: string } }) {
  const rider = await prisma.techRider.findUnique({
    where: { shareToken: params.token },
    include: { group: { select: { name: true } } },
  })

  if (!rider) notFound()

  const c = rider.content as any
  const s = c.stage ?? {}
  const snd = c.sound ?? {}
  const lt = c.lights ?? {}
  const h = c.hospitality ?? {}
  const updatedAt = rider.updatedAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Header */}
      <div className="bg-indigo-700 print:bg-indigo-700 text-white">
        <div className="max-w-3xl mx-auto px-6 py-8 print:py-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">🎹</div>
            <span className="text-sm font-medium text-indigo-200">Sol au piano</span>
          </div>
          <h1 className="text-2xl font-extrabold">{rider.group.name}</h1>
          <p className="text-indigo-200 text-sm mt-1 font-semibold uppercase tracking-widest">Fiche technique</p>
          {c.genre && <p className="text-indigo-300 text-sm mt-1">{c.genre}</p>}
          <p className="text-indigo-300 text-xs mt-3">Mise à jour le {updatedAt}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 print:py-4">
        {/* Contact */}
        {(c.contactName || c.contactPhone || c.contactEmail) && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-8 print:mb-5 print:shadow-none print:border-gray-300">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contact</p>
            {c.contactName && <p className="font-semibold text-gray-900">{c.contactName}</p>}
            {c.contactPhone && <p className="text-sm text-gray-600 mt-0.5">📞 {c.contactPhone}</p>}
            {c.contactEmail && <p className="text-sm text-gray-600 mt-0.5">✉️ {c.contactEmail}</p>}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 print:shadow-none print:border-gray-300">
          {/* Scène */}
          {(s.minWidth || s.setupDuration || (s.members ?? []).length > 0 || s.notes) && (
            <Section title="Scène & Backline" icon="🎸">
              <div className="space-y-0">
                <Row label="Dimensions min." value={s.minWidth ? `${s.minWidth} m × ${s.minDepth || '?'} m` : null} />
                <Row label="Montage" value={s.setupDuration ? `${s.setupDuration} min` : null} />
                <Row label="Soundcheck" value={s.soundcheckDuration ? `${s.soundcheckDuration} min` : null} />
                <Row label="Alimentation" value={s.powerNeeds} />
                <Row label="Notes" value={s.notes} />
              </div>
              {(s.members ?? []).length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  {(() => {
                    const hasGuso = s.members.some((m: any) => m.gusoNumber)
                    return (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                            <th className="text-left px-3 py-2 rounded-l-lg">Musicien</th>
                            <th className="text-left px-3 py-2">Instrument</th>
                            <th className="text-left px-3 py-2">Position</th>
                            <th className="text-left px-3 py-2">Backline / Besoins</th>
                            {hasGuso && <th className="text-left px-3 py-2 rounded-r-lg">N° GUSO</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {s.members.map((m: any, i: number) => (
                            <tr key={i} className="border-b border-gray-100 last:border-0">
                              <td className="px-3 py-2.5 font-medium text-gray-900">{m.name}</td>
                              <td className="px-3 py-2.5 text-gray-600">{m.instrument}</td>
                              <td className="px-3 py-2.5 text-gray-500">{m.position}</td>
                              <td className="px-3 py-2.5 text-gray-600">{m.backline}</td>
                              {hasGuso && <td className="px-3 py-2.5 text-gray-500 font-mono text-xs">{m.gusoNumber || '—'}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  })()}
                </div>
              )}
            </Section>
          )}

          {/* Son */}
          {(snd.totalChannels || (snd.channels ?? []).length > 0 || snd.notes) && (
            <Section title="Son & Retours" icon="🔊">
              <div className="space-y-0 mb-4">
                <Row label="Canaux total" value={snd.totalChannels ? String(snd.totalChannels) : null} />
                <Row label="Retours scène" value={snd.monitorsCount ? String(snd.monitorsCount) : null} />
                <Row label="Mix in-ear" value={snd.inEar ? 'Oui' : null} />
                <Row label="DI box" value={snd.diCount ? String(snd.diCount) : null} />
                <Row label="Subwoofer" value={snd.subwoofer ? 'Oui' : null} />
                <Row label="Notes" value={snd.notes} />
              </div>
              {(snd.channels ?? []).length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                        <th className="text-left px-3 py-2 rounded-l-lg w-10">Ch.</th>
                        <th className="text-left px-3 py-2">Source</th>
                        <th className="text-left px-3 py-2">Type</th>
                        <th className="text-left px-3 py-2 rounded-r-lg">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snd.channels.map((ch: any, i: number) => (
                        <tr key={i} className="border-b border-gray-100 last:border-0">
                          <td className="px-3 py-2.5 font-bold text-indigo-600 text-center">{i + 1}</td>
                          <td className="px-3 py-2.5 font-medium text-gray-900">{ch.source}</td>
                          <td className="px-3 py-2.5 text-gray-500 text-xs">{ch.type}</td>
                          <td className="px-3 py-2.5 text-gray-600">{ch.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          )}

          {/* Lumières */}
          {(lt.hasFrontLight || lt.hasBackLight || lt.hasFog || lt.hasStrobe || lt.customRequests || lt.notes) && (
            <Section title="Lumières" icon="💡">
              <div className="flex flex-wrap gap-2 mb-3">
                {lt.hasFrontLight && <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 border border-yellow-200 px-3 py-1 text-xs font-medium text-yellow-700">✓ Éclairage façade</span>}
                {lt.hasBackLight && <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 border border-yellow-200 px-3 py-1 text-xs font-medium text-yellow-700">✓ Contre-jour</span>}
                {lt.hasFog && <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700">✓ Machine à fumée</span>}
                {lt.hasStrobe && <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700">✓ Stroboscope</span>}
              </div>
              {lt.customRequests && <p className="text-sm text-gray-700 mb-2">{lt.customRequests}</p>}
              {lt.notes && <p className="text-sm text-gray-500 italic">{lt.notes}</p>}
            </Section>
          )}

          {/* Hospitalité */}
          {(h.totalPersons || h.meals || h.drinks || h.accommodation || h.parkingSpots || h.notes) && (
            <Section title="Loges & Hospitalité" icon="🍺">
              <div className="space-y-0">
                <Row label="Personnes" value={h.totalPersons ? String(h.totalPersons) : null} />
                <Row label="Repas" value={h.meals ? `Oui${h.mealsDetails ? ' — ' + h.mealsDetails : ''}` : null} />
                <Row label="Rider boissons" value={h.drinks} />
                <Row label="Hébergement" value={h.accommodation ? `Oui${h.accommodationRooms ? ' — ' + h.accommodationRooms + ' chambre(s)' : ''}` : null} />
                <Row label="Parking" value={h.parkingSpots} />
                <Row label="Notes" value={h.notes} />
              </div>
            </Section>
          )}

          {/* Notes générales */}
          {c.generalNotes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-2">
              <p className="text-xs font-semibold text-amber-700 mb-1">Notes générales</p>
              <p className="text-sm text-amber-900 whitespace-pre-wrap">{c.generalNotes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 print:mt-4 text-xs text-gray-400">
          <p>Fiche technique générée avec <a href="https://solaupiano.fr" className="text-indigo-500 hover:underline">solaupiano.fr</a></p>
        </div>
      </div>

      <PrintButton />

      <style>{`
        @media print {
          body { background: white; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  )
}
