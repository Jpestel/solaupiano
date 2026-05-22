'use client'

export function PrintButton() {
  return (
    <div className="fixed bottom-6 right-6 print:hidden">
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-colors"
      >
        🖨️ Imprimer / PDF
      </button>
    </div>
  )
}
