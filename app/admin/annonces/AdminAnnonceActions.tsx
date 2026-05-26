'use client'

export function AdminAnnonceActions({ id, status }: { id: number; status: string }) {
  const patch = async (newStatus: string) => {
    await fetch(`/api/annonces/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    window.location.reload()
  }

  const del = async () => {
    if (!confirm('Supprimer définitivement cette annonce ?')) return
    await fetch(`/api/annonces/${id}`, { method: 'DELETE' })
    window.location.reload()
  }

  return (
    <div className="flex items-center gap-1 justify-end flex-wrap">
      {status === 'PENDING' && (
        <button
          onClick={() => patch('ACTIVE')}
          className="rounded px-2 py-1 text-xs font-semibold border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
        >
          ✓ Approuver
        </button>
      )}
      {status === 'ACTIVE' && (
        <button onClick={() => patch('MASQUEE')} className="rounded px-2 py-1 text-xs font-medium border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors">
          Masquer
        </button>
      )}
      {status === 'MASQUEE' && (
        <button onClick={() => patch('ACTIVE')} className="rounded px-2 py-1 text-xs font-medium border border-green-200 text-green-600 hover:bg-green-50 transition-colors">
          Réactiver
        </button>
      )}
      {status === 'PENDING' && (
        <button onClick={() => patch('MASQUEE')} className="rounded px-2 py-1 text-xs font-medium border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors">
          Refuser
        </button>
      )}
      <button onClick={del} className="rounded px-2 py-1 text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
        Supprimer
      </button>
    </div>
  )
}
