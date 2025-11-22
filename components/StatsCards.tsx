'use client'

import { RateData, Stats } from '@/types'

interface StatsCardsProps {
  selected: string[]
  data: { [key: string]: RateData[] }
  days: number
  view: 'days' | 'monthly'
}

export function StatsCards({ selected, data, days, view }: StatsCardsProps) {
  const fmt = (n: number | null) => {
    if (n === null) return '—'
    return (Math.round(n * 1000) / 1000).toLocaleString('en-US')
  }

  const parseNum = (v: number | string) => {
    if (typeof v === 'string') return parseFloat(v.replace(/,/g, ''))
    return Number(v)
  }

  const getRange = (arr: RateData[], days: number, view: string): RateData[] => {
    if (!arr) return []
    if (view === 'monthly') {
      const map: { [key: string]: number[] } = {}
      arr.forEach((it) => {
        const m = it.date.slice(0, 7)
        if (!map[m]) map[m] = []
        map[m].push(parseNum(it.value))
      })
      const out = Object.keys(map)
        .sort()
        .map((k) => {
          const v = map[k]
          const avg = v.reduce((a, b) => a + b, 0) / v.length
          return { date: k + '-01', value: avg }
        })
      return out.slice(-days)
    } else {
      return arr.slice(-days)
    }
  }

  const computeStats = (arr: RateData[]): Stats | null => {
    if (!arr || arr.length === 0) return null
    const vals = arr.map((x) => parseNum(x.value))
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    return { min, max, avg }
  }

  const signArrow = (arr: RateData[]) => {
    if (!arr || arr.length < 2) return '→'
    const last = parseNum(arr[arr.length - 1].value)
    const prev = parseNum(arr[arr.length - 2].value)
    if (last > prev) return '↑'
    if (last < prev) return '↓'
    return '→'
  }

  const pct = (prev: number, last: number) => {
    if (prev === 0 || prev == null || last == null) return null
    return ((last - prev) / prev) * 100
  }

  return (
    <div className="stats">
      {selected.map((code) => {
        const arr = getRange(data[code] || [], days, view)
        const stats = computeStats(arr)
        const arrow = signArrow(arr)
        const last = arr.length ? parseNum(arr[arr.length - 1].value) : null
        const prev = arr.length > 1 ? parseNum(arr[arr.length - 2].value) : null
        const change = last != null && prev != null ? pct(prev, last) : null
        const changeColor =
          change != null ? (change > 0 ? 'var(--success)' : change < 0 ? 'var(--danger)' : 'var(--muted)') : 'var(--muted)'

        return (
          <div key={code} className="statcard">
            <div className="statleft">
              <div className="statlabel">
                {code} {arrow}
              </div>
              <div className="statvalue">{last != null ? fmt(last) : '—'}</div>
            </div>
            <div className="statright">
              <div className="statMetric">Min: {stats ? fmt(stats.min) : '—'}</div>
              <div className="statMetric">Max: {stats ? fmt(stats.max) : '—'}</div>
              <div className="statMetric">Avg: {stats ? fmt(stats.avg) : '—'}</div>
              <div className="statMetric" style={{ color: changeColor, fontWeight: 600 }}>
                Δ {change != null ? change.toFixed(2) + '%' : '—'}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

