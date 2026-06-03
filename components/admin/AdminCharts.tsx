'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'

export interface ChartDatum { name: string; value: number }

const PALETTE = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6', '#ec4899', '#6366f1', '#84cc16', '#f97316', '#06b6d4', '#a855f7']

function HBars({ data, multicolor = false, accent = '#10b981' }: { data: ChartDatum[]; multicolor?: boolean; accent?: string }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-10">Aucune donnée.</p>
  }
  const height = Math.max(120, data.length * 30 + 16)
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart layout="vertical" data={data} margin={{ left: 6, right: 32, top: 4, bottom: 4 }}>
          <XAxis type="number" allowDecimals={false} hide />
          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: '#374151' }} interval={0} />
          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
            {data.map((_, i) => (
              <Cell key={i} fill={multicolor ? PALETTE[i % PALETTE.length] : accent} />
            ))}
            <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function AdminCharts({ styleData, instrumentData }: { styleData: ChartDatum[]; instrumentData: ChartDatum[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">🎼 Groupes par style</h2>
        </div>
        <div className="p-3">
          <HBars data={styleData} multicolor />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">🎻 Musiciens par instrument</h2>
        </div>
        <div className="p-3">
          <HBars data={instrumentData} accent="#6366f1" />
        </div>
      </div>
    </div>
  )
}
