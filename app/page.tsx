'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { CurrencyList } from '@/components/CurrencyList'
import { StatsCards } from '@/components/StatsCards'
import { ThemeToggle } from '@/components/ThemeToggle'
import { RateCalculator } from '@/components/RateCalculator'
import { RateData, RateType } from '@/types'

// Dynamically import Chart component to avoid SSR issues
const ExchangeChart = dynamic(() => import('@/components/ExchangeChart').then(mod => ({ default: mod.ExchangeChart })), {
  ssr: false,
  loading: () => (
    <div className="chartwrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="small" style={{ color: 'var(--muted)' }}>
        Loading chart...
      </div>
    </div>
  ),
})

const manifestPath = '/data/manifest.json'
const maxPoints = 365

const RANGE_PRESETS = [
  { value: '7d', label: '7 days', days: 7, view: 'days' as const },
  { value: '14d', label: '14 days', days: 14, view: 'days' as const },
  { value: '30d', label: '30 days', days: 30, view: 'days' as const },
  { value: '2m', label: '2 months', days: 60, view: 'days' as const },
  { value: '3m', label: '3 months', days: 90, view: 'days' as const },
  { value: '6m', label: '6 months', days: 180, view: 'days' as const },
  { value: '1y', label: '1 year', days: 365, view: 'days' as const },
] as const

