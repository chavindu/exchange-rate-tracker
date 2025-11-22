'use client'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import zoomPlugin from 'chartjs-plugin-zoom'
import { Line } from 'react-chartjs-2'
import { RateData } from '@/types'
import { useTheme } from 'next-themes'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
)

interface ExchangeChartProps {
  selected: string[]
  data: { [key: string]: RateData[] }
  days: number
  view: 'days' | 'monthly'
}

export function ExchangeChart({ selected, data, days, view }: ExchangeChartProps) {
  const { theme } = useTheme()

  const fmt = (n: number) => {
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

  const buildDatasets = () => {
    const labelsSet = new Set<string>()
    const series: any[] = []

    const selectedWithData = selected.filter((code) => {
      const arr = data[code] || []
      return arr.length > 0
    })

    selectedWithData.forEach((code) => {
      const arr = getRange(data[code] || [], days, view)
      arr.forEach((r) => labelsSet.add(r.date))
    })

    const labels = Array.from(labelsSet).sort()

    const colors = [
      { border: '#0b74ff', background: 'rgba(11,116,255,0.1)' },
      { border: '#10b981', background: 'rgba(16,185,129,0.1)' },
      { border: '#f59e0b', background: 'rgba(245,158,11,0.1)' },
      { border: '#ef4444', background: 'rgba(239,68,68,0.1)' },
      { border: '#8b5cf6', background: 'rgba(139,92,246,0.1)' },
      { border: '#ec4899', background: 'rgba(236,72,153,0.1)' },
      { border: '#06b6d4', background: 'rgba(6,182,212,0.1)' },
      { border: '#84cc16', background: 'rgba(132,204,22,0.1)' },
      { border: '#f97316', background: 'rgba(249,115,22,0.1)' },
      { border: '#6366f1', background: 'rgba(99,102,241,0.1)' },
      { border: '#14b8a6', background: 'rgba(20,184,166,0.1)' },
    ]

    selectedWithData.forEach((code, i) => {
      const arr = getRange(data[code] || [], days, view)
      const map = new Map(arr.map((x) => [x.date, parseNum(x.value)]))
      const chartData = labels.map((d) => (map.has(d) ? map.get(d) : null))

      series.push({
        label: code,
        data: chartData,
        borderColor: colors[i % colors.length].border,
        backgroundColor: colors[i % colors.length].background,
        fill: false,
        tension: 0.25,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: colors[i % colors.length].border,
        pointBorderColor: theme === 'dark' ? '#0f172a' : '#fff',
        pointBorderWidth: 2,
        spanGaps: true,
      })
    })

    return { labels, datasets: series }
  }

  const chartData = buildDatasets()
  const isDark = theme === 'dark'

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      zoom: {
        pan: {
          enabled: true,
          mode: 'x' as const,
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true,
          },
          mode: 'x' as const,
        },
      },
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: { size: 12, weight: 500 },
          color: isDark ? '#f1f5f9' : '#00134D',
        },
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
        titleColor: isDark ? '#f1f5f9' : '#00134D',
        bodyColor: isDark ? '#f1f5f9' : '#00134D',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function (context: any) {
            return context.dataset.label + ': ' + fmt(context.parsed.y)
          },
        },
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          drawBorder: false,
        },
        ticks: {
          font: { size: 11 },
          color: isDark ? '#94a3b8' : '#6b7280',
        },
      },
      y: {
        display: true,
        grid: {
          color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          drawBorder: false,
        },
        ticks: {
          font: { size: 11 },
          color: isDark ? '#94a3b8' : '#6b7280',
          callback: function (value: any) {
            return fmt(value)
          },
        },
      },
    },
  }

  if (chartData.labels.length === 0 || chartData.datasets.length === 0) {
    return (
      <div className="chartwrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="small" style={{ color: 'var(--muted)' }}>
          No data available. Select currencies to view charts.
        </div>
      </div>
    )
  }

  return (
    <div className="chartwrap">
      <Line data={chartData} options={options} />
    </div>
  )
}

