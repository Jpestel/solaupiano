'use client'

export function MarkSoldButton({ id }: { id: number }) {
  return (
    <form action={`/api/annonces/${id}`} method="post" onSubmit={async (e) => {
      e.preventDefault()
      if (!confirm('Marquer cette annonce comme vendue / pourvue ?')) return
      await fetch(`/api/annonces/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'VENDUE' }) })
      window.location.reload()
    }}>
      <button type="submit" className="rounded-lg border border-gray-300 text-gray-700 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 transition-colors">
        ✓ Marquer vendu / pourvu
      </button>
    </form>
  )
}

export function DeleteButton({ id }: { id: number }) {
  return (
    <button
      onClick={async () => {
        if (!confirm('Supprimer définitivement cette annonce ?')) return
        await fetch(`/api/annonces/${id}`, { method: 'DELETE' })
        window.location.href = '/annonces'
      }}
      className="rounded-lg border border-red-200 text-red-600 px-3 py-1.5 text-sm font-medium hover:bg-red-50 transition-colors"
    >
      🗑 Supprimer
    </button>
  )
}