export default function Home() {
  const [manifest, setManifest] = useState<string[]>([])
  const [dataCache, setDataCache] = useState<{ [key: string]: RateData[] }>({})
  const [selected, setSelected] = useState<string[]>([])
  const [rangePreset, setRangePreset] = useState<string>('14d')
  const preset = RANGE_PRESETS.find((p) => p.value === rangePreset) ?? RANGE_PRESETS[1]
  const days = preset.days
  const view = preset.view
  const [rateType, setRateType] = useState<RateType>('TTBUY')
  const [lastValues, setLastValues] = useState<{ [key: string]: number | null }>({})
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)

  const parseNum = (v: number | string) => {
    if (typeof v === 'string') return parseFloat(v.replace(/,/g, ''))
    return Number(v)
  }

  // Get the value for the selected rate type, with fallback to legacy 'value' field
  const getRateValue = (data: RateData, type: RateType): number | string | null => {
    if (data[type] != null) return data[type]!
    // Legacy support for old data format
    if (data.value != null) return data.value
    return null
  }

  const fmt = (n: number | null) => {
    if (n === null) return '—'
    return (Math.round(n * 1000) / 1000).toLocaleString('en-US')
  }

  const ensureData = async (codes: string[]) => {
    const promises = codes.map(async (code) => {
      if (!dataCache[code]) {
        try {
          const r = await fetch(`/data/${code.toLowerCase()}.json`)
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          const arr = await r.json()
          const dataArray = Array.isArray(arr) ? arr : []
          const processed = dataArray
            .filter((x: any) => x && x.date && (x.TTBUY != null || x.ODBUY != null || x.TTSEL != null || x.value != null))
            .map((x: any) => ({
              date: x.date,
              TTBUY: x.TTBUY != null ? parseNum(x.TTBUY) : undefined,
              ODBUY: x.ODBUY != null ? parseNum(x.ODBUY) : undefined,
              TTSEL: x.TTSEL != null ? parseNum(x.TTSEL) : undefined,
              // Legacy support
              value: x.value != null ? parseNum(x.value) : undefined
            }))
          return { code, data: processed }
        } catch (e) {
          console.warn(`Failed to load data for ${code}:`, e)
          return { code, data: [] }
        }
      }
      return null
    })

    const results = await Promise.all(promises)
    const updates: { [key: string]: RateData[] } = {}
    results.forEach((result) => {
      if (result) {
        updates[result.code] = result.data
      }
    })

    if (Object.keys(updates).length > 0) {
      setDataCache((prev) => ({ ...prev, ...updates }))
    }
  }

  const updateAllLastValues = (codes: string[]) => {
    const values: { [key: string]: number | null } = {}
    codes.forEach((code) => {
      const arr = dataCache[code] || []
      if (arr.length > 0) {
        const rateValue = getRateValue(arr[arr.length - 1], rateType)
        values[code] = rateValue != null ? parseNum(rateValue) : null
      } else {
        values[code] = null
      }
    })
    setLastValues((prev) => ({ ...prev, ...values }))
  }

  const loadManifest = async () => {
    try {
      const r = await fetch(manifestPath)
      const currencies = await r.json()
      setManifest(currencies)
      await ensureData(currencies)
      updateAllLastValues(currencies)
      const defaultSelected = ['GBP']
      setSelected(defaultSelected)
    } catch (e) {
      console.error('Failed to load manifest:', e)
      const fallback = ['USD', 'GBP']
      setManifest(fallback)
      await ensureData(fallback)
      updateAllLastValues(fallback)
      setSelected(['GBP'])
    }
  }

  useEffect(() => {
    loadManifest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleCode = async (code: string) => {
    if (selected.includes(code)) {
      setSelected(selected.filter((c) => c !== code))
    } else {
      setSelected([...selected, code])
      await ensureData([code])
    }
    updateAllLastValues(manifest)
  }

  const exportCSV = () => {
    // Include all currencies from manifest that have data
    const allCurrenciesWithData = manifest.filter((code) => {
      const arr = dataCache[code] || []
      return arr.length > 0
    })

    if (allCurrenciesWithData.length === 0) {
      alert('No data to export')
      return
    }

    const getRange = (arr: RateData[], days: number, view: string, type: RateType): RateData[] => {
      if (!arr) return []
      if (view === 'monthly') {
        const map: { [key: string]: number[] } = {}
        arr.forEach((it) => {
          const m = it.date.slice(0, 7)
          if (!map[m]) map[m] = []
          const rateValue = getRateValue(it, type)
          if (rateValue != null) {
            map[m].push(parseNum(rateValue))
          }
        })
        const out = Object.keys(map)
          .sort()
          .map((k) => {
            const v = map[k]
            const avg = v.reduce((a, b) => a + b, 0) / v.length
            return { date: k + '-01', [type]: avg } as RateData
          })
        return out.slice(-days)
      } else {
        return arr.slice(-days)
      }
    }

    const labelsSet = new Set<string>()
    allCurrenciesWithData.forEach((code) => {
      const arr = getRange(dataCache[code] || [], days, view, rateType)
      arr.forEach((r) => labelsSet.add(r.date))
    })
    const labels = Array.from(labelsSet).sort()

    const rows: (string | number)[][] = [['date', ...allCurrenciesWithData]]
    labels.forEach((label) => {
      const row: (string | number)[] = [label]
      allCurrenciesWithData.forEach((code) => {
        const arr = getRange(dataCache[code] || [], days, view, rateType)
        const map = new Map(arr.map((x) => {
          const rateValue = getRateValue(x, rateType)
          return [x.date, rateValue != null ? parseNum(rateValue) : null]
        }))
        row.push(map.has(label) ? map.get(label)! : '')
      })
      rows.push(row)
    })

    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rates_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (manifest.length > 0) {
      ensureData(manifest)
      updateAllLastValues(manifest)
    }
  }, [manifest])

  useEffect(() => {
    if (selected.length > 0) {
      updateAllLastValues(manifest)
    }
  }, [dataCache, selected, rateType])

  return (
    <div className="app">
      <div className="top">
        <div className="brand">
          <div className="logo">
            <img src="/img/sampath-logo.png" alt="Sampath Bank" className="logoImage" />
          </div>
          <div>
            <div className="title">Exchange Rate Dashboard</div>
          </div>
        </div>

        <div className="controls">
          <div className="controlGroup">
            <label className="small" htmlFor="viewSelect">
              View
            </label>
            <select
              id="viewSelect"
              className="input"
              value={rangePreset}
              onChange={(e) => setRangePreset(e.target.value)}
            >
              {RANGE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="controlGroup">
            <label className="small" htmlFor="rateTypeSelect">
              Rate Type
            </label>
            <select
              id="rateTypeSelect"
              className="input"
              value={rateType}
              onChange={(e) => setRateType(e.target.value as RateType)}
            >
              <option value="TTBUY">T/T Buying</option>
              <option value="ODBUY">O/D Buying</option>
              <option value="TTSEL">T/T Selling</option>
            </select>
          </div>
          <button className="btn" onClick={() => setIsCalculatorOpen(true)}>
            Rate Calculator
          </button>
          <button className="btn" onClick={exportCSV}>
            Export CSV
          </button>
          <ThemeToggle />
        </div>
      </div>

      <div className="grid">
        <div className="side">
          <CurrencyList currencies={manifest} selected={selected} onToggle={toggleCode} lastValues={lastValues} rateType={rateType} />

          <div className="legend">
            <div className="legendTitle">Legend</div>
            <div className="legendText">↑ increasing · ↓ decreasing · → unchanged</div>
          </div>
        </div>

        <div className="main">
          <div className="mainContent">
            <ExchangeChart selected={selected} data={dataCache} days={days} view={view} rateType={rateType} />
            <StatsCards selected={selected} data={dataCache} days={days} view={view} rateType={rateType} />
          </div>

          <div className="footer">
            <div>Developed by Chavindu Nuwanpriya © {new Date().getFullYear()}</div>
            <div className="small">
              Data source:{' '}
              <a
                className="link"
                href="https://www.sampath.lk/rates-and-charges?activeTab=exchange-rates"
                target="_blank"
                rel="noopener"
              >
                sampath.lk
              </a>
            </div>
          </div>
        </div>
      </div>

      <RateCalculator
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        currencies={manifest}
        lastValues={lastValues}
        rateType={rateType}
        dataCache={dataCache}
      />
    </div>
  )
}

