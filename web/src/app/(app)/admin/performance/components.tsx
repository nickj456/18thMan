'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'

export function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
      <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mt-2">{label}</p>
    </div>
  )
}

export function TileSkeleton() {
  return <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 h-[92px] animate-pulse" />
}

export function ChartSkeleton() {
  return <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 h-[280px] animate-pulse" />
}

export function ErrorNote({ label, message }: { label: string; message: string }) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
      <p className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm text-red-400/80">{message}</p>
    </div>
  )
}

type Point = { date: string; value: number }

export function TimeSeriesChart({ data, label }: { data: Point[]; label: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">{label}</p>
      {data.length === 0 ? (
        <p className="text-sm text-zinc-600">No data yet for this period.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#52525b' }} />
            <YAxis tick={{ fontSize: 9, fill: '#52525b' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: '#111113',
                border: '1px solid #27272a',
                borderRadius: '8px',
                fontSize: '11px',
              }}
              labelStyle={{ color: '#a1a1aa' }}
            />
            <Line type="monotone" dataKey="value" stroke="#e8560a" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
